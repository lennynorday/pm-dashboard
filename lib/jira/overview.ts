import { config } from "@/config/accounts";
import {
  JiraIssue,
  JiraNotConfiguredError,
  searchIssues,
  StatusCategory,
} from "./client";

export type StatusAantal = {
  status: string;
  categorie: StatusCategory;
  aantal: number;
  url: string;
};

export type JiraOverzicht = {
  key: string;
  boardUrl: string;
  totaal: { aantal: number; url: string };
  perStatus: StatusAantal[];
  openBugs: { aantal: number; url: string };
  opQa: { aantal: number; url: string };
  fetchedAt: Date;
};

export type SupportOverzicht = {
  organizations: string[];
  open: { aantal: number; url: string };
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

function perStatus(issues: JiraIssue[], baseJql: string): StatusAantal[] {
  const statuses = [...new Set(issues.map((issue) => issue.status))];
  return statuses
    .map((status) => {
      const matching = issues.filter((issue) => issue.status === status);
      return {
        status,
        categorie: matching[0].statusCategory,
        aantal: matching.length,
        url: jqlUrl(`${baseJql} AND status = ${quote(status)}`),
      };
    })
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.categorie) -
          CATEGORY_ORDER.indexOf(b.categorie) || b.aantal - a.aantal,
    );
}

/** Open tickets van één Jira-project, samengevat. */
export function fetchJiraOverzicht(
  key: string,
): Promise<JiraResult<JiraOverzicht>> {
  return toResult(async () => {
    const baseJql = `project = ${quote(key)} AND statusCategory != Done`;
    const { issues, fetchedAt } = await cachedSearch(baseJql);
    const qa = config.jiraQaStatussen;
    return {
      key,
      boardUrl: `${config.jiraSite}/browse/${encodeURIComponent(key)}`,
      totaal: { aantal: issues.length, url: jqlUrl(baseJql) },
      perStatus: perStatus(issues, baseJql),
      openBugs: {
        aantal: issues.filter((issue) => issue.type === "Bug").length,
        url: jqlUrl(`${baseJql} AND issuetype = Bug`),
      },
      opQa: {
        aantal: issues.filter((issue) => qa.includes(issue.status)).length,
        url: jqlUrl(`${baseJql} AND status in (${qa.map(quote).join(", ")})`),
      },
      fetchedAt,
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
