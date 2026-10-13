import { decrypt, encrypt } from "./crypto";
import { database } from "./db";

/** De bronnen waarmee een gebruiker zijn eigen account verbindt. */
export const BRONNEN = ["orbit", "jira", "slack"] as const;
export type Bron = (typeof BRONNEN)[number];

export type OAuthToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

function record(data: unknown): Record<string, unknown> | null {
  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : null;
}

/** Parst het antwoord van een OAuth-token-endpoint. */
export function parseTokenResponse(data: unknown, now: number): OAuthToken {
  const response = record(data);
  if (typeof response?.access_token !== "string") {
    throw new Error("Het tokenantwoord bevat geen access_token");
  }
  const expiresIn =
    typeof response.expires_in === "number" ? response.expires_in : 3600;
  return {
    accessToken: response.access_token,
    refreshToken:
      typeof response.refresh_token === "string"
        ? response.refresh_token
        : null,
    expiresAt: now + expiresIn * 1000,
  };
}

/** Parst een opgeslagen token; null als het niet klopt. */
export function parseStoredToken(data: unknown): OAuthToken | null {
  const stored = record(data);
  if (typeof stored?.accessToken !== "string") return null;
  if (typeof stored.expiresAt !== "number") return null;
  return {
    accessToken: stored.accessToken,
    refreshToken:
      typeof stored.refreshToken === "string" ? stored.refreshToken : null,
    expiresAt: stored.expiresAt,
  };
}

/** De ontsleutelde koppeling van een gebruiker met een bron, of null. */
function readKoppeling(email: string, bron: Bron): unknown {
  const row = database()
    .prepare("SELECT token FROM koppelingen WHERE email = ? AND bron = ?")
    .get(email, bron);
  if (typeof row?.token !== "string") return null;
  try {
    return JSON.parse(decrypt(row.token));
  } catch {
    return null;
  }
}

export function saveKoppeling(
  email: string,
  bron: Bron,
  token: OAuthToken,
): void {
  database()
    .prepare(
      `INSERT INTO koppelingen (email, bron, token) VALUES (?, ?, ?)
       ON CONFLICT (email, bron) DO UPDATE SET token = excluded.token`,
    )
    .run(email, bron, encrypt(JSON.stringify(token)));
}

/** Of de gebruiker deze bron heeft verbonden; zegt niets over of het token nog werkt. */
export function isVerbonden(email: string, bron: Bron): boolean {
  return parseStoredToken(readKoppeling(email, bron)) !== null;
}

/** Wist het token van de gebruiker voor deze bron. */
export function deleteKoppeling(email: string, bron: Bron): void {
  database()
    .prepare("DELETE FROM koppelingen WHERE email = ? AND bron = ?")
    .run(email, bron);
}

const REFRESH_MARGIN_MS = 60_000;
const refreshing = new Map<string, Promise<OAuthToken | null>>();

/**
 * Een geldig token van de gebruiker voor deze bron, zo nodig vernieuwd; null
 * als die niet (meer) verbonden is. Gelijktijdige aanroepen delen één
 * vernieuwing. Anders maakt de tweede vernieuwing het token van de eerste
 * ongeldig.
 */
export async function validToken<T extends OAuthToken>(
  email: string,
  bron: Bron,
  parse: (data: unknown) => T | null,
  refresh: (token: T, refreshToken: string) => Promise<T>,
): Promise<T | null> {
  const token = parse(readKoppeling(email, bron));
  if (!token) return null;
  if (token.expiresAt - REFRESH_MARGIN_MS > Date.now()) return token;
  if (!token.refreshToken) return null;

  const key = `${bron}:${email}`;
  const pending =
    refreshing.get(key) ??
    refresh(token, token.refreshToken)
      .then((refreshed) => {
        saveKoppeling(email, bron, refreshed);
        return refreshed;
      })
      // Een verlopen refresh token betekent: opnieuw verbinden.
      .catch(() => null)
      .finally(() => refreshing.delete(key));
  refreshing.set(key, pending);
  // Binnen één sleutel is het altijd hetzelfde soort token.
  return pending as Promise<T | null>;
}
