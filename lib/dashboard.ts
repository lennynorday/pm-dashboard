import { config } from "@/config/accounts";
import type { Contactpersoon } from "@/config/types";
import { readHiddenProjects } from "./hidden-projects";
import { Link, toLink } from "./links";
import {
  BillingMode,
  fetchMyProjects,
  OrbitProject,
  ProjectState,
} from "./orbit/projects";

export type Zichtbaarheid = "zichtbaar" | "verborgen";

export type Project = {
  number: string;
  orbitId: string;
  naam: string;
  accountSlug: string;
  accountNaam: string;
  status: ProjectState;
  afrekenwijze: BillingMode | null;
  einddatum: string | null;
  jiraKeys: string[];
  links: Link[];
  zichtbaarheid: Zichtbaarheid;
};

export type Account = {
  slug: string;
  naam: string;
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

function toProject(orbit: OrbitProject, hidden: string[]): Project {
  const projectConfig = config.projecten[orbit.number] ?? {};
  const accountSlug = slugify(orbit.client);
  const accountConfig = config.accounts[accountSlug] ?? {};
  return {
    number: orbit.number,
    orbitId: orbit.id,
    naam: orbit.name,
    accountSlug,
    accountNaam: accountConfig.naam || displayName(orbit.client),
    status: orbit.state,
    afrekenwijze: orbit.billing,
    einddatum: orbit.endDate,
    jiraKeys: projectConfig.jiraKeys ?? accountConfig.jiraKeys ?? [],
    links: (projectConfig.links ?? []).map(toLink),
    zichtbaarheid: hidden.includes(orbit.number) ? "verborgen" : "zichtbaar",
  };
}

function toAccount(slug: string, projecten: Project[]): Account {
  const accountConfig = config.accounts[slug] ?? {};
  return {
    slug,
    naam: projecten[0].accountNaam,
    jiraKeys: accountConfig.jiraKeys ?? [],
    supportOrganizations: accountConfig.supportOrganizations ?? [],
    am: accountConfig.am || null,
    contactpersonen: accountConfig.contactpersonen ?? [],
    links: (accountConfig.links ?? []).map(toLink),
    projecten: [...projecten].sort((a, b) =>
      a.naam.localeCompare(b.naam, "nl"),
    ),
  };
}

/** Bouwt de accounts op uit de Orbit-projecten en de config. */
export function buildAccounts(
  orbitProjects: OrbitProject[],
  hidden: string[],
): Account[] {
  const projecten = orbitProjects.map((orbit) => toProject(orbit, hidden));
  const slugs = [...new Set(projecten.map((project) => project.accountSlug))];
  return slugs
    .map((slug) =>
      toAccount(
        slug,
        projecten.filter((project) => project.accountSlug === slug),
      ),
    )
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

export async function loadDashboard(): Promise<Dashboard> {
  const [result, hidden] = await Promise.all([
    fetchMyProjects(),
    readHiddenProjects(),
  ]);
  if (result.status !== "ok") return result;
  return {
    status: "ok",
    accounts: buildAccounts(result.projects, hidden),
    fetchedAt: result.fetchedAt,
  };
}
