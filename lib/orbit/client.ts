import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ORBIT_MCP_URL } from "./config";
import { parseStoredToken, validToken } from "@/lib/koppelingen";
import { refreshToken } from "./oauth";

export type OrbitResult =
  | { status: "ok"; text: string }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

// ponytail: vaste pauze na een rate limit; de wachttijd uit Orbits melding lezen als die te kort of te lang blijkt.
const PAUZE_MS = 60 * 1000;
let pauzeTot = 0;

/** Eén verbinding per gebruiker; een nieuwe verbinding kost Orbit elke keer extra verzoeken. */
const verbindingen = new Map<
  string,
  { token: string; client: Promise<Client> }
>();

async function verbind(token: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ORBIT_MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "pm-dashboard", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

function verbinding(email: string, token: string): Promise<Client> {
  const bestaand = verbindingen.get(email);
  if (bestaand?.token === token) return bestaand.client;
  bestaand?.client.then((client) => client.close()).catch(() => undefined);
  const client = verbind(token);
  verbindingen.set(email, { token, client });
  return client;
}

/** Roept één tool van de officiële Orbit-connector aan met het token van de gebruiker. */
export async function callOrbitTool(
  email: string,
  name: string,
  args: Record<string, unknown>,
): Promise<OrbitResult> {
  if (Date.now() < pauzeTot) {
    return {
      status: "fout",
      message:
        "Orbit krijgt te veel verzoeken. Probeer het over een minuut opnieuw.",
    };
  }
  try {
    const token = await validToken(
      email,
      "orbit",
      parseStoredToken,
      (_, refresh) => refreshToken(refresh),
    );
    if (!token) return { status: "niet-verbonden" };

    const client = await verbinding(email, token.accessToken);
    const result = await client.callTool({ name, arguments: args });
    const content = Array.isArray(result.content) ? result.content : [];
    const text = content
      .filter(
        (item): item is { type: "text"; text: string } => item.type === "text",
      )
      .map((item) => item.text)
      .join("\n");
    if (text.startsWith("RATE_LIMITED")) {
      pauzeTot = Date.now() + PAUZE_MS;
      return { status: "fout", message: text };
    }
    if (result.isError) return { status: "fout", message: text };
    return { status: "ok", text };
  } catch (error) {
    // Bij een verlopen sessie of netwerkfout de volgende keer opnieuw verbinden.
    verbindingen.delete(email);
    // Orbit meldt de rate limit soms als HTTP-fout (IIS) in plaats van als RATE_LIMITED.
    if (error instanceof StreamableHTTPError) pauzeTot = Date.now() + PAUZE_MS;
    const message = error instanceof Error ? error.message : String(error);
    return { status: "fout", message };
  }
}
