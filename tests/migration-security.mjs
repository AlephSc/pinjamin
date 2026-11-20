import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const migration = await readFile(new URL("../db/migrations/20261120_security_hardening.sql", import.meta.url), "utf8");
try {
  await db.exec(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await db.exec("INSERT INTO users(name,email,password_hash,role) VALUES ('QA','qa@test.invalid','x','peminjam');");
  // Migration is idempotent.
  await db.exec(migration);
  await db.exec(migration);
  const { rows: cols } = await db.query("SELECT token_version FROM users WHERE id=1");
  assert.equal(cols[0].token_version, 1, "token_version defaults to 1");
  // Token-bucket consume: first call allowed, exhaust then deny with retry.
  const limit = 3, rate = limit / 60000;
  const consume = () => db.query(
    `INSERT INTO rate_limits (key, tokens, updated_at) VALUES ('k', $1 - 1, now())
     ON CONFLICT (key) DO UPDATE SET
       tokens = GREATEST(0, LEAST($1, rate_limits.tokens + $2 * EXTRACT(EPOCH FROM (now() - rate_limits.updated_at)) * 1000)) - 1,
       updated_at = now()
     RETURNING (tokens >= 0) AS allowed`,
    [limit, rate],
  );
  for (let i = 0; i < limit; i++) {
    const { rows } = await consume();
    assert.equal(rows[0].allowed, true, `attempt ${i + 1} within budget must pass`);
  }
  const { rows: denied } = await consume();
  assert.equal(denied[0].allowed, false, "attempt over budget must be denied");
  // Session revocation bumps version.
  await db.query("UPDATE users SET token_version=token_version+1 WHERE id=1");
  const { rows: bumped } = await db.query("SELECT token_version FROM users WHERE id=1");
  assert.equal(bumped[0].token_version, 2, "revocation increments token_version");
  console.log("PASS security migration: idempotent, token_version default, rate-limit bucket, revocation bump");
} finally {
  await db.close();
}
