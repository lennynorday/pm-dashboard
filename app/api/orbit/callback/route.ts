import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/orbit/oauth";
import { saveToken } from "@/lib/orbit/token";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const verifier = request.cookies.get("orbit_verifier")?.value;
  const expectedState = request.cookies.get("orbit_state")?.value;

  if (!code || !verifier || !state || state !== expectedState) {
    return new NextResponse(
      "Inloggen bij Orbit is mislukt. Probeer het opnieuw.",
      {
        status: 400,
      },
    );
  }

  await saveToken(await exchangeCode(code, verifier));

  const response = NextResponse.redirect(new URL("/orbit-test", request.url));
  response.cookies.delete({ name: "orbit_verifier", path: "/api/orbit" });
  response.cookies.delete({ name: "orbit_state", path: "/api/orbit" });
  return response;
}
