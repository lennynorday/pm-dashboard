import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/slack/oauth";
import { saveKoppeling } from "@/lib/koppelingen";
import { currentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("slack_state")?.value;

  const user = await currentUser();
  if (!user || !code || !state || state !== expectedState) {
    return new NextResponse(
      "Verbinden met Slack is mislukt. Probeer het opnieuw.",
      { status: 400 },
    );
  }

  try {
    saveKoppeling(user.email, "slack", await exchangeCode(code));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Verbinden met Slack is mislukt: ${message}`, {
      status: 400,
    });
  }

  const response = NextResponse.redirect(new URL("/todos", request.url));
  response.cookies.delete({ name: "slack_state", path: "/api/slack" });
  return response;
}
