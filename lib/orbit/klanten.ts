import { bewaar, lees, vers } from "@/lib/db";
import { DEMO, demoKlantIds } from "@/lib/demo";
import { opAchtergrond } from "./achtergrond";
import { callOrbitTool } from "./client";

/**
 * Het id bij een klantnaam uit de tabel die ListClients teruggeeft:
 * | Centraal Museum Utrecht | BOTH | ...
 * api_ids: CL4KKKRQSAXN7GK
 * Alleen een exacte naam telt; anders null.
 */
export function parseKlantId(text: string, naam: string): string | null {
  // Oudere antwoorden hadden een link als naam: [Naam](jump:CLIENT:1385240).
  const namen = [
    ...text.matchAll(/^\| \[?(.+?)(?:\]\(jump:CLIENT:\d+\))? \| [A-Z]+ \|/gm),
  ].map((match) => match[1].toLowerCase());
  const ids = /^api_ids: (.+)$/m.exec(text)?.[1].split(/,\s*/) ?? [];
  const index = namen.indexOf(naam.toLowerCase());
  return index >= 0 ? (ids[index] ?? null) : null;
}

// Een naam die Orbit niet (exact) kent, proberen we pas na een dag opnieuw.
const ONBEKEND_MS = 24 * 60 * 60 * 1000;

const sleutelVan = (naam: string) => `klant-id:v2:${naam}`;

/**
 * ListProjects geeft "klant | klantentiteit" als klantnaam, met / in plaats
 * van |; de klant zelf is het deel ervoor.
 */
export function zonderEntiteit(naam: string): string {
  return naam.split(" / ")[0];
}

/** Een id verandert niet, dus eenmaal gevonden blijft het bewaard; een onbekende naam een dag. */
async function fetchKlantId(email: string, naam: string): Promise<void> {
  const result = await callOrbitTool(
    email,
    "ListClients",
    { text: zonderEntiteit(naam), pageSize: 50 },
    true,
  );
  if (result.status !== "ok") return;
  bewaar(
    sleutelVan(naam),
    parseKlantId(result.text, naam) ??
      parseKlantId(result.text, zonderEntiteit(naam)),
  );
}

/**
 * Orbit-klant-id per klantnaam; ListProjects geeft alleen de naam.
 * Alleen wat bewaard is; ontbrekende id's worden op de achtergrond opgehaald.
 */
export function fetchKlantIds(
  email: string,
  namen: string[],
): Map<string, string> {
  if (DEMO) return demoKlantIds();
  const ids = new Map<string, string>();
  for (const naam of new Set(namen)) {
    const hit = lees<string | null>(sleutelVan(naam));
    if (hit?.waarde) {
      ids.set(naam, hit.waarde);
      continue;
    }
    if (hit && vers(hit.opgehaald, ONBEKEND_MS)) continue;
    opAchtergrond(sleutelVan(naam), () => fetchKlantId(email, naam));
  }
  return ids;
}
