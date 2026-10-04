import { createHash, randomBytes } from "node:crypto";
import {
  ORBIT_BASE_URL,
  ORBIT_MCP_URL,
  ORBIT_REDIRECT_URI,
  orbitClientId,
} from "./config";
import { OrbitToken, parseTokenResponse } from "./token";

export type PkceStart = {
  authorizeUrl: string;
  verifier: string;
  state: string;
};

export function startLogin(): PkceStart {
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL(`${ORBIT_BASE_URL}/oauth2/Authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: orbitClientId(),
    redirect_uri: ORBIT_REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "MCP",
    resource: ORBIT_MCP_URL,
    state,
  }).toString();

  return { authorizeUrl: url.toString(), verifier, state };
}

async function requestToken(
  params: Record<string, string>,
): Promise<OrbitToken> {
  const response = await fetch(`${ORBIT_BASE_URL}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: orbitClientId(),
      resource: ORBIT_MCP_URL,
      ...params,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Orbit gaf status ${response.status} bij het ophalen van een token`,
    );
  }
  return parseTokenResponse(await response.json(), Date.now());
}

export function exchangeCode(
  code: string,
  verifier: string,
): Promise<OrbitToken> {
  return requestToken({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: ORBIT_REDIRECT_URI,
  });
}

export function refreshToken(refresh: string): Promise<OrbitToken> {
  return requestToken({ grant_type: "refresh_token", refresh_token: refresh });
}
