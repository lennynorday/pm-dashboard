import { NextRequest, NextResponse } from "next/server";
import { clearJiraCache } from "@/lib/jira/overview";
import { exchangeCode } from "@/lib/jira/oauth";
import { saveKoppeling } from "@/lib/koppelingen";
import { currentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("jira_state")?.value;

  const user = await currentUser();
  if (!user || !code || !state || state !== expectedState) {
    return new NextResponse(
      "Verbinden met Jira is mislukt. Probeer het opnieuw.",
      { status: 400 },
    );
  }

  try {
    saveKoppeling(user.email, "jira", await exchangeCode(code));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Verbinden met Jira is mislukt: ${message}`, {
      status: 400,
    });
  }

  // Oude resultaten van vóór het verbinden mogen niet blijven hangen.
  clearJiraCache();
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: "jira_state", path: "/api/jira" });
  return response;
}
