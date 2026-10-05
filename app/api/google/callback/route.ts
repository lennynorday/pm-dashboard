import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, GeenNordayAccountError } from "@/lib/google/oauth";
import {
  LOGIN_MELDING_COOKIE,
  LoginMelding,
  SESSIE_COOKIE,
  SESSIE_COOKIE_OPTIONS,
  startSessie,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const verifier = request.cookies.get("google_verifier")?.value;
  const expectedState = request.cookies.get("google_state")?.value;

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: "google_verifier", path: "/api/google" });
  response.cookies.delete({ name: "google_state", path: "/api/google" });

  const fail = (melding: LoginMelding) => {
    response.cookies.set(LOGIN_MELDING_COOKIE, melding, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
    return response;
  };

  if (!code || !verifier || !state || state !== expectedState) {
    return fail("mislukt");
  }

  try {
    const profiel = await exchangeCode(code, verifier);
    response.cookies.set(
      SESSIE_COOKIE,
      startSessie(profiel),
      SESSIE_COOKIE_OPTIONS,
    );
    response.cookies.delete(LOGIN_MELDING_COOKIE);
    return response;
  } catch (error) {
    return fail(
      error instanceof GeenNordayAccountError
        ? "geen-norday-account"
        : "mislukt",
    );
  }
}
