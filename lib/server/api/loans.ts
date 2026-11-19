import { randomBytes } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import type { Loan, LoanReturn, Role } from "@/lib/types";
import { query, withTransaction } from "@/lib/server/db";
import { isReturnDateValid, fineFor } from "./fine";
import { ApiError, isoDate, positiveInt, text } from "./http";
function dateOnly(value: string | Date): string { return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10); }
export { listTools, updateTool, deleteTool } from "./tools";

type Row<T> = T & QueryResultRow;
type Actor = { id: number; name: string; role?: Role };
const LOAN_SELECT = `SELECT l.id, l.code, l.borrower_id AS "borrowerId", u.name AS borrower,
  l.tool_id AS "toolId", t.name AS tool, l.qty,
  to_char(l.borrow_date, 'YYYY-MM-DD') AS "borrowDate", to_char(l.due_date, 'YYYY-MM-DD') AS "dueDate",
  l.status, l.purpose, l.note,
  (l.return_requested_at IS NOT NULL) AS "returnRequested",
  COALESCE(l.return_request_note, r.request_note) AS "returnRequestNote",
  to_char(COALESCE(l.return_request_date, r.request_returned_at), 'YYYY-MM-DD') AS "returnRequestDate",
  COALESCE(l.return_request_condition, r.request_condition) AS "returnRequestCondition",
  to_char(r.returned_at, 'YYYY-MM-DD') AS "returnedAt",
  r.condition AS "returnCondition", r.note AS "returnNote", r.fine,
  to_char(l.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
  FROM loans l JOIN users u ON u.id = l.borrower_id JOIN tools t ON t.id = l.tool_id
  LEFT JOIN loan_returns r ON r.loan_id = l.id`;

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
    const tool = await client.query<Row<{ available: number; active: boolean }>>("SELECT available, active FROM tools WHERE id = $1 FOR UPDATE", [toolId]);
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
  if (input.intent !== "request" && input.intent !== "confirm") throw new ApiError(400, "INVALID_INTENT", "Aksi pengembalian tidak valid.");
  if (input.intent === "request" && actor.role !== "peminjam") throw new ApiError(403, "FORBIDDEN", "Hanya peminjam yang dapat mengajukan pengembalian.");
  if (input.intent === "confirm" && actor.role !== "admin" && actor.role !== "petugas") throw new ApiError(403, "FORBIDDEN", "Hanya petugas yang dapat mengonfirmasi pengembalian.");
  return withTransaction(async (client) => {
    const result = await client.query<Row<{ id: number; code: string; tool_id: number; qty: number; borrow_date: string | Date; due_date: string | Date; status: string; borrower_id: number; return_requested_at: Date | null; return_request_date: string | Date | null; return_request_condition: string | null; return_request_note: string | null }>>(
      "SELECT id, code, tool_id, qty, borrow_date, due_date, status, borrower_id, return_requested_at, return_request_date, return_request_condition, return_request_note FROM loans WHERE id = $1 FOR UPDATE", [id]);
    const loan = result.rows[0];
    if (!loan) throw new ApiError(404, "LOAN_NOT_FOUND", "Loan not found.");
    if (!isReturnDateValid(returnedAt, loan.borrow_date)) throw new ApiError(400, "INVALID_RETURN_DATE", "Tanggal pengembalian harus antara tanggal pinjam dan hari ini.");
    if (input.intent === "request") {
      if (actor.id !== loan.borrower_id) throw new ApiError(403, "FORBIDDEN", "Peminjam hanya dapat mengajukan pengembalian miliknya.");
      if (!["approved", "borrowed", "late"].includes(loan.status)) throw new ApiError(409, "INVALID_TRANSITION", "Peminjaman ini belum dapat diajukan untuk pengembalian.");
      if (loan.return_requested_at) throw new ApiError(409, "RETURN_ALREADY_REQUESTED", "Permintaan pengembalian sudah menunggu konfirmasi.");
      await client.query("UPDATE loans SET return_requested_at = now(), return_request_date = $1, return_request_condition = $2, return_request_note = $3 WHERE id = $4", [returnedAt, condition, note, id]);
      await recordActivity(client, actor, "Mengajukan pengembalian", loan.code);
      return { loanId: id, returnedAt, condition, fine: 0, note };
    }
    if (input.intent !== "confirm") throw new ApiError(400, "INVALID_INTENT", "Aksi pengembalian tidak valid.");
    if (!["approved", "borrowed", "late"].includes(loan.status)) throw new ApiError(409, "INVALID_TRANSITION", "Only approved or active loans can be returned.");
    if (!loan.return_requested_at) throw new ApiError(409, "RETURN_NOT_REQUESTED", "Belum ada permintaan pengembalian dari peminjam.");
    const requestReturnedAt = loan.return_request_date ? dateOnly(loan.return_request_date) : returnedAt;
    const requestCondition = loan.return_request_condition ?? condition;
    if (loan.return_request_date && !isReturnDateValid(requestReturnedAt, loan.borrow_date)) throw new ApiError(409, "INVALID_REQUESTED_RETURN_DATE", "Tanggal pengajuan pengembalian tidak valid; minta peminjam mengajukan ulang.");
    const fine = fineFor(returnedAt, dateOnly(loan.due_date));
    const tool = await client.query<Row<{ stock: number; available: number }>>("SELECT stock, available FROM tools WHERE id = $1 FOR UPDATE", [loan.tool_id]);
    const inventory = tool.rows[0];
    if (!inventory || inventory.available + loan.qty > inventory.stock) throw new ApiError(409, "STOCK_RESTORE_CONFLICT", "Stok berubah sejak peminjaman; petugas perlu memeriksa inventaris sebelum mengonfirmasi.");
    await client.query("INSERT INTO loan_returns (loan_id, returned_at, condition, note, request_returned_at, request_condition, request_note, fine, recorded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [id, returnedAt, condition, note, requestReturnedAt, requestCondition, loan.return_request_note, fine, actor.id || null]);
    await client.query("UPDATE loans SET status = 'returned', return_requested_at = NULL, return_request_date = NULL, return_request_condition = NULL, return_request_note = NULL WHERE id = $1", [id]);
    await client.query("UPDATE tools SET available = available + $1 WHERE id = $2", [loan.qty, loan.tool_id]);
    await recordActivity(client, actor, "Mengonfirmasi pengembalian", loan.code);
    return { loanId: id, returnedAt, condition, fine, note };
  });
}
