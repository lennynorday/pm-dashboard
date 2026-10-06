import { bewaar, lees } from "@/lib/db";
import { callOrbitTool } from "./client";

/**
 * Het id bij een klantnaam uit de tabel die ListClients teruggeeft:
 * | [Centraal Museum Utrecht](jump:CLIENT:1385240) | BOTH | ...
 * api_ids: CL4KKKRQSAXN7GK
 * Alleen een exacte naam telt; anders null.
 */
export function parseKlantId(text: string, naam: string): string | null {
  const namen = [...text.matchAll(/^\| \[(.+?)\]\(jump:CLIENT:\d+\)/gm)].map(
    (match) => match[1].toLowerCase(),
  );
  const ids = /^api_ids: (.+)$/m.exec(text)?.[1].split(/,\s*/) ?? [];
  const index = namen.indexOf(naam.toLowerCase());
  return index >= 0 ? (ids[index] ?? null) : null;
}

/** Een id verandert niet, dus eenmaal gevonden blijft het bewaard. */
async function fetchKlantId(
  email: string,
  naam: string,
): Promise<string | null> {
  const sleutel = `klant-id:v1:${naam}`;
  const hit = lees<string>(sleutel);
  if (hit) return hit.waarde;
  const result = await callOrbitTool(email, "ListClients", {
    text: naam,
    pageSize: 50,
  });
  if (result.status !== "ok") return null;
  const id = parseKlantId(result.text, naam);
  if (id) bewaar(sleutel, id);
  return id;
}

/**
 * Orbit-klant-id per klantnaam; ListProjects geeft alleen de naam.
 * Na elkaar, om onder de rate limit van Orbit te blijven.
 */
export async function fetchKlantIds(
  email: string,
  namen: string[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const naam of new Set(namen)) {
    const id = await fetchKlantId(email, naam);
    if (id) ids.set(naam, id);
  }
  return ids;
}
