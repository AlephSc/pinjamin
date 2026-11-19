import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const migration = await readFile(new URL("../db/migrations/20261118_return_audit.sql", import.meta.url), "utf8");
try {
  await db.exec(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await db.exec("INSERT INTO categories(name) VALUES ('QA'); INSERT INTO users(name,email,password_hash,role) VALUES ('Borrower','borrower@test.invalid','x','peminjam'); INSERT INTO tools(code,name,category_id,stock,available) VALUES ('QA-1','Tool',1,1,0); INSERT INTO loans(code,borrower_id,tool_id,qty,borrow_date,due_date,status,purpose,return_requested_at) VALUES ('QA-L1',1,1,1,'2026-06-16','2026-06-18','borrowed', 'test', now()); INSERT INTO loan_returns(loan_id,returned_at,condition,note,fine) VALUES (1,'2026-06-19','Baik','request note',2000);");
  await db.exec(migration);
  await db.exec(migration);
  const { rows } = await db.query("SELECT request_returned_at, request_condition, request_note FROM loan_returns WHERE loan_id=1");
  assert.equal(new Date(rows[0].request_returned_at).toISOString().slice(0, 10), "2026-06-19");
  assert.equal(rows[0].request_condition, "Baik");
  assert.equal(rows[0].request_note, "request note");
  console.log("PASS return audit migration applies twice and backfills pending return");
} finally {
  await db.close();
}
