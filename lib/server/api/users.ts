import type { QueryResultRow } from "pg";
import type { Role, User } from "@/lib/types";
import { withTransaction } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import { ApiError, text } from "./http";
type Row<T> = T & QueryResultRow;
const roles: Role[] = ["admin", "petugas", "peminjam"];
export async function createUser(actor: { id: number; name: string }, input: Record<string, unknown>): Promise<User> {
  const name = text(input.name, "name", 120)!;
  const email = text(input.email, "email", 254)!.toLowerCase();
  const role = input.role;
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "INVALID_EMAIL", "Email tidak valid.");
  if (!roles.includes(role as Role)) throw new ApiError(400, "INVALID_ROLE", "Peran tidak valid.");
  if (password.length < 12 || password.length > 256) throw new ApiError(400, "INVALID_PASSWORD", "Kata sandi harus memiliki 12–256 karakter.");
  return withTransaction(async (client) => {
    try {
      const result = await client.query<Row<User>>("INSERT INTO users(name,email,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,active", [name, email, role, hashPassword(password)]);
      await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)", [actor.id, actor.name, "Menambahkan pengguna", email]);
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "EMAIL_EXISTS", "Email sudah terdaftar.");
      throw error;
    }
  });
}
