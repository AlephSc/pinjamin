import assert from "node:assert/strict";

const BASE_URL = process.env.PINJAMIN_BASE_URL || "http://127.0.0.1:3181";

async function run() {
  for (const route of ["/", "/masuk", "/keluar"]) {
    const response = await fetch(`${BASE_URL}${route}`);
    assert.equal(response.status, 200, `${route}: expected 200, got ${response.status}`);
    assert.ok((await response.text()).length > 100, `${route}: expected HTML`);
  }
  const challenge = await fetch(`${BASE_URL}/api/auth/challenge`);
  assert.equal(challenge.status, 200);
  assert.ok(challenge.headers.get("set-cookie")?.includes("pinjamin_login_csrf="));
  const me = await fetch(`${BASE_URL}/api/auth/me`);
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user, null);
  const loans = await fetch(`${BASE_URL}/api/loans`);
  assert.equal(loans.status, 401);
  const categories = await fetch(`${BASE_URL}/api/categories`);
  assert.equal(categories.status, 401, "categories API must require a session");
  const createCategory = await fetch(`${BASE_URL}/api/categories`, { method: "POST", headers: { "Origin": BASE_URL, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Unauthorized" }) });
  assert.equal(createCategory.status, 401, "category writes must require an administrator session");
  console.log("PASS public routes, CSRF challenge, anonymous session, and protected APIs");
}

run().catch((error) => { console.error(error); process.exit(1); });
