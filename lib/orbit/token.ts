import { decrypt, encrypt } from "@/lib/crypto";
import { database } from "@/lib/db";

const BRON = "orbit";

export type OrbitToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

/** Parst het antwoord van het token-endpoint van Orbit. */
export function parseTokenResponse(data: unknown, now: number): OrbitToken {
  if (typeof data !== "object" || data === null) {
    throw new Error("Ongeldig tokenantwoord van Orbit");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.access_token !== "string") {
    throw new Error("Tokenantwoord van Orbit bevat geen access_token");
  }
  const expiresIn =
    typeof record.expires_in === "number" ? record.expires_in : 3600;
  return {
    accessToken: record.access_token,
    refreshToken:
      typeof record.refresh_token === "string" ? record.refresh_token : null,
    expiresAt: now + expiresIn * 1000,
  };
}

function parseStoredToken(data: unknown): OrbitToken | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.accessToken !== "string") return null;
  if (typeof record.expiresAt !== "number") return null;
  return {
    accessToken: record.accessToken,
    refreshToken:
      typeof record.refreshToken === "string" ? record.refreshToken : null,
    expiresAt: record.expiresAt,
  };
}

/** Het Orbit-token van een gebruiker, of null als die Orbit niet heeft verbonden. */
export function readToken(email: string): OrbitToken | null {
  const row = database()
    .prepare("SELECT token FROM koppelingen WHERE email = ? AND bron = ?")
    .get(email, BRON);
  if (typeof row?.token !== "string") return null;
  try {
    return parseStoredToken(JSON.parse(decrypt(row.token)));
  } catch {
    return null;
  }
}

export function saveToken(email: string, token: OrbitToken): void {
  database()
    .prepare(
      `INSERT INTO koppelingen (email, bron, token) VALUES (?, ?, ?)
       ON CONFLICT (email, bron) DO UPDATE SET token = excluded.token`,
    )
    .run(email, BRON, encrypt(JSON.stringify(token)));
}
