import { appUrl } from "@/lib/app-url";
import { randomBytes } from "node:crypto";
import { OAuthToken } from "@/lib/koppelingen";

const AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const TOKEN_URL = "https://slack.com/api/oauth.v2.access";
export const SLACK_REDIRECT_URI = appUrl("/api/slack/callback");

/**
 * Lezen: zoeken in berichten (ook is:dm), namen van gebruikers en je eigen
 * emoji-reacties. Schrijven: de notulen en herinneringen (een DM openen met
 * im:write), alleen na een klik op Verstuur.
 */
const USER_SCOPES = "search:read users:read reactions:read chat:write im:write";

/** Heeft dit token deze scopes? Tokens van vóór het bewaren van scopes: nee, tot hij opnieuw verbindt. */
const heeftScopes = (token: OAuthToken, scopes: string[]): boolean => {
  const gegeven = token.scope?.split(/[\s,]+/) ?? [];
  return scopes.every((scope) => gegeven.includes(scope));
};

/** Mag dit token berichten plaatsen? */
export const heeftSchrijfScope = (token: OAuthToken): boolean =>
  heeftScopes(token, ["chat:write"]);

/** Mag dit token een DM openen en erin schrijven? */
export const heeftDmScope = (token: OAuthToken): boolean =>
  heeftScopes(token, ["chat:write", "im:write"]);

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
    // Slack scheidt de scopes met komma's.
    scope: typeof user.scope === "string" ? user.scope : null,
  };
}
