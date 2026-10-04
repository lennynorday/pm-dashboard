import { config } from "@/config/accounts";
import {
  findBoardId,
  JiraIssue,
  JiraNotConfiguredError,
  searchIssues,
} from "./client";

export const SPRINT_BAKKEN = ["actief", "gepland", "backlog"] as const;
export type SprintBak = (typeof SPRINT_BAKKEN)[number];

export type Telling = { aantal: number; url: string };

export type ActieveSprint = { naam: string; einddatum: string | null };

export type JiraOverzicht = {
  key: string;
  boardUrl: string;
  perBak: Record<SprintBak, Telling>;
  actieveSprints: ActieveSprint[];
  fetchedAt: Date;
};

export type StatusTelling = Telling & { status: string };

export type SupportOverzicht = {
  organizations: string[];
  open: Telling;
  perStatus: StatusTelling[];
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

function jqlUrl(jql: string): string {
  return `${config.jiraSite}/issues/?jql=${encodeURIComponent(jql)}`;
}

/**
 * De bakken volgen Jira's eigen zoekopdrachten voor sprints. Het sprintveld in
 * een ticket kan een sprint als actief tonen die Jira niet meer als lopend ziet;
 * zo komen de aantallen overeen met de links naar Jira.
 */
const BAK_JQL: Record<SprintBak, string> = {
  actief: "sprint in openSprints()",
  gepland: "sprint in futureSprints() AND sprint not in openSprints()",
  backlog:
    "(sprint is EMPTY OR (sprint not in openSprints() AND sprint not in futureSprints()))",
};

const boards = new Map<string, number | null>();

/** Het board blijft gelijk, dus dit hoeft maar één keer per project. */
async function cachedBoardId(key: string): Promise<number | null> {
  if (!boards.has(key)) boards.set(key, await findBoardId(key));
  return boards.get(key) ?? null;
}

type BoardLinks = { board: string; backlog: string };

/** Links naar het board en de backlog van een team-managed project. */
function boardLinks(key: string, boardId: number): BoardLinks {
  const board = `${config.jiraSite}/jira/software/projects/${encodeURIComponent(key)}/boards/${boardId}`;
  return { board, backlog: `${board}/backlog` };
}

/**
 * Actieve sprint linkt naar het board, gepland en backlog naar de backlogpagina.
 * Jira heeft geen ankers per onderdeel van de backlog. Zonder board vallen we
 * terug op een zoekopdracht in Jira.
 */
function bakUrl(bak: SprintBak, links: BoardLinks | null, jql: string): string {
  if (!links) return jqlUrl(jql);
  if (bak === "actief") return links.board;
  return links.backlog;
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

/** Open tickets van één Jira-project, verdeeld over actieve sprint, gepland en backlog. */
export function fetchJiraOverzicht(
  key: string,
): Promise<JiraResult<JiraOverzicht>> {
  return toResult(async () => {
    const baseJql = `project = ${quote(key)} AND statusCategory != Done`;
    const [[actief, gepland, backlog], boardId] = await Promise.all([
      Promise.all(
        SPRINT_BAKKEN.map((bak) =>
          cachedSearch(`${baseJql} AND ${BAK_JQL[bak]}`),
        ),
      ),
      cachedBoardId(key),
    ]);
    const links = boardId === null ? null : boardLinks(key, boardId);
    const telling = (bak: SprintBak, issues: JiraIssue[]): Telling => ({
      aantal: issues.length,
      url: bakUrl(bak, links, `${baseJql} AND ${BAK_JQL[bak]}`),
    });
    return {
      key,
      boardUrl:
        links?.board ?? `${config.jiraSite}/browse/${encodeURIComponent(key)}`,
      perBak: {
        actief: telling("actief", actief.issues),
        gepland: telling("gepland", gepland.issues),
        backlog: telling("backlog", backlog.issues),
      },
      actieveSprints: actieveSprints(actief.issues),
      fetchedAt: actief.fetchedAt,
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
    const statuses = [...new Set(issues.map((issue) => issue.status))];
    return {
      organizations,
      open: { aantal: issues.length, url: jqlUrl(jql) },
      perStatus: statuses
        .map((status) => ({
          status,
          aantal: issues.filter((issue) => issue.status === status).length,
          url: jqlUrl(`${jql} AND status = ${quote(status)}`),
        }))
        .sort((a, b) => b.aantal - a.aantal),
      fetchedAt,
    };
  });
}
