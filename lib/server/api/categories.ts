import type { QueryResultRow } from "pg";
import type { Category } from "@/lib/types";
import { query, withTransaction } from "@/lib/server/db";
import { ApiError, text, positiveInt } from "./http";

type Row<T> = T & QueryResultRow;
type Actor = { id: number; name: string };
const CATEGORY_SELECT = `SELECT c.id,c.name,c.is_default AS "isDefault",count(t.id)::int AS kinds,coalesce(sum(t.available),0)::int AS available FROM categories c LEFT JOIN tools t ON t.category_id=c.id AND t.active GROUP BY c.id,c.name,c.is_default`;

export async function listCategories(): Promise<Category[]> {
  const { rows } = await query<Row<Category>>(`${CATEGORY_SELECT} ORDER BY c.name`);
  return rows;
}

export async function createCategory(actor: Actor, input: Record<string, unknown>): Promise<Category> {
  const name = text(input.name, "name", 80)!;
  return withTransaction(async (client) => {
    try {
      const result = await client.query<Row<{ id: number }>>("INSERT INTO categories(name) VALUES($1) RETURNING id", [name]);
      await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)", [actor.id, actor.name, "Menambahkan kategori", name]);
      return (await client.query<Row<Category>>(`${CATEGORY_SELECT} HAVING c.id=$1`, [result.rows[0].id])).rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "CATEGORY_EXISTS", "Kategori sudah terdaftar.");
      throw error;
    }
  });
}

export async function deleteCategory(actor: Actor, idInput: string) {
  const id = positiveInt(idInput, "id");
  return withTransaction(async (client) => {
    const result = await client.query<Row<{ name: string; is_default: boolean }>>(
      "SELECT name,is_default FROM categories WHERE id=$1 FOR UPDATE", [id]);
    const category = result.rows[0];
    if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan.");
    if (category.is_default) throw new ApiError(409, "DEFAULT_CATEGORY", "Kategori Umum wajib tersedia dan tidak dapat dihapus.");
    const fallback = await client.query<Row<{ id: number }>>(
      "SELECT id FROM categories WHERE is_default=true LIMIT 1 FOR UPDATE");
    const general = fallback.rows[0];
    if (!general) throw new ApiError(500, "DEFAULT_CATEGORY_MISSING", "Kategori Umum tidak tersedia; hubungi administrator.");
    const moved = await client.query("UPDATE tools SET category_id=$1 WHERE category_id=$2", [general.id, id]);
    await client.query("DELETE FROM categories WHERE id=$1", [id]);
    await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)",
      [actor.id, actor.name, "Menghapus kategori dan memindahkan alat ke Umum", `${category.name} (${moved.rowCount ?? 0} alat)`]);
    return { id, deleted: true as const, moved: moved.rowCount ?? 0 };
  });
}
