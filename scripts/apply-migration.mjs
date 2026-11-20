// Apply one SQL migration file to the configured database. Idempotent migrations
// can be re-run safely. Never prints DATABASE_URL or credentials.
//   node scripts/apply-migration.mjs db/migrations/20261120_security_hardening.sql
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const env = await readFile(path.join(root, ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/apply-migration.mjs <path-to-sql>");
const sql = await readFile(path.resolve(root, file), "utf8");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log(`Migration applied: ${file}`);
} finally {
  await client.end();
}
