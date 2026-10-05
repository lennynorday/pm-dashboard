import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/orbit/oauth";
import { saveKoppeling } from "@/lib/koppelingen";
import { currentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const verifier = request.cookies.get("orbit_verifier")?.value;
  const expectedState = request.cookies.get("orbit_state")?.value;

  const failed = new NextResponse(
    "Inloggen bij Orbit is mislukt. Probeer het opnieuw.",
    { status: 400 },
  );
  const user = await currentUser();
  if (!user || !code || !verifier || !state || state !== expectedState) {
    return failed;
  }

  try {
    saveKoppeling(user.email, "orbit", await exchangeCode(code, verifier));
  } catch {
    return failed;
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: "orbit_verifier", path: "/api/orbit" });
  response.cookies.delete({ name: "orbit_state", path: "/api/orbit" });
  return response;
}
