// Create one admin account. Password is generated and written to a local
// one-time file (never printed to stdout or committed). Usage:
//   node scripts/create-admin.mjs [email] [name]
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
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

const email = (process.argv[2] || "admin@pinjamin.local").toLowerCase();
const name = process.argv[3] || "Administrator";
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(
    "INSERT INTO users(name,email,password_hash,role,active) VALUES($1,$2,$3,'admin',true) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role='admin', active=true RETURNING id,name,email,role",
    [name, email, hash]
  );
  const user = result.rows[0];
  const outFile = path.join(root, "admin-credentials.local.txt");
  await writeFile(outFile, `Pinjamin admin (one-time local file, do not commit)\nemail: ${user.email}\npassword: ${password}\nrole: ${user.role}\nid: ${user.id}\n`, "utf8");
  console.log(`Admin ready: id=${user.id} email=${user.email} role=${user.role}`);
  console.log(`Password saved to: ${outFile}`);
} finally {
  await client.end();
}
