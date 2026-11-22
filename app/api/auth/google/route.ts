import { NextResponse } from "next/server";
import { api } from "@/lib/server/api/http";
import { googleLoginUrl, googleOAuthConfig, setGoogleStateCookies } from "@/lib/server/google-auth";

export async function GET(request: Request) {
  const enabled = Boolean(googleOAuthConfig()?.redirectUri);
  if (!enabled) return Response.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  return api(async () => {
    const { url, state, nonce } = googleLoginUrl(request);
    const response = NextResponse.json({ enabled: true, url }, { headers: { "Cache-Control": "no-store" } });
    setGoogleStateCookies(response, state, nonce);
    return response;
  });
}
