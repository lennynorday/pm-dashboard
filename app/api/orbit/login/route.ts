import { NextResponse } from "next/server";
import { startLogin } from "@/lib/orbit/oauth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/api/orbit",
  maxAge: 600,
} as const;

export function GET() {
  const { authorizeUrl, verifier, state } = startLogin();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("orbit_verifier", verifier, COOKIE_OPTIONS);
  response.cookies.set("orbit_state", state, COOKIE_OPTIONS);
  return response;
}
