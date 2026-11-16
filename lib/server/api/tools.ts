import type { QueryResultRow } from "pg";
import type { Tool } from "@/lib/types";
import { query, withTransaction } from "@/lib/server/db";
import { ApiError, positiveInt, text } from "./http";

type Row<T> = T & QueryResultRow;
type Actor = { id: number; name: string };

const TOOL_SELECT = `SELECT t.id, t.code, t.name, t.category_id AS "categoryId", c.name AS category,
  t.stock, t.available, t.condition, t.active
  FROM tools t JOIN categories c ON c.id = t.category_id`;

export async function listTools(): Promise<Tool[]> {
  const { rows } = await query<Row<Tool>>(`${TOOL_SELECT} WHERE t.active = true ORDER BY t.name, t.id`);
  return rows;
}

export async function updateTool(actor: Actor, idInput: string, input: Record<string, unknown>): Promise<Tool> {
  const id = positiveInt(idInput, "id");
  const name = input.name !== undefined ? text(input.name, "name", 120)! : undefined;
  const categoryId = input.categoryId !== undefined ? positiveInt(input.categoryId, "categoryId") : undefined;
  const stock = input.stock !== undefined ? positiveInt(input.stock, "stock") : undefined;
  const condition = input.condition !== undefined ? text(input.condition, "condition", 50)! : undefined;

  if (name === undefined && categoryId === undefined && stock === undefined && condition === undefined) {
    throw new ApiError(400, "INVALID_INPUT", "At least one field (name, categoryId, stock, condition) must be provided.");
  }

  return withTransaction(async (client) => {
    const existingRes = await client.query<Row<{ id: number; code: string; stock: number; available: number; active: boolean }>>(
      "SELECT id, code, stock, available, active FROM tools WHERE id = $1 FOR UPDATE",
      [id]
    );
    const existing = existingRes.rows[0];
    if (!existing || !existing.active) {
      throw new ApiError(404, "TOOL_NOT_FOUND", "Tool not found or inactive.");
    }

    if (categoryId !== undefined) {
      const catCheck = await client.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
      if (!catCheck.rowCount) {
        throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found.");
      }
    }

    let newAvailable = existing.available;
    if (stock !== undefined) {
      const borrowed = existing.stock - existing.available;
      if (stock < borrowed) {
        throw new ApiError(409, "INVALID_STOCK", `New stock (${stock}) cannot be lower than currently borrowed units (${borrowed}).`);
      }
      newAvailable = stock - borrowed;
    }

    await client.query(
      `UPDATE tools
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           stock = COALESCE($3, stock),
           available = COALESCE($4, available),
           condition = COALESCE($5, condition)
       WHERE id = $6`,
      [name ?? null, categoryId ?? null, stock ?? null, stock !== undefined ? newAvailable : null, condition ?? null, id]
    );

    await client.query(
      "INSERT INTO activity_logs (actor_id, actor_name, action, target) VALUES ($1, $2, $3, $4)",
      [actor.id, actor.name, "Mengubah data alat", existing.code]
    );

    const { rows } = await client.query<Row<Tool>>(`${TOOL_SELECT} WHERE t.id = $1`, [id]);
    return rows[0];
  });
}

export async function deleteTool(actor: Actor, idInput: string): Promise<{ id: number; code: string; active: false }> {
  const id = positiveInt(idInput, "id");

  return withTransaction(async (client) => {
    const existingRes = await client.query<Row<{ id: number; code: string; stock: number; available: number; active: boolean }>>(
      "SELECT id, code, stock, available, active FROM tools WHERE id = $1 FOR UPDATE",
      [id]
    );
    const existing = existingRes.rows[0];
    if (!existing || !existing.active) {
      throw new ApiError(404, "TOOL_NOT_FOUND", "Tool not found or already inactive.");
    }

    // Pastikan tidak ada peminjaman aktif/terlambat sebelum dinonaktifkan
    const activeLoans = await client.query(
      "SELECT count(*)::int AS count FROM loans WHERE tool_id = $1 AND status IN ('pending', 'approved', 'borrowed', 'late')",
      [id]
    );
    if (Number(activeLoans.rows[0]?.count ?? 0) > 0) {
      throw new ApiError(409, "ACTIVE_LOANS_EXIST", "Cannot deactivate tool with pending or active loans.");
    }

    await client.query("UPDATE tools SET active = false WHERE id = $1", [id]);

    await client.query(
      "INSERT INTO activity_logs (actor_id, actor_name, action, target) VALUES ($1, $2, $3, $4)",
      [actor.id, actor.name, "Menonaktifkan alat", existing.code]
    );

    return { id, code: existing.code, active: false };
  });
}
