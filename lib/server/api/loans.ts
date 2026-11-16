import { randomBytes } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import type { Loan, LoanReturn } from "@/lib/types";
import { query, withTransaction } from "@/lib/server/db";
import { fineFor } from "./fine";
import { ApiError, isoDate, positiveInt, text } from "./http";

export { listTools, updateTool, deleteTool } from "./tools";

type Row<T> = T & QueryResultRow;
type Actor = { id: number; name: string };
const LOAN_SELECT = `SELECT l.id, l.code, l.borrower_id AS "borrowerId", u.name AS borrower,
  l.tool_id AS "toolId", t.name AS tool, l.qty,
  to_char(l.borrow_date, 'YYYY-MM-DD') AS "borrowDate", to_char(l.due_date, 'YYYY-MM-DD') AS "dueDate",
  l.status, l.purpose, l.note,
  to_char(l.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
  FROM loans l JOIN users u ON u.id = l.borrower_id JOIN tools t ON t.id = l.tool_id`;

function recordActivity(client: PoolClient, actor: Actor, action: string, target: string) {
  return client.query("INSERT INTO activity_logs (actor_id, actor_name, action, target) VALUES ($1, $2, $3, $4)", [actor.id, actor.name, action, target]);
}

export async function listLoans(borrowerId?: number): Promise<Loan[]> {
  const { rows } = await query<Row<Loan>>(`${LOAN_SELECT} WHERE ($1::integer IS NULL OR l.borrower_id = $1) ORDER BY l.created_at DESC, l.id DESC`, [borrowerId ?? null]);
  return rows;
}

/** Pending requests reserve no stock; stock decreases atomically only when approved. */
export async function createLoan(actor: Actor, input: Record<string, unknown>): Promise<Loan> {
  const toolId = positiveInt(input.toolId, "toolId");
  const qty = positiveInt(input.qty, "qty");
  const borrowDate = isoDate(input.borrowDate, "borrowDate");
  const dueDate = isoDate(input.dueDate, "dueDate");
  const purpose = text(input.purpose, "purpose", 500)!;
  const note = text(input.note, "note", 2000, true);
  if (dueDate < borrowDate) throw new ApiError(400, "INVALID_DATE_RANGE", "dueDate must not precede borrowDate.");
  const code = `PJ-${randomBytes(6).toString("hex").toUpperCase()}`;

  return withTransaction(async (client) => {
    const tool = await client.query<Row<{ available: number; active: boolean }>>("SELECT available, active FROM tools WHERE id = $1", [toolId]);
    const row = tool.rows[0];
    if (!row || !row.active) throw new ApiError(404, "TOOL_NOT_FOUND", "Tool not found or inactive.");
    if (row.available < qty) throw new ApiError(409, "INSUFFICIENT_STOCK", "Requested quantity exceeds available stock.");
    const inserted = await client.query<Row<{ id: number }>>(
      `INSERT INTO loans (code, borrower_id, tool_id, qty, borrow_date, due_date, purpose, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [code, actor.id, toolId, qty, borrowDate, dueDate, purpose, note]);
    await recordActivity(client, actor, "Mengajukan peminjaman", code);
    const { rows } = await client.query<Row<Loan>>(`${LOAN_SELECT} WHERE l.id = $1`, [inserted.rows[0].id]);
    return rows[0];
  });
}

/** Stock deducted at approval, restored on confirmed return. */
export async function decideLoan(actor: Actor, idInput: string, input: Record<string, unknown>): Promise<{ id: number; code: string; status: "approved" | "rejected" }> {
  const id = positiveInt(idInput, "id");
  if (input.status !== "approved" && input.status !== "rejected") throw new ApiError(400, "INVALID_STATUS", "status must be 'approved' or 'rejected'.");
  const status = input.status;
  const note = text(input.note, "note", 2000, true);
  return withTransaction(async (client) => {
    const result = await client.query<Row<{ id: number; code: string; tool_id: number; qty: number; status: string }>>(
      "SELECT id, code, tool_id, qty, status FROM loans WHERE id = $1 FOR UPDATE", [id]);
    const loan = result.rows[0];
    if (!loan) throw new ApiError(404, "LOAN_NOT_FOUND", "Loan not found.");
    if (loan.status !== "pending") throw new ApiError(409, "INVALID_TRANSITION", "Only pending loans can be approved or rejected.");
    if (status === "approved") {
      const updated = await client.query("UPDATE tools SET available = available - $1 WHERE id = $2 AND active = true AND available >= $1", [loan.qty, loan.tool_id]);
      if (!updated.rowCount) throw new ApiError(409, "INSUFFICIENT_STOCK", "Tool no longer has enough available stock.");
    }
    await client.query("UPDATE loans SET status = $1, note = COALESCE($2, note), decided_by = $3, decided_at = now() WHERE id = $4", [status, note, actor.id, id]);
    await recordActivity(client, actor, status === "approved" ? "Menyetujui peminjaman" : "Menolak peminjaman", loan.code);
    return { id, code: loan.code, status };
  });
}

export async function returnLoan(actor: Actor, idInput: string, input: Record<string, unknown>): Promise<LoanReturn> {
  const id = positiveInt(idInput, "id");
  const returnedAt = input.returnedAt == null ? new Date().toISOString().slice(0, 10) : isoDate(input.returnedAt, "returnedAt");
  const condition = text(input.condition, "condition", 120)!;
  const note = text(input.note, "note", 2000, true);
  return withTransaction(async (client) => {
    const result = await client.query<Row<{ id: number; code: string; tool_id: number; qty: number; due_date: string; status: string }>>(
      "SELECT id, code, tool_id, qty, to_char(due_date, 'YYYY-MM-DD') AS due_date, status FROM loans WHERE id = $1 FOR UPDATE", [id]);
    const loan = result.rows[0];
    if (!loan) throw new ApiError(404, "LOAN_NOT_FOUND", "Loan not found.");
    if (!["approved", "borrowed", "late"].includes(loan.status)) throw new ApiError(409, "INVALID_TRANSITION", "Only approved or active loans can be returned.");
    const fine = fineFor(returnedAt, loan.due_date);
    await client.query("INSERT INTO loan_returns (loan_id, returned_at, condition, note, fine, recorded_by) VALUES ($1, $2, $3, $4, $5, $6)", [id, returnedAt, condition, note, fine, actor.id]);
    await client.query("UPDATE loans SET status = 'returned' WHERE id = $1", [id]);
    await client.query("UPDATE tools SET available = available + $1 WHERE id = $2", [loan.qty, loan.tool_id]);
    await recordActivity(client, actor, "Mengonfirmasi pengembalian", loan.code);
    return { loanId: id, returnedAt, condition, fine, note };
  });
}
