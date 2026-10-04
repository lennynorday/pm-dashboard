import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TOKEN_FILE = path.join(process.cwd(), "data", "orbit-token.json");

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

export async function readToken(): Promise<OrbitToken | null> {
  try {
    return parseStoredToken(JSON.parse(await readFile(TOKEN_FILE, "utf8")));
  } catch {
    return null;
  }
}

export async function saveToken(token: OrbitToken): Promise<void> {
  await mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), { mode: 0o600 });
}
