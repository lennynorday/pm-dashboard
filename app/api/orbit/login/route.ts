import { NextResponse } from "next/server";
import { startLogin } from "@/lib/orbit/oauth";
import { currentUser } from "@/lib/session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/api/orbit",
  maxAge: 600,
} as const;

export async function GET(request: Request) {
  // Een Orbit-token hoort altijd bij een ingelogde gebruiker.
  if (!(await currentUser())) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const { authorizeUrl, verifier, state } = startLogin();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("orbit_verifier", verifier, COOKIE_OPTIONS);
  response.cookies.set("orbit_state", state, COOKIE_OPTIONS);
  return response;
}
