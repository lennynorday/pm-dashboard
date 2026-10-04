import { config } from "@/config/accounts";
import {
  JiraIssue,
  JiraNotConfiguredError,
  searchIssues,
  StatusCategory,
} from "./client";

export const SPRINT_BAKKEN = ["actief", "gepland", "backlog"] as const;
export type SprintBak = (typeof SPRINT_BAKKEN)[number];

export type Telling = { aantal: number; url: string };

export type StatusAantal = {
  status: string;
  categorie: StatusCategory;
  aantal: number;
  perBak: Record<SprintBak, number>;
  url: string;
};

export type ActieveSprint = { naam: string; einddatum: string | null };

export type JiraOverzicht = {
  key: string;
  boardUrl: string;
  totaal: Telling;
  perBak: Record<SprintBak, Telling>;
  actieveSprints: ActieveSprint[];
  perStatus: StatusAantal[];
  openBugs: Telling;
  opQa: Telling;
  fetchedAt: Date;
};

export type SupportOverzicht = {
  organizations: string[];
  open: Telling;
  fetchedAt: Date;
};

export type JiraResult<T> =
  | { status: "ok"; data: T }
  | { status: "niet-ingesteld" }
  | { status: "fout"; message: string };

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { issues: JiraIssue[]; fetchedAt: Date }>();

export function clearJiraCache(): void {
  cache.clear();
}

async function cachedSearch(
  jql: string,
): Promise<{ issues: JiraIssue[]; fetchedAt: Date }> {
  const hit = cache.get(jql);
  if (hit && Date.now() - hit.fetchedAt.getTime() < CACHE_MS) return hit;
  const entry = { issues: await searchIssues(jql), fetchedAt: new Date() };
  cache.set(jql, entry);
  return entry;
}

async function toResult<T>(load: () => Promise<T>): Promise<JiraResult<T>> {
  try {
    return { status: "ok", data: await load() };
  } catch (error) {
    if (error instanceof JiraNotConfiguredError)
      return { status: "niet-ingesteld" };
    const message = error instanceof Error ? error.message : String(error);
    return { status: "fout", message };
  }
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function jqlUrl(jql: string): string {
  return `${config.jiraSite}/issues/?jql=${encodeURIComponent(jql)}`;
}

const CATEGORY_ORDER: StatusCategory[] = ["new", "indeterminate", "done"];

const BAK_JQL: Record<SprintBak, string> = {
  actief: "sprint in openSprints()",
  gepland: "sprint in futureSprints() AND sprint not in openSprints()",
  backlog:
    "(sprint is EMPTY OR (sprint not in openSprints() AND sprint not in futureSprints()))",
};

type BakVan = (issue: JiraIssue) => SprintBak;

/**
 * Deelt tickets in volgens Jira's eigen zoekopdrachten voor sprints. Het
 * sprintveld in een ticket kan een sprint als actief tonen die Jira niet meer
 * als lopend ziet; zo komen de aantallen overeen met de links naar Jira.
 */
function bakIndeling(actief: JiraIssue[], gepland: JiraIssue[]): BakVan {
  const actiefKeys = new Set(actief.map((issue) => issue.key));
  const geplandKeys = new Set(gepland.map((issue) => issue.key));
  return (issue) => {
    if (actiefKeys.has(issue.key)) return "actief";
    if (geplandKeys.has(issue.key)) return "gepland";
    return "backlog";
  };
}

function countPerBak(
  issues: JiraIssue[],
  bakVan: BakVan,
): Record<SprintBak, number> {
  return {
    actief: issues.filter((issue) => bakVan(issue) === "actief").length,
    gepland: issues.filter((issue) => bakVan(issue) === "gepland").length,
    backlog: issues.filter((issue) => bakVan(issue) === "backlog").length,
  };
}

/** Lopende sprints van de tickets die Jira in een open sprint ziet. */
function actieveSprints(actief: JiraIssue[]): ActieveSprint[] {
  const sprints = actief
    .flatMap((issue) => issue.sprints)
    .filter((sprint) => sprint.state === "active");
  const namen = [...new Set(sprints.map((sprint) => sprint.name))];
  return namen.map((naam) => ({
    naam,
    einddatum: sprints.find((sprint) => sprint.name === naam)?.endDate ?? null,
  }));
}

function perStatus(
  issues: JiraIssue[],
  baseJql: string,
  bakVan: BakVan,
): StatusAantal[] {
  const statuses = [...new Set(issues.map((issue) => issue.status))];
  return statuses
    .map((status) => {
      const matching = issues.filter((issue) => issue.status === status);
      return {
        status,
        categorie: matching[0].statusCategory,
        aantal: matching.length,
        perBak: countPerBak(matching, bakVan),
        url: jqlUrl(`${baseJql} AND status = ${quote(status)}`),
      };
    })
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.categorie) -
          CATEGORY_ORDER.indexOf(b.categorie) || b.aantal - a.aantal,
    );
}

function perBakTellingen(
  issues: JiraIssue[],
  baseJql: string,
  bakVan: BakVan,
): Record<SprintBak, Telling> {
  const aantallen = countPerBak(issues, bakVan);
  const telling = (bak: SprintBak): Telling => ({
    aantal: aantallen[bak],
    url: jqlUrl(`${baseJql} AND ${BAK_JQL[bak]}`),
  });
  return {
    actief: telling("actief"),
    gepland: telling("gepland"),
    backlog: telling("backlog"),
  };
}

/** Open tickets van één Jira-project, samengevat. */
export function fetchJiraOverzicht(
  key: string,
): Promise<JiraResult<JiraOverzicht>> {
  return toResult(async () => {
    const baseJql = `project = ${quote(key)} AND statusCategory != Done`;
    const [alle, actief, gepland] = await Promise.all([
      cachedSearch(baseJql),
      cachedSearch(`${baseJql} AND ${BAK_JQL.actief}`),
      cachedSearch(`${baseJql} AND ${BAK_JQL.gepland}`),
    ]);
    const issues = alle.issues;
    const bakVan = bakIndeling(actief.issues, gepland.issues);
    const qa = config.jiraQaStatussen;
    return {
      key,
      boardUrl: `${config.jiraSite}/browse/${encodeURIComponent(key)}`,
      totaal: { aantal: issues.length, url: jqlUrl(baseJql) },
      perBak: perBakTellingen(issues, baseJql, bakVan),
      actieveSprints: actieveSprints(actief.issues),
      perStatus: perStatus(issues, baseJql, bakVan),
      openBugs: {
        aantal: issues.filter((issue) => issue.type === "Bug").length,
        url: jqlUrl(`${baseJql} AND issuetype = Bug`),
      },
      opQa: {
        aantal: issues.filter((issue) => qa.includes(issue.status)).length,
        url: jqlUrl(`${baseJql} AND status in (${qa.map(quote).join(", ")})`),
      },
      fetchedAt: alle.fetchedAt,
    };
  });
}

/** Open supporttickets in SUPP voor de Organizations van een account. */
export function fetchSupportOverzicht(
  organizations: string[],
): Promise<JiraResult<SupportOverzicht>> {
  return toResult(async () => {
    const jql = `project = SUPP AND statusCategory != Done AND Organizations in (${organizations
      .map(quote)
      .join(", ")})`;
    const { issues, fetchedAt } = await cachedSearch(jql);
    return {
      organizations,
      open: { aantal: issues.length, url: jqlUrl(jql) },
      fetchedAt,
    };
  });
}
