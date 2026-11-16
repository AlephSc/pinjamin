import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const db = new PGlite();
let passed = 0;
const gaps = [];

async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function rejected(name, sql) {
  await assert.rejects(db.query(sql), `${name}: expected constraint rejection`);
  passed++;
  console.log(`PASS ${name}`);
}
const loanSql = (code, borrower, tool, qty, borrow, due, status) =>
  `INSERT INTO loans(code,borrower_id,tool_id,qty,borrow_date,due_date,${status ? "status," : ""}purpose)
   VALUES ('${code}',${borrower},${tool},${qty},'${borrow}','${due}',${status ? `'${status}',` : ""}'x')`;

try {
  const rawSchema = await readFile(path.join(root, "db/schema.sql"), "utf8");
  await check("schema.sql starts with PostgreSQL comment syntax", async () => {
    assert.match(rawSchema, /^--/);
    const rawDb = new PGlite();
    try { await rawDb.exec(rawSchema); } finally { await rawDb.close(); }
  });
  await db.exec(rawSchema);
  await db.exec(`
    INSERT INTO categories(name) VALUES ('QA');
    INSERT INTO users(name,email,password_hash,role) VALUES
      ('Borrower','borrower@test.invalid','x','peminjam'),
      ('Staff','staff@test.invalid','x','petugas'),
      ('Inactive','inactive@test.invalid','x','peminjam');
    UPDATE users SET active = false WHERE email = 'inactive@test.invalid';
    INSERT INTO tools(code,name,category_id,stock,available) VALUES ('QA-1','Test tool',1,2,1);
  `);

  // --- request validation that the schema does enforce ---
  await check("accepts valid pending request", async () => {
    await db.query(loanSql("OK-1", 1, 1, 1, "2026-06-16", "2026-06-18"));
    const { rows } = await db.query("SELECT status FROM loans WHERE code='OK-1'");
    assert.equal(rows[0].status, "pending");
  });
  await rejected("rejects qty 0", loanSql("BAD-Q", 1, 1, 0, "2026-06-16", "2026-06-18"));
  await rejected("rejects qty -3", loanSql("BAD-Q2", 1, 1, -3, "2026-06-16", "2026-06-18"));
  await rejected("rejects due_date before borrow_date", loanSql("BAD-D", 1, 1, 1, "2026-06-18", "2026-06-16"));
  await rejected("rejects unknown status", loanSql("BAD-S", 1, 1, 1, "2026-06-16", "2026-06-18", "hacked"));
  await rejected("rejects negative tool stock", `INSERT INTO tools(code,name,category_id,stock,available) VALUES ('BAD-T','x',1,-1,0)`);
  await rejected("rejects available > stock", `INSERT INTO tools(code,name,category_id,stock,available) VALUES ('BAD-T2','x',1,1,2)`);
  await rejected("rejects negative fine", `INSERT INTO loan_returns(loan_id,returned_at,condition,fine) VALUES (1,'2026-06-19','Baik',-1)`);
  await rejected("rejects duplicate return for one loan", `INSERT INTO loan_returns(loan_id,returned_at,condition) VALUES (1,'2026-06-19','Baik'),(1,'2026-06-20','Baik')`);

  // --- schema gaps (recorded, not enforced) ---
  await check("GAP documented: schema allows qty beyond available stock", async () => {
    await db.query(loanSql("GAP-STOCK", 1, 1, 99, "2026-06-16", "2026-06-18"));
    const { rows } = await db.query("SELECT count(*)::int AS n FROM loans WHERE code='GAP-STOCK'");
    assert.equal(rows[0].n, 1);
    gaps.push("loans has no constraint/logic tying qty to tools.available at request or approval time (qty 99 accepted with available=1)");
  });
  await check("GAP documented: inactive user and petugas can be borrower", async () => {
    await db.query(loanSql("GAP-ROLE", 2, 1, 1, "2026-06-16", "2026-06-18"));
    await db.query(loanSql("GAP-ROLE2", 3, 1, 1, "2026-06-16", "2026-06-18"));
    const { rows } = await db.query("SELECT count(*)::int AS n FROM loans WHERE code LIKE 'GAP-ROLE%'");
    assert.equal(rows[0].n, 2);
    gaps.push("no borrower-role or users.active enforcement on loans.borrower_id; inactive users can hold loans");
  });
  await check("GAP documented: schema cannot enforce available stock decrement", async () => {
    const { rows } = await db.query("SELECT available FROM tools WHERE code='QA-1'");
    assert.equal(rows[0].available, 1);
    await db.query("UPDATE loans SET status='approved' WHERE code='OK-1'");
    const after = await db.query("SELECT available FROM tools WHERE code='QA-1'");
    assert.equal(after.rows[0].available, 1);
    gaps.push("approval changes loans.status only; no trigger/transaction decrements tools.available, so stock drift is unreserved in SQL");
  });
  await check("GAP documented: fine is free-form integer, not derived", async () => {
    await db.query("INSERT INTO loan_returns(loan_id,returned_at,condition,fine) VALUES (1,'2026-06-19','Baik',0)");
    const { rows } = await db.query("SELECT fine FROM loan_returns WHERE loan_id=1");
    assert.equal(rows[0].fine, 0); // one day late, should be 2000
    gaps.push("loan_returns.fine accepts any >=0 value with no check against due_date (1 day late recorded as 0)");
  });

  // --- real computed values from the shipped store helpers ---
  const source = await readFile(path.join(root, "lib/store.tsx"), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  const temp = path.join(here, ".store-qa-temp.cjs");
  try {
    await writeFile(temp, js);
    const store = require(temp);
    await check("daysBetween: same-day return yields 0 late days", () =>
      assert.equal(store.daysBetween("2026-06-18", "2026-06-18"), 0));
    await check("daysBetween: returns before due date clamp to 0, never negative", () =>
      assert.equal(store.daysBetween("2026-06-20", "2026-06-18"), 0));
    await check("fine: 1 day late = Rp2,000", () =>
      assert.equal(store.daysBetween("2026-06-18", "2026-06-19") * store.FINE_PER_DAY, 2000));
    await check("fine: 3 days late = Rp6,000", () =>
      assert.equal(store.daysBetween("2026-06-18", "2026-06-21") * store.FINE_PER_DAY, 6000));
  } finally {
    await unlink(temp).catch(() => {});
  }

  // --- store behaviour owed to state guards (static characterization) ---
  const decideFn = source.slice(source.indexOf("decide: (id"), source.indexOf("returnLoan: (id"));
  const returnFn = source.slice(source.indexOf("returnLoan: (id"), source.indexOf("addTool: (t"));
  await check("store: approval decrements stock by qty, other decisions never touch stock", () => {
    assert.match(decideFn, /status === "approved" \? -loan\.qty : 0/);
  });
  await check("store: decide() has no pending-state guard", () => {
    assert.doesNotMatch(decideFn, /loan\.status\s*(?:!==|===)\s*["']pending/);
    gaps.push("decide() accepts any status on any loan: double approve re-decrements stock (clamped at 0), reject after approve leaves stock short");
  });
  await check("store: decide() clamp hides over-draw", () => {
    assert.match(decideFn, /Math\.max\(0, Math\.min\(t\.stock, t\.available \+ delta\)\)/);
    gaps.push("stock clamp Math.max(0, …) silently swallows over-draw instead of failing the approval; store cannot detect insufficient stock");
  });
  await check("store: returnLoan() has no returned-state guard", () => {
    assert.doesNotMatch(returnFn, /loan\.status\s*(?:!==|===)\s*["']returned/);
    gaps.push("returnLoan() can be replayed: stock re-incremented per call (clamped at stock) and fine overwritten; PRD requires rejecting duplicate returns");
  });
  await check("store: returnLoan() reads stale loans from closure", () => {
    assert.match(returnFn, /const loan = loans\.find\(/);
    gaps.push("returnLoan() looks up the loan in the render-closure `loans` array, not the state updater: back-to-back returns in one tick can miss stock restoration");
  });
  await check("store: createLoan() does not validate stock/date or reserve", () => {
    assert.match(source, /createLoan: \(input\) => \{\s*const id = "PJ-" \+ \(143 \+ loans\.length - 6\)/);
    gaps.push("createLoan() trusts caller: no qty>=1, qty<=available, dueDate>=borrowDate checks server-side; id derived from array length collides after deletes/inserts");
  });

  // --- role access ---
  const appFiles = await (async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(full)); else out.push(full);
    }
    return out;
  })(path.join(root, "app"));
  const endpoints = appFiles.filter((f) => /(?:route|middleware|action)\.(?:ts|tsx|js|mjs)$/.test(f));
  await check("role checks are client-side only (no route/middleware handlers yet)", () => {
    assert.equal(endpoints.length, 0);
    gaps.push("zero app/**/route.ts|middleware.ts: every role gate lives in page.tsx (nav roles array + role select). Anyone can switch to admin via UI; no server authorization exists yet");
  });
  await check("role switch exposed unconditionally in demo UI", () => {
    assert.match(source, /useState<Role>\("admin"\)/);
    gaps.push("store defaults role to admin; page.tsx renders a role <select> for all users. Acceptable for demo, must be removed before any deploy handling real data");
  });

  console.log(`\n${passed} checks passed, ${gaps.length} gaps recorded`);
} finally {
  await db.close();
}
