import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const migration = await readFile(new URL("../db/migrations/20261123_google_login.sql", import.meta.url), "utf8");
try {
  await db.exec(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await db.exec("INSERT INTO users(name,email,password_hash,provider,role) VALUES ('Password User','password@test.invalid','x','password','peminjam'); INSERT INTO users(name,email,password_hash,provider,role) VALUES ('Google User','google@test.invalid',NULL,'google','petugas');");
  await db.exec(migration);
  await db.exec(migration);

  const { rows: users } = await db.query("SELECT provider,google_id,email_verified,password_hash FROM users ORDER BY id");
  assert.equal(users[0].provider, "password");
  assert.equal(users[1].provider, "google");
  assert.equal(users[1].password_hash, null);
  assert.equal(users[1].google_id, null);
  assert.equal(users[1].email_verified, true);

  const { rows: columns } = await db.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name IN ('password_hash','provider','google_id','email_verified') ORDER BY column_name");
  assert.deepEqual(columns.map((row) => [row.column_name, row.is_nullable]), [
    ["email_verified", "NO"],
    ["google_id", "YES"],
    ["password_hash", "YES"],
    ["provider", "NO"],
  ]);
  await db.query("INSERT INTO users(name,email,role,password_hash,provider,google_id,email_verified) VALUES ('Linked','linked@test.invalid','peminjam',NULL,'google','google-sub',true)");
  const { rows: linked } = await db.query("SELECT provider,google_id FROM users WHERE email='linked@test.invalid'");
  assert.deepEqual(linked[0], { provider: "google", google_id: "google-sub" });
  console.log("PASS google login migration: idempotent schema, provider backfill, nullable password");
} finally {
  await db.close();
}
