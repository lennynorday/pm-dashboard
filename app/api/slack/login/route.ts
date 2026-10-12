import { NextResponse } from "next/server";
import { startLogin } from "@/lib/slack/oauth";
import { currentUser } from "@/lib/session";

export async function GET(request: Request) {
  // Een Slack-token hoort altijd bij een ingelogde gebruiker.
  if (!(await currentUser())) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const { authorizeUrl, state } = startLogin();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("slack_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/slack",
    maxAge: 600,
  });
  return response;
}
