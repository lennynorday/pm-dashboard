import { NextResponse } from "next/server";
import { startLogin } from "@/lib/google/oauth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/api/google",
  maxAge: 600,
} as const;

export function GET() {
  const { authorizeUrl, verifier, state } = startLogin();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("google_verifier", verifier, COOKIE_OPTIONS);
  response.cookies.set("google_state", state, COOKIE_OPTIONS);
  return response;
}
