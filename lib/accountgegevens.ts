import { bewaar, lees, vers } from "./db";
import type { LinkUrls } from "./links";
import { fetchTabel, saveRij } from "./superhuman";

export type Contactpersoon = {
  naam: string;
  rol?: string;
  email?: string;
};

/** Wat Orbit niet weet over een account; gedeeld via de tabel in Superhuman. */
export type AccountGegevens = {
  /** Leeg: de naam uit Orbit. */
  naam?: string;
  am?: string;
  /** Jira-projecten van dit account. */
  jiraKeys: string[];
  /** Organizations in SUPP (Beheer en Support). */
  supportOrganizations: string[];
  contactpersonen: Contactpersoon[];
  links: LinkUrls;
};

/** Per Orbit-klant-id, bijvoorbeeld "CL4KKKRQSAXN7GK". */
export type AlleAccountGegevens = Record<string, AccountGegevens>;

export const LEGE_GEGEVENS: AccountGegevens = {
  jiraKeys: [],
  supportOrganizations: [],
  contactpersonen: [],
  links: {},
};

export type GegevensResult = {
  gegevens: AlleAccountGegevens;
  /** Waarom ophalen mislukte; de gegevens zijn dan de laatst bekende, of leeg. */
  fout: string | null;
};

const SLEUTEL = "superhuman:accountgegevens:v1";
const CACHE_MS = 24 * 60 * 60 * 1000;

function melding(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Uit Superhuman, met een cache van een dag. */
export async function readAccountGegevens(): Promise<GegevensResult> {
  const hit = lees<AlleAccountGegevens>(SLEUTEL);
  if (hit && vers(hit.opgehaald, CACHE_MS)) {
    return { gegevens: hit.waarde, fout: null };
  }
  try {
    const gegevens = await fetchTabel();
    bewaar(SLEUTEL, gegevens);
    return { gegevens, fout: null };
  } catch (error) {
    return { gegevens: hit?.waarde ?? {}, fout: melding(error) };
  }
}

/** Haalt bij de volgende keer opnieuw op; tot dan blijft alles staan. */
export function clearAccountGegevensCache(): void {
  const hit = lees<AlleAccountGegevens>(SLEUTEL);
  if (hit) bewaar(SLEUTEL, hit.waarde, 0);
}

/**
 * Slaat één account op in Superhuman en meteen in de cache, zodat de app de
 * wijziging toont terwijl Superhuman hem nog verwerkt.
 */
export async function saveAccountGegevens(
  orbitId: string,
  klant: string,
  gegevens: AccountGegevens,
): Promise<void> {
  await saveRij(orbitId, klant, gegevens);
  const hit = lees<AlleAccountGegevens>(SLEUTEL);
  if (hit) {
    bewaar(SLEUTEL, { ...hit.waarde, [orbitId]: gegevens }, hit.opgehaald);
  }
}
