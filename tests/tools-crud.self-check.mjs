import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();

const schema = await readFile(path.join(root, "db/schema.sql"), "utf8");
await db.exec(schema);

await db.exec(`
  INSERT INTO categories (name) VALUES ('Elektronik'), ('Mekanik');
  INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@test.invalid', 'hash', 'admin');
  INSERT INTO tools (code, name, category_id, stock, available, condition) VALUES ('EL-01', 'Multimeter', 1, 10, 10, 'Baik');
`);

// Test update tool stock & condition
await db.query(`
  UPDATE tools
  SET name = 'Multimeter Digital', stock = 12, available = 12, condition = 'Baik'
  WHERE id = 1
`);
const updated = await db.query("SELECT name, stock, available FROM tools WHERE id = 1");
assert.equal(updated.rows[0].name, "Multimeter Digital");
assert.equal(updated.rows[0].stock, 12);
assert.equal(updated.rows[0].available, 12);

// Test soft-delete (active = false)
await db.query("UPDATE tools SET active = false WHERE id = 1");
const softDeleted = await db.query("SELECT active FROM tools WHERE id = 1");
assert.equal(softDeleted.rows[0].active, false);

await db.close();
console.log("PASS tools crud backend self-check");
