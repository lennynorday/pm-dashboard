import { randomBytes } from "node:crypto";
import { config } from "@/config/dashboard";
import {
  OAuthToken,
  parseStoredToken,
  parseTokenResponse,
} from "@/lib/koppelingen";

const AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";
export const JIRA_REDIRECT_URI = "http://localhost:3000/api/jira/callback";

/** Alleen lezen; offline_access geeft een refresh token. */
const SCOPES = "read:jira-work offline_access";

/** Een Jira-token hoort bij één Atlassian-site, aangeduid met het cloud-id. */
export type JiraToken = OAuthToken & { cloudId: string };

function setting(name: "JIRA_CLIENT_ID" | "JIRA_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt in .env.local`);
  return value;
}

export function startLogin(): { authorizeUrl: string; state: string } {
  const state = randomBytes(16).toString("base64url");
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: setting("JIRA_CLIENT_ID"),
    scope: SCOPES,
    redirect_uri: JIRA_REDIRECT_URI,
    state,
    response_type: "code",
    prompt: "consent",
  }).toString();
  return { authorizeUrl: url.toString(), state };
}

async function requestToken(
  params: Record<string, string>,
): Promise<OAuthToken> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: setting("JIRA_CLIENT_ID"),
      client_secret: setting("JIRA_CLIENT_SECRET"),
      ...params,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Atlassian gaf status ${response.status} bij het ophalen van een token`,
    );
  }
  return parseTokenResponse(await response.json(), Date.now());
}

/** Het cloud-id van onze Jira-site, uit de sites waar het token bij mag. */
async function findCloudId(accessToken: string): Promise<string> {
  const response = await fetch(RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Atlassian gaf status ${response.status} bij de sites`);
  }
  const sites: unknown = await response.json();
  const site = (Array.isArray(sites) ? sites : [])
    .map((item: unknown) =>
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : {},
    )
    .find((item) => item.url === config.jiraSite);
  if (typeof site?.id !== "string") {
    throw new Error(`Geen toegang tot ${config.jiraSite} gegeven`);
  }
  return site.id;
}

export async function exchangeCode(code: string): Promise<JiraToken> {
  const token = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: JIRA_REDIRECT_URI,
  });
  return { ...token, cloudId: await findCloudId(token.accessToken) };
}

/** Atlassian geeft bij elke vernieuwing ook een nieuw refresh token. */
export async function refreshJiraToken(
  token: JiraToken,
  refreshToken: string,
): Promise<JiraToken> {
  const refreshed = await requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return { ...refreshed, cloudId: token.cloudId };
}

export function parseJiraToken(data: unknown): JiraToken | null {
  const token = parseStoredToken(data);
  const cloudId =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).cloudId
      : undefined;
  if (!token || typeof cloudId !== "string") return null;
  return { ...token, cloudId };
}
