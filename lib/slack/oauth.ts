import { appUrl } from "@/lib/app-url";
import { randomBytes } from "node:crypto";
import { OAuthToken } from "@/lib/koppelingen";

const AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const TOKEN_URL = "https://slack.com/api/oauth.v2.access";
export const SLACK_REDIRECT_URI = appUrl("/api/slack/callback");

/** Alleen lezen: zoeken in berichten en de DM's van de gebruiker zelf. */
const USER_SCOPES = "search:read im:read im:history mpim:read mpim:history";

function setting(name: "SLACK_CLIENT_ID" | "SLACK_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt in .env.local`);
  return value;
}

export function startLogin(): { authorizeUrl: string; state: string } {
  const state = randomBytes(16).toString("base64url");
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: setting("SLACK_CLIENT_ID"),
    user_scope: USER_SCOPES,
    redirect_uri: SLACK_REDIRECT_URI,
    state,
  }).toString();
  return { authorizeUrl: url.toString(), state };
}

/**
 * Wisselt de code in voor het gebruikerstoken. Slack-tokens verlopen niet
 * (tokenrotatie staat uit), dus er is geen refresh token.
 */
export async function exchangeCode(code: string): Promise<OAuthToken> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: setting("SLACK_CLIENT_ID"),
      client_secret: setting("SLACK_CLIENT_SECRET"),
      code,
      redirect_uri: SLACK_REDIRECT_URI,
    }),
  });
  const data: unknown = await response.json();
  const body =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};
  const user =
    typeof body.authed_user === "object" && body.authed_user !== null
      ? (body.authed_user as Record<string, unknown>)
      : {};
  if (typeof user.access_token !== "string") {
    throw new Error(
      `Slack gaf geen gebruikerstoken (${typeof body.error === "string" ? body.error : response.status})`,
    );
  }
  return {
    accessToken: user.access_token,
    refreshToken: null,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}
