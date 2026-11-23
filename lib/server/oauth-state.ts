import { createHmac, timingSafeEqual } from "node:crypto";

export const OAUTH_STATE_MAX_AGE = 600;

export function sameValue(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signedState(nonce: string) {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("AUTH_SECRET must be configured for Google login.");
  const body = Buffer.from(JSON.stringify({ n: nonce, exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_MAX_AGE })).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function readSignedState(value: string | undefined, nonce: string) {
  if (!value || value.length > 1024) return false;
  const [prefix, body, signature, extra] = value.split(".");
  if (!prefix || !body || !signature || extra) return false;
  if (!sameValue(prefix, nonce)) return false;
  const secret = process.env.AUTH_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!sameValue(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { n?: string; exp?: number };
    return payload.n === nonce && Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
