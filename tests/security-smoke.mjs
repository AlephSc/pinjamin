import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const env = await readFile(path.join(root, ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const BASE = process.env.PINJAMIN_BASE_URL || "http://127.0.0.1:3181";

// 1. Security headers present on a page and an API route; X-Powered-By removed.
for (const route of ["/masuk", "/api/auth/me"]) {
  const res = await fetch(`${BASE}${route}`);
  const h = res.headers;
  assert.ok(h.get("content-security-policy")?.includes("default-src 'self'"), `${route}: CSP missing`);
  assert.equal(h.get("x-content-type-options"), "nosniff", `${route}: nosniff missing`);
  assert.equal(h.get("x-frame-options"), "DENY", `${route}: XFO missing`);
  assert.ok(h.get("referrer-policy"), `${route}: referrer-policy missing`);
  assert.ok(h.get("permissions-policy"), `${route}: permissions-policy missing`);
  assert.equal(h.get("x-powered-by"), null, `${route}: X-Powered-By must be removed`);
}
console.log("PASS security headers on page + API, X-Powered-By removed");

// Helper: get a login CSRF token + cookie.
async function csrf() {
  const res = await fetch(`${BASE}/api/auth/challenge`);
  const { csrf: token } = await res.json();
  const cookie = res.headers.get("set-cookie").split(";")[0];
  return { token, cookie };
}
async function login(email, password, c) {
  return fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Origin": BASE, "Content-Type": "application/json", "X-CSRF-Token": c.token, "Cookie": c.cookie },
    body: JSON.stringify({ email, password }),
  });
}

// 2. Rate limit: per-email bucket (5/min) trips before per-IP (10/min).
const c = await csrf();
const victim = "ratelimit-probe@pinjamin.local";
let saw429 = false, retryAfter = null;
for (let i = 0; i < 7; i++) {
  const res = await login(victim, "wrong-password", c);
  if (res.status === 429) { saw429 = true; retryAfter = res.headers.get("retry-after"); break; }
  assert.equal(res.status, 401, `attempt ${i + 1}: expected 401 before limit`);
}
assert.ok(saw429, "login rate limit must return 429");
assert.ok(retryAfter && Number(retryAfter) >= 1, "429 must include Retry-After");
console.log(`PASS login rate limit returns 429 + Retry-After=${retryAfter}`);

// 3. Session revocation: a valid token stops working after token_version bump.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const email = `revoke-probe-${randomBytes(4).toString("hex")}@pinjamin.local`;
const password = randomBytes(12).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
try {
  const ins = await client.query("INSERT INTO users(name,email,password_hash,role,active) VALUES($1,$2,$3,'peminjam',true) RETURNING id", ["Revoke Probe", email, hash]);
  const userId = ins.rows[0].id;
  const c2 = await csrf();
  const ok = await login(email, password, c2);
  assert.equal(ok.status, 200, "valid login must succeed");
  const sessionCookie = ok.headers.get("set-cookie").split(";")[0];
  const meBefore = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: sessionCookie } });
  assert.ok((await meBefore.json()).user, "session must be valid before revocation");
  await client.query("UPDATE users SET token_version=token_version+1 WHERE id=$1", [userId]);
  const meAfter = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: sessionCookie } });
  assert.equal((await meAfter.json()).user, null, "session must be invalid after token_version bump");
  console.log("PASS session revocation invalidates outstanding token");
  await client.query("DELETE FROM users WHERE id=$1", [userId]);
} finally {
  await client.end();
}
console.log("ALL SECURITY SMOKE TESTS PASSED");
