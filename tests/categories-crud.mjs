import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const db = new PGlite();
const temp = path.join(dir, ".categories-qa-temp.cjs");
const dbAdapter = path.join(dir, ".categories-db-temp.cjs");
const httpAdapter = path.join(dir, ".categories-http-temp.cjs");
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function rejects(name, promise, code) { await assert.rejects(promise, (error) => !code || error.code === code); passed++; console.log(`PASS ${name}`); }
try {
  await db.exec(await readFile(path.join(root, "db/schema.sql"), "utf8"));
  await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('QA Admin','qa-admin@test.invalid','x','admin')");
  globalThis.__categoryQaQuery = (...args) => db.query(...args);
  globalThis.__categoryQaTransaction = async (work) => { await db.exec("BEGIN"); try { const result = await work({ query: (...args) => db.query(...args) }); await db.exec("COMMIT"); return result; } catch (error) { await db.exec("ROLLBACK"); throw error; } };
  await writeFile(dbAdapter, "exports.query = (...args) => globalThis.__categoryQaQuery(...args); exports.withTransaction = (fn) => globalThis.__categoryQaTransaction(fn);");
  await writeFile(httpAdapter, "exports.ApiError = class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }; exports.text = (value, name, max) => { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw Object.assign(new Error('invalid'), {code:'INVALID_INPUT'}); return value.trim(); }; exports.positiveInt = (value, name) => { const n = Number(value); if (!Number.isSafeInteger(n) || n <= 0) throw Object.assign(new Error('invalid'), {code:'INVALID_INPUT'}); return n; };");
  const source = (await readFile(path.join(root, "lib/server/api/categories.ts"), "utf8")).replace('@/lib/server/db', './.categories-db-temp.cjs').replace('./http', './.categories-http-temp.cjs');
  await writeFile(temp, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
  const { createCategory, deleteCategory, listCategories } = require(temp);
  const actor = { id: 1, name: "QA Admin" };
  await check("create category returns aggregate and activity log", async () => { const result = await createCategory(actor, { name: "Kamera" }); assert.equal(result.name, "Kamera"); assert.equal(result.kinds, 0); const log = await db.query("SELECT action FROM activity_logs WHERE target='Kamera'"); assert.equal(log.rows[0].action, "Menambahkan kategori"); });
  await rejects("duplicate category name conflicts", createCategory(actor, { name: "Kamera" }), "CATEGORY_EXISTS");
  await check("list categories returns category", async () => assert.deepEqual((await listCategories()).map((item) => item.name), ["Kamera"]));
  await check("delete unused category logs activity", async () => { assert.equal((await deleteCategory(actor, "1")).deleted, true); const log = await db.query("SELECT action FROM activity_logs WHERE target='Kamera' ORDER BY id DESC LIMIT 1"); assert.equal(log.rows[0].action, "Menghapus kategori"); });
  await check("cannot delete category referenced by inactive tool", async () => { await db.query("INSERT INTO categories(name) VALUES('Alat tulis')"); const category = await db.query("SELECT id FROM categories WHERE name='Alat tulis'"); await db.query("INSERT INTO tools(code,name,category_id,stock,available,active) VALUES('QA-1','Pensil',$1,1,1,false)", [category.rows[0].id]); await rejects("referenced category is retained", deleteCategory(actor, String(category.rows[0].id)), "CATEGORY_IN_USE"); });
  await rejects("missing category returns not found", deleteCategory(actor, "999"), "CATEGORY_NOT_FOUND");
  console.log(`\n${passed} category checks passed`);
} finally { await db.close(); for (const file of [temp, dbAdapter, httpAdapter]) await unlink(file).catch(() => {}); }
