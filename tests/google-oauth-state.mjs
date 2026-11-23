import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.AUTH_SECRET = "test-auth-secret-0123456789abcdef0123456789";

const { signedState, readSignedState } = await import("../lib/server/oauth-state.ts");

const nonce = "nonce-abc123";
const state = `${nonce}.${signedState(nonce)}`;

assert.equal(state.split(".").length, 3, "state must be nonce.payload.signature");
assert.ok(state.startsWith(`${nonce}.`));

assert.equal(readSignedState(state, nonce), true, "fresh signed state must verify");
assert.equal(readSignedState(state, "wrong-nonce"), false, "nonce binding must be enforced");
assert.equal(readSignedState(undefined, nonce), false);
assert.equal(readSignedState("", nonce), false);
assert.equal(readSignedState("a.b", nonce), false, "two-part state must be rejected");
assert.equal(readSignedState(`${state}.extra`, nonce), false, "four-part state must be rejected");
assert.equal(readSignedState(state.slice(0, -2) + "AA", nonce), false, "tampered signature must be rejected");

const [prefix, , signature] = state.split(".");
const tamperedPayload = Buffer.from(JSON.stringify({ n: nonce, exp: Math.floor(Date.now() / 1000) + 600, extra: 1 })).toString("base64url");
assert.equal(readSignedState(`${prefix}.${tamperedPayload}.${signature}`, nonce), false, "payload must stay unchanged");

const expiredPayload = Buffer.from(JSON.stringify({ n: nonce, exp: Math.floor(Date.now() / 1000) - 10 })).toString("base64url");
const expiredSignature = createHmac("sha256", process.env.AUTH_SECRET).update(expiredPayload).digest("base64url");
assert.equal(readSignedState(`${prefix}.${expiredPayload}.${expiredSignature}`, nonce), false, "expired state must be rejected");

console.log("PASS google oauth state: nonce binding, signature, payload integrity, expiry");
