import { bewaar, lees, vers } from "./db";
import type { EigenLink, LinkUrls } from "./links";
import { fetchTabel, saveKoppelingRijen, savePlatformRij } from "./superhuman";

export type Contactpersoon = {
  naam: string;
  rol?: string;
  email?: string;
};

/** Wat per klant geldt, voor al zijn platforms. */
export type KlantVelden = {
  /** Leeg: de naam uit Orbit. */
  naam?: string;
  am?: string;
  /** Projectnummers die bij de hele klant horen, niet bij een platform. */
  zonderPlatform: string[];
};

/** Wat Orbit niet weet over een platform; één rij in de tabel in Superhuman. */
export type PlatformGegevens = {
  /** Het id van de rij; ontbreekt zolang het platform niet in Superhuman staat. */
  rijId?: string;
  /** Leeg: de naam van de klant. */
  naam: string;
  /** Projectnummers in Orbit; alleen nodig bij een klant met meer platforms. */
  orbitProjecten: string[];
  /** Jira-projecten van dit platform. */
  jiraKeys: string[];
  /** Organizations in SUPP (Beheer en Support). */
  supportOrganizations: string[];
  contactpersonen: Contactpersoon[];
  links: LinkUrls;
  /** Hooguit vier, met een eigen naam; de groep Overig op de platformpagina. */
  eigenLinks: EigenLink[];
};

export type AccountGegevens = KlantVelden & { platforms: PlatformGegevens[] };

export const LEGE_KLANT: KlantVelden = { zonderPlatform: [] };

/** Per Orbit-klant-id, bijvoorbeeld "CL4KKKRQSAXN7GK". */
export type AlleAccountGegevens = Record<string, AccountGegevens>;

/** Een klant zonder rij in Superhuman heeft één platform met de naam van de klant. */
export const LEEG_PLATFORM: PlatformGegevens = {
  naam: "",
  orbitProjecten: [],
  jiraKeys: [],
  supportOrganizations: [],
  contactpersonen: [],
  links: {},
  eigenLinks: [],
};

export type GegevensResult = {
  gegevens: AlleAccountGegevens;
  /** Waarom ophalen mislukte; de gegevens zijn dan de laatst bekende, of leeg. */
  fout: string | null;
};

const SLEUTEL = "superhuman:accountgegevens:v4";
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
 * Slaat één platform op in Superhuman en meteen in de cache, zodat de app de
 * wijziging toont terwijl Superhuman hem nog verwerkt. `vorigeNaam` wijst het
 * platform aan dat wordt bijgewerkt; null voegt een platform toe.
 */
export async function savePlatformGegevens(
  orbitId: string,
  klant: string,
  velden: KlantVelden,
  platform: PlatformGegevens,
  vorigeNaam: string | null,
): Promise<void> {
  const hit = lees<AlleAccountGegevens>(SLEUTEL);
  const huidige = hit?.waarde[orbitId]?.platforms ?? [];
  const isDit = (item: PlatformGegevens) =>
    vorigeNaam !== null && item.naam === vorigeNaam;
  const andere = huidige.filter((item) => !isDit(item));
  await savePlatformRij(
    orbitId,
    klant,
    velden,
    platform,
    andere.flatMap((item) => (item.rijId ? [item.rijId] : [])),
  );
  if (hit) {
    const platforms = huidige.some(isDit)
      ? huidige.map((item) => (isDit(item) ? platform : item))
      : [...huidige, platform];
    bewaar(
      SLEUTEL,
      { ...hit.waarde, [orbitId]: { ...velden, platforms } },
      hit.opgehaald,
    );
  }
}

/**
 * Slaat op bij welk platform elk project van een klant hoort, in Superhuman en
 * meteen in de cache.
 */
export async function saveKoppelingen(
  orbitId: string,
  klant: string,
  velden: KlantVelden,
  platforms: PlatformGegevens[],
): Promise<void> {
  await saveKoppelingRijen(orbitId, klant, velden, platforms);
  const hit = lees<AlleAccountGegevens>(SLEUTEL);
  if (hit) {
    bewaar(
      SLEUTEL,
      { ...hit.waarde, [orbitId]: { ...velden, platforms } },
      hit.opgehaald,
    );
  }
}
