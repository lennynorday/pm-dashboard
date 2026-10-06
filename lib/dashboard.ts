import { cache } from "react";
import { config } from "@/config/dashboard";
import {
  AccountGegevens,
  AlleAccountGegevens,
  Contactpersoon,
  KlantVelden,
  LEEG_PLATFORM,
  PlatformGegevens,
  readAccountGegevens,
} from "./accountgegevens";
import { readHiddenProjects } from "./hidden-projects";
import { Link, toLinks } from "./links";
import { CULTURE_FOLDER_ID } from "./orbit/config";
import { fetchKlantIds } from "./orbit/klanten";
import { fetchProjects, OrbitProject, ProjectState } from "./orbit/projects";
import { currentUser } from "./session";

export type Zichtbaarheid = "zichtbaar" | "verborgen";

export type Project = {
  number: string;
  naam: string;
  platformSlug: string;
  platformNaam: string;
  status: ProjectState;
  einddatum: string | null;
  /** De projectverantwoordelijke in Orbit. */
  eigenaar: string;
  jiraKeys: string[];
  zichtbaarheid: Zichtbaarheid;
  /** Ik ben de eigenaar in Orbit. */
  mijn: boolean;
};

/** Een klant uit Orbit; heeft geen eigen pagina, maar wel een of meer platforms. */
export type Klant = {
  /** Het klant-id in Orbit; null als Orbit de klant niet kon vinden. */
  orbitId: string | null;
  naam: string;
  /** De klantnaam zoals Orbit die kent, ook als er een kortere naam is ingevuld. */
  orbitNaam: string;
  am: string | null;
  /** Zoals in Superhuman, om te bewerken. */
  velden: KlantVelden;
};

/** Een website van een klant: wat een PM beheert. */
export type Platform = {
  slug: string;
  naam: string;
  /** Zoals in Superhuman; leeg als het platform daar nog niet staat. */
  gegevens: PlatformGegevens;
  klant: Klant;
  /** De eigenaars van de projecten in Orbit. */
  pms: string[];
  /** Ik ben eigenaar van minstens één open project van dit platform. */
  mijn: boolean;
  jiraKeys: string[];
  supportOrganizations: string[];
  contactpersonen: Contactpersoon[];
  links: Link[];
  projecten: Project[];
};

export type Dashboard =
  | {
      status: "ok";
      platforms: Platform[];
      fetchedAt: Date;
      /** Waarom de accountgegevens uit Superhuman niet zijn opgehaald. */
      gegevensFout: string | null;
    }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Maakt van een Orbit-klantnaam een leesbare accountnaam. */
export function displayName(client: string): string {
  const trimmed = client.trim();
  const cased =
    trimmed === trimmed.toUpperCase()
      ? trimmed
          .toLowerCase()
          .replace(/(^|[\s(-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
      : trimmed;
  const stripped = cased
    .replace(/^stichting\s+(tot\s+beheer\s+)?/i, "")
    .replace(/\s+(b\.?v\.?|n\.?v\.?)$/i, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function orbitProjectUrl(number: string): string {
  return `${config.orbitSite}/project/${encodeURIComponent(number)}`;
}

/** Bij welk platform een project hoort; null als het niet gekoppeld is. */
export function platformVan(
  number: string,
  platforms: PlatformGegevens[],
): PlatformGegevens | null {
  if (platforms.length === 1) return platforms[0];
  return platforms.find((item) => item.orbitProjecten.includes(number)) ?? null;
}

/** Uniek in de hele lijst; bij een dubbele naam komt de klant ervoor. */
function uniekeSlug(naam: string, klant: string, bezet: Set<string>): string {
  const slug = slugify(naam);
  return bezet.has(slug) ? slugify(`${klant} ${naam}`) : slug;
}

/**
 * Bouwt de platforms op uit mijn projecten, de Culture-projecten en de
 * accountgegevens. Een project dat in beide lijsten staat, telt één keer.
 * Een project van een klant met meer platforms dat niet gekoppeld is, staat
 * op geen enkel platform.
 */
export function buildPlatforms(
  mine: OrbitProject[],
  culture: OrbitProject[],
  hidden: string[],
  gegevens: AlleAccountGegevens,
  klantIds: Map<string, string>,
): Platform[] {
  const mijnNummers = new Set(mine.map((orbit) => orbit.number));
  const orbitProjecten = [
    ...mine,
    ...culture.filter((orbit) => !mijnNummers.has(orbit.number)),
  ];
  const klantNamen = [...new Set(orbitProjecten.map((orbit) => orbit.client))];
  const bezet = new Set<string>();

  return klantNamen
    .flatMap((orbitKlant) => {
      const orbitId = klantIds.get(orbitKlant) ?? null;
      const account: AccountGegevens = (orbitId && gegevens[orbitId]) || {
        platforms: [],
      };
      const klant: Klant = {
        orbitId,
        naam: account.naam || displayName(orbitKlant),
        orbitNaam: displayName(orbitKlant),
        am: account.am ?? null,
        velden: { naam: account.naam, am: account.am },
      };
      const platforms =
        account.platforms.length > 0 ? account.platforms : [LEEG_PLATFORM];
      const vanKlant = orbitProjecten.filter(
        (orbit) => orbit.client === orbitKlant,
      );

      return platforms.map((platform): Platform => {
        const naam = platform.naam || klant.naam;
        const slug = uniekeSlug(naam, klant.naam, bezet);
        bezet.add(slug);
        const projecten = vanKlant
          .filter((orbit) => platformVan(orbit.number, platforms) === platform)
          .map((orbit): Project => ({
            number: orbit.number,
            naam: orbit.name,
            platformSlug: slug,
            platformNaam: naam,
            status: orbit.state,
            einddatum: orbit.endDate,
            eigenaar: orbit.owner,
            jiraKeys: platform.jiraKeys,
            zichtbaarheid: hidden.includes(orbit.number)
              ? "verborgen"
              : "zichtbaar",
            mijn: mijnNummers.has(orbit.number),
          }))
          .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
        return {
          slug,
          naam,
          gegevens: platform,
          klant,
          pms: [...new Set(projecten.map((project) => project.eigenaar))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "nl")),
          mijn: projecten.some((project) => project.mijn),
          jiraKeys: platform.jiraKeys,
          supportOrganizations: platform.supportOrganizations,
          contactpersonen: platform.contactpersonen,
          links: toLinks(platform.links),
          projecten,
        };
      });
    })
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

/** Eén keer per request, ook al vragen layout en pagina het allebei op. */
export const loadDashboard = cache(async (): Promise<Dashboard> => {
  const user = await currentUser();
  if (!user) return { status: "niet-verbonden" };
  const [mine, culture] = await Promise.all([
    fetchProjects(user.email, { mine: true }),
    fetchProjects(user.email, { folderId: CULTURE_FOLDER_ID }),
  ]);
  const hidden = readHiddenProjects(user.email);
  if (mine.status !== "ok") return mine;
  if (culture.status !== "ok") return culture;
  const klantIds = await fetchKlantIds(
    user.email,
    [...mine.projects, ...culture.projects].map((orbit) => orbit.client),
  );
  const { gegevens, fout } = await readAccountGegevens();
  return {
    status: "ok",
    platforms: buildPlatforms(
      mine.projects,
      culture.projects,
      hidden,
      gegevens,
      klantIds,
    ),
    fetchedAt:
      mine.fetchedAt < culture.fetchedAt ? mine.fetchedAt : culture.fetchedAt,
    gegevensFout: fout,
  };
});
