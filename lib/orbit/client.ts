import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ORBIT_MCP_URL } from "./config";
import { parseStoredToken, validToken } from "@/lib/koppelingen";
import { refreshToken } from "./oauth";

export type OrbitResult =
  | { status: "ok"; text: string }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

/** Roept één tool van de officiële Orbit-connector aan met het token van de gebruiker. */
export async function callOrbitTool(
  email: string,
  name: string,
  args: Record<string, unknown>,
): Promise<OrbitResult> {
  try {
    const token = await validToken(
      email,
      "orbit",
      parseStoredToken,
      (_, refresh) => refreshToken(refresh),
    );
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
