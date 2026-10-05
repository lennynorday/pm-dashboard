import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ORBIT_MCP_URL } from "./config";
import { refreshToken } from "./oauth";
import { OrbitToken, readToken, saveToken } from "./token";

export type OrbitResult =
  | { status: "ok"; text: string }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

const REFRESH_MARGIN_MS = 60_000;

async function refresh(
  email: string,
  value: string,
): Promise<OrbitToken | null> {
  // Een verlopen refresh token betekent: opnieuw inloggen.
  const refreshed = await refreshToken(value).catch(() => null);
  if (refreshed) saveToken(email, refreshed);
  return refreshed;
}

/**
 * Gelijktijdige aanroepen van één gebruiker delen één vernieuwing. Anders maakt
 * de tweede vernieuwing het token van de eerste ongeldig en geeft Orbit een 403.
 */
const refreshing = new Map<string, Promise<OrbitToken | null>>();

async function validToken(email: string): Promise<OrbitToken | null> {
  const token = readToken(email);
  if (!token) return null;
  if (token.expiresAt - REFRESH_MARGIN_MS > Date.now()) return token;
  if (!token.refreshToken) return null;

  const pending =
    refreshing.get(email) ??
    refresh(email, token.refreshToken).finally(() => refreshing.delete(email));
  refreshing.set(email, pending);
  return pending;
}

/** Roept één tool van de officiële Orbit-connector aan met het token van de gebruiker. */
export async function callOrbitTool(
  email: string,
  name: string,
  args: Record<string, unknown>,
): Promise<OrbitResult> {
  try {
    const token = await validToken(email);
    if (!token) return { status: "niet-verbonden" };

    const transport = new StreamableHTTPClientTransport(
      new URL(ORBIT_MCP_URL),
      {
        requestInit: {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        },
      },
    );
    const client = new Client({ name: "pm-dashboard", version: "0.1.0" });
    await client.connect(transport);

    try {
      const result = await client.callTool({ name, arguments: args });
      const content = Array.isArray(result.content) ? result.content : [];
      const text = content
        .filter(
          (item): item is { type: "text"; text: string } =>
            item.type === "text",
        )
        .map((item) => item.text)
        .join("\n");
      return { status: "ok", text };
    } finally {
      await client.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "fout", message };
  }
}
