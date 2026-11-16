import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const db = new PGlite();
let passed = 0;
const gaps = [];
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function rejects(name, promise) {
  await assert.rejects(promise);
  passed++;
  console.log(`PASS ${name}`);
}
const loanSql = (code, borrower, tool, qty, borrow, due, status) =>
  `INSERT INTO loans(code,borrower_id,tool_id,qty,borrow_date,due_date,${status ? "status," : ""}purpose)
   VALUES ('${code}',${borrower},${tool},${qty},'${borrow}','${due}',${status ? `'${status}',` : ""}'x')`;
async function loadTs(file, temp) {
  const source = await readFile(path.join(root, file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  await writeFile(temp, js);
  return require(temp);
}

try {
  const schema = await readFile(path.join(root, "db/schema.sql"), "utf8");
  await check("PostgreSQL schema header and load", async () => {
    assert.match(schema, /^--/);
    await db.exec(schema);
  });
  await db.exec(`
    INSERT INTO categories(name) VALUES ('QA');
    INSERT INTO users(name,email,password_hash,role) VALUES
      ('Borrower','borrower@test.invalid','x','peminjam'),
      ('Staff','staff@test.invalid','x','petugas'),
      ('Inactive','inactive@test.invalid','x','peminjam');
    UPDATE users SET active=false WHERE email='inactive@test.invalid';
    INSERT INTO tools(code,name,category_id,stock,available) VALUES ('QA-1','Tool',1,2,1);
    ${loanSql("OK",1,1,1,"2026-06-16","2026-06-18")};
  `);
  const q = (code, borrower=1, qty=1, borrow="2026-06-16", due="2026-06-18", status) => loanSql(code,borrower,1,qty,borrow,due,status);
  await rejects("rejects qty 0", db.query(q("BAD0",1,0)));
  await rejects("rejects negative qty", db.query(q("BADN",1,-1)));
  await rejects("rejects due date before borrow date", db.query(q("BADD",1,1,"2026-06-18","2026-06-16")));
  await rejects("rejects unknown status", db.query(q("BADS",1,1,"2026-06-16","2026-06-18","forged")));
  await rejects("rejects available above total stock", db.query("INSERT INTO tools(code,name,category_id,stock,available) VALUES ('BADT','x',1,1,2)"));
  await rejects("rejects negative fine", db.query("INSERT INTO loan_returns(loan_id,returned_at,condition,fine) VALUES (1,'2026-06-19','Baik',-1)"));

  await check("GAP: database accepts qty greater than available stock", async () => {
    await db.query(q("GAPSTOCK",1,99));
    const { rows } = await db.query("SELECT qty FROM loans WHERE code='GAPSTOCK'");
    assert.equal(rows[0].qty,99);
    gaps.push("[HIGH][db/backend] Loan qty is not checked against available stock. Approval must use transaction + guarded `UPDATE tools SET available=available-qty WHERE available>=qty`; return conflict if no row updates.");
  });
  await check("GAP: staff and inactive accounts may be loan borrowers", async () => {
    await db.query(q("GAPSTAFF",2));
    await db.query(q("GAPINACTIVE",3));
    const { rows } = await db.query("SELECT count(*)::int AS n FROM loans WHERE code IN ('GAPSTAFF','GAPINACTIVE')");
    assert.equal(rows[0].n,2);
    gaps.push("[HIGH][backend/db] borrower FK enforces only existence. API must derive borrower from authenticated active `peminjam` session, not payload; DB trigger/constraint optional for direct-writer defense.");
  });
  await check("GAP: approval status update does not decrement stock", async () => {
    await db.query("UPDATE loans SET status='approved' WHERE code='OK'");
    const { rows } = await db.query("SELECT available FROM tools WHERE code='QA-1'");
    assert.equal(rows[0].available,1);
    gaps.push("[HIGH][backend/db] Schema has no transition/inventory trigger; status-only approval leaves stock unchanged. API must lock loan, allow pending-only transition, decrement availability atomically, log in same transaction.");
  });
  await check("GAP: database accepts incorrect nonnegative fine", async () => {
    await db.query("INSERT INTO loan_returns(loan_id,returned_at,condition,fine) VALUES (1,'2026-06-19','Baik',0)");
    const { rows } = await db.query("SELECT fine FROM loan_returns WHERE loan_id=1");
    assert.equal(rows[0].fine,0);
    gaps.push("[MEDIUM][db/backend] Schema accepts fine=0 for a return one day late. Server derives `max(0, returned_at-due_date)*2000`; do not trust caller's fine.");
  });

  const fineTemp = path.join(path.dirname(fileURLToPath(import.meta.url)), ".fine-qa-temp.cjs");
  try {
    const { fineFor } = await loadTs("lib/server/api/fine.ts", fineTemp);
    await check("fine: same-day return = 0", () => assert.equal(fineFor("2026-06-18","2026-06-18"),0));
    await check("fine: early return = 0", () => assert.equal(fineFor("2026-06-17","2026-06-18"),0));
    await check("fine: one late day = Rp2,000", () => assert.equal(fineFor("2026-06-19","2026-06-18"),2000));
    await check("fine: three late days = Rp6,000", () => assert.equal(fineFor("2026-06-21","2026-06-18"),6000));
  } finally { await unlink(fineTemp).catch(() => {}); }

  const httpTemp = path.join(path.dirname(fileURLToPath(import.meta.url)), ".http-qa-temp.cjs");
  try {
    const { requireRole } = await loadTs("lib/server/api/http.ts", httpTemp);
    await rejects("authorization fails closed without configured session", requireRole("peminjam"));
    gaps.push("[CRITICAL][backend] API auth seam currently returns 401 for every role because no session resolver is configured. Keep fail-closed; wire real verified server session before enabling API.");
  } finally { await unlink(httpTemp).catch(() => {}); }

  gaps.push("[HIGH][backend] Lifecycle handlers must reject duplicate/non-pending decisions, duplicate returns, inactive tools, bad date ranges; update stock, loan, return row, and activity log atomically.");
  gaps.push("[HIGH][frontend/backend] Demo role switching is not access control. Remove switch for production; enforce role and borrower ownership on every server endpoint (including tools/list/summary as policy requires).");
  console.log(`\\n${passed} checks passed; ${gaps.length} known gaps`);
  for (const gap of gaps) console.log(`GAP ${gap}`);
} finally { await db.close(); }
