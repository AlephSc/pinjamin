import assert from "node:assert/strict";

const BASE_URL = process.env.PINJAMIN_BASE_URL || "http://localhost:3000";

async function run() {
  console.log(`[QA] Testing URL Routes and Role Separation against ${BASE_URL}...`);

  // 1. Test HTTP Response Status
  const routes = ["/", "/admin", "/petugas"];
  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`);
    assert.equal(res.status, 200, `Expected 200 OK for ${route}, got ${res.status}`);
    const html = await res.text();
    assert.ok(html.length > 500, `Expected HTML content for ${route}`);
  }
  console.log("✓ All 3 routes return HTTP 200 OK");

  // 2. Test Custom Header & Segment markers
  const adminRes = await fetch(`${BASE_URL}/admin`);
  assert.equal(adminRes.headers.get("x-pinjamin-segment"), "admin");
  const petugasRes = await fetch(`${BASE_URL}/petugas`);
  assert.equal(petugasRes.headers.get("x-pinjamin-segment"), "petugas");
  console.log("✓ Route headers correctly identify segment /admin and /petugas");

  console.log("[QA] All route automated assertions passed!");
}

run().catch((err) => {
  console.error("QA Test Failed:", err);
  process.exit(1);
});
