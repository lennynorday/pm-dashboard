import { cache } from "react";
import { config } from "@/config/dashboard";
import {
  AccountGegevens,
  AlleAccountGegevens,
  Contactpersoon,
  LEGE_GEGEVENS,
  readAccountGegevens,
} from "./accountgegevens";
import { readHiddenProjects } from "./hidden-projects";
import { Link, toLink } from "./links";
import { CULTURE_FOLDER_ID } from "./orbit/config";
import { fetchProjects, OrbitProject, ProjectState } from "./orbit/projects";
import { currentUser } from "./session";

export type Zichtbaarheid = "zichtbaar" | "verborgen";

export type Project = {
  number: string;
  naam: string;
  accountSlug: string;
  accountNaam: string;
  status: ProjectState;
  einddatum: string | null;
  jiraKeys: string[];
  zichtbaarheid: Zichtbaarheid;
};

export type Account = {
  slug: string;
  naam: string;
  /** Ik ben eigenaar van minstens één open project van dit account. */
  mijn: boolean;
  jiraKeys: string[];
  supportOrganizations: string[];
  am: string | null;
  contactpersonen: Contactpersoon[];
  links: Link[];
  projecten: Project[];
};

export type Dashboard =
  | { status: "ok"; accounts: Account[]; fetchedAt: Date }
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

function toProject(
  orbit: OrbitProject,
  hidden: string[],
  gegevens: AlleAccountGegevens,
): Project {
  const accountSlug = slugify(orbit.client);
  const accountConfig = gegevens[accountSlug] ?? LEGE_GEGEVENS;
  return {
    number: orbit.number,
    naam: orbit.name,
    accountSlug,
    accountNaam: accountConfig.naam || displayName(orbit.client),
    status: orbit.state,
    einddatum: orbit.endDate,
    jiraKeys: accountConfig.jiraKeys,
    zichtbaarheid: hidden.includes(orbit.number) ? "verborgen" : "zichtbaar",
  };
}

function toAccount(
  slug: string,
  projecten: Project[],
  mijn: boolean,
  accountConfig: AccountGegevens,
): Account {
  return {
    slug,
    naam: projecten[0].accountNaam,
    mijn,
    jiraKeys: accountConfig.jiraKeys,
    supportOrganizations: accountConfig.supportOrganizations,
    am: accountConfig.am ?? null,
    contactpersonen: accountConfig.contactpersonen,
    links: accountConfig.links.map(toLink),
    projecten: [...projecten].sort((a, b) =>
      a.naam.localeCompare(b.naam, "nl"),
    ),
  };
}

/**
 * Bouwt de accounts op uit mijn projecten, de Culture-projecten en de
 * accountgegevens.
 * Een project dat in beide lijsten staat, telt één keer.
 */
export function buildAccounts(
  mine: OrbitProject[],
  culture: OrbitProject[],
  hidden: string[],
  gegevens: AlleAccountGegevens,
): Account[] {
  const mijnNummers = new Set(mine.map((orbit) => orbit.number));
  const projecten = [
    ...mine,
    ...culture.filter((orbit) => !mijnNummers.has(orbit.number)),
  ].map((orbit) => toProject(orbit, hidden, gegevens));
  const slugs = [...new Set(projecten.map((project) => project.accountSlug))];
  return slugs
    .map((slug) => {
      const vanAccount = projecten.filter(
        (project) => project.accountSlug === slug,
      );
      return toAccount(
        slug,
        vanAccount,
        vanAccount.some((project) => mijnNummers.has(project.number)),
        gegevens[slug] ?? LEGE_GEGEVENS,
      );
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
  return {
    status: "ok",
    accounts: buildAccounts(
      mine.projects,
      culture.projects,
      hidden,
      readAccountGegevens(),
    ),
    fetchedAt:
      mine.fetchedAt < culture.fetchedAt ? mine.fetchedAt : culture.fetchedAt,
  };
});
