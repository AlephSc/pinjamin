import { randomBytes } from "node:crypto";
import type { NextResponse as NextResponseType } from "next/server";
import type { Role } from "@/lib/types";
import { ApiError } from "@/lib/server/api/errors";
import { readSignedState, sameValue, signedState } from "./oauth-state";

const GOOGLE_AUTH_HOST = "https://accounts.google.com";
const GOOGLE_API_HOST = "https://oauth2.googleapis.com";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = "openid email profile";
const STATE_COOKIE = "pinjamin_google_state";
const PENDING_COOKIE = "pinjamin_google_pending";
const COOKIE_MAX_AGE = 600;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  defaultRole: Role;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

function requiredEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function googleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requiredEnv("GOOGLE_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) return null;
  if (!/^https:\/\/[^/\s]+\/api\/auth\/google\/callback\/?$/.test(redirectUri)) {
    throw new ApiError(500, "GOOGLE_REDIRECT_INVALID", "GOOGLE_REDIRECT_URI must be an HTTPS callback URL.");
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    defaultRole: "peminjam",
  };
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
});

function normalizeName(value: string | null | undefined) {
  const name = (value ?? "").trim().slice(0, 120);
  return name || "Pengguna Google";
}

export function googleLoginUrl(request: Request) {
  const config = googleOAuthConfig();
  if (!config?.redirectUri) throw new ApiError(409, "GOOGLE_NOT_CONFIGURED", "Login Google belum diaktifkan.");
  const nonce = randomBytes(24).toString("base64url");
  const state = `${nonce}.${signedState(nonce)}`;
  const url = new URL(`${GOOGLE_AUTH_HOST}/o/oauth2/v2/auth`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return { url: url.toString(), state, nonce };
}

export function setGoogleStateCookies(response: NextResponseType, state: string, nonce: string) {
  response.cookies.set(STATE_COOKIE, state, cookieOptions());
  response.cookies.set(PENDING_COOKIE, nonce, cookieOptions());
}

export function googleCookies(request: Request) {
  const jar = request.headers.get("cookie")?.split(";").map((part) => part.trim()) ?? [];
  const read = (name: string) => jar.find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return { state: read(STATE_COOKIE), nonce: read(PENDING_COOKIE) };
}

export function clearGoogleCookies(response: NextResponseType) {
  response.cookies.set(STATE_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(PENDING_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function exchangeGoogleCode(request: Request, code: string, state: string) {
  const config = googleOAuthConfig();
  if (!config?.redirectUri) throw new ApiError(409, "GOOGLE_NOT_CONFIGURED", "Login Google belum diaktifkan.");
  const cookies = googleCookies(request);
  const [nonce] = state.split(".");
  if (!nonce || !cookies.state || !cookies.nonce || !sameValue(state, cookies.state) || !sameValue(nonce, cookies.nonce) || !readSignedState(cookies.state, nonce)) {
    throw new ApiError(400, "GOOGLE_STATE_INVALID", "Sesi login Google tidak valid. Coba lagi.");
  }

  const payload = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const tokenResponse = await fetch(`${GOOGLE_API_HOST}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
    cache: "no-store",
  });
  if (!tokenResponse.ok) {
    console.error("Google token exchange failed", tokenResponse.status);
    throw new ApiError(502, "GOOGLE_TOKEN_FAILED", "Google menolak pertukaran kode login.");
  }
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new ApiError(502, "GOOGLE_TOKEN_FAILED", "Google tidak mengembalikan akses token.");

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!profileResponse.ok) {
    console.error("Google userinfo failed", profileResponse.status);
    throw new ApiError(502, "GOOGLE_PROFILE_FAILED", "Gagal membaca identitas Google.");
  }
  const profile = await profileResponse.json() as {
    sub?: string;
    email?: string;
    name?: string | null;
    email_verified?: boolean | string;
  };
  const email = profile.email?.trim().toLowerCase();
  if (!profile.sub || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "GOOGLE_IDENTITY_INVALID", "Identitas Google tidak lengkap.");
  }
  const emailVerified = profile.email_verified === true || profile.email_verified === "true";
  if (!emailVerified) throw new ApiError(403, "GOOGLE_EMAIL_UNVERIFIED", "Email Google ini belum terverifikasi.");
  return {
    sub: profile.sub,
    email,
    name: normalizeName(profile.name),
    emailVerified,
  } satisfies GoogleIdentity;
}
