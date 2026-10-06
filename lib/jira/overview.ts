import { config } from "@/config/dashboard";
import {
  findBoardId,
  JiraIssue,
  JiraNietVerbondenError,
  searchIssues,
} from "./client";
import { currentUser } from "@/lib/session";

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
  /** Open tickets waarbij de bal bij Norday ligt. */
  opNorday: Telling;
  /** Nog geen eerste reactie: voor de projectmanager om op te pakken. */
  eersteReactie: Telling;
  wachtOpKlant: Telling;
  /** In een sprint of on hold. */
  overig: Telling;
  perStatus: StatusTelling[];
  fetchedAt: Date;
};

export type JiraResult<T> =
  | { status: "ok"; data: T }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { issues: JiraIssue[]; fetchedAt: Date }>();

export function clearJiraCache(): void {
  cache.clear();
  boards.clear();
}

/** De cache is per gebruiker: ieder ziet alleen wat de eigen Jira-rechten toestaan. */
async function cachedSearch(
  email: string,
  jql: string,
): Promise<{ issues: JiraIssue[]; fetchedAt: Date }> {
  const key = JSON.stringify([email, jql]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt.getTime() < CACHE_MS) return hit;
  const entry = {
    issues: await searchIssues(email, jql),
    fetchedAt: new Date(),
  };
  cache.set(key, entry);
  return entry;
}

async function toResult<T>(load: () => Promise<T>): Promise<JiraResult<T>> {
  try {
    return { status: "ok", data: await load() };
  } catch (error) {
    if (error instanceof JiraNietVerbondenError)
      return { status: "niet-verbonden" };
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
async function cachedBoardId(
  email: string,
  key: string,
): Promise<number | null> {
  const cacheKey = JSON.stringify([email, key]);
  if (!boards.has(cacheKey)) {
    boards.set(cacheKey, await findBoardId(email, key));
  }
  return boards.get(cacheKey) ?? null;
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
function fetchJiraOverzicht(
  email: string,
  key: string,
): Promise<JiraResult<JiraOverzicht>> {
  return toResult(async () => {
    const baseJql = `project = ${quote(key)} AND statusCategory != Done`;
    const [[actief, gepland, backlog], boardId] = await Promise.all([
      Promise.all(
        SPRINT_BAKKEN.map((bak) =>
          cachedSearch(email, `${baseJql} AND ${BAK_JQL[bak]}`),
        ),
      ),
      cachedBoardId(email, key),
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

/**
 * ponytail: status-id's uit de SUPP-workflow; pas aan als die workflow verandert.
 * 12090 Waiting for first response, 11801 Wachtend op support, 12200 Response from customer.
 */
const WACHT_OP_NORDAY = ["12090", "11801", "12200"];
const EERSTE_REACTIE = "12090";
/** 11802 Wachtend op klant. */
const WACHT_OP_KLANT = "11802";

/** Open supporttickets in SUPP voor de Organizations van een account. */
function fetchSupportOverzicht(
  email: string,
  organizations: string[],
): Promise<JiraResult<SupportOverzicht>> {
  return toResult(async () => {
    const jql = `project = SUPP AND statusCategory != Done AND Organizations in (${organizations
      .map(quote)
      .join(", ")})`;
    const { issues, fetchedAt } = await cachedSearch(email, jql);
    const statusIds = [...new Set(issues.map((issue) => issue.statusId))];
    const telling = (ids: string[], filter: string): Telling => ({
      aantal: issues.filter((issue) => ids.includes(issue.statusId)).length,
      url: jqlUrl(`${jql} AND ${filter}`),
    });
    const bekend = [...WACHT_OP_NORDAY, WACHT_OP_KLANT];
    return {
      organizations,
      open: { aantal: issues.length, url: jqlUrl(jql) },
      opNorday: {
        aantal: issues.filter((issue) =>
          WACHT_OP_NORDAY.includes(issue.statusId),
        ).length,
        url: jqlUrl(`${jql} AND status in (${WACHT_OP_NORDAY.join(", ")})`),
      },
      eersteReactie: telling([EERSTE_REACTIE], `status = ${EERSTE_REACTIE}`),
      wachtOpKlant: telling([WACHT_OP_KLANT], `status = ${WACHT_OP_KLANT}`),
      overig: {
        aantal: issues.filter((issue) => !bekend.includes(issue.statusId))
          .length,
        url: jqlUrl(`${jql} AND status not in (${bekend.join(", ")})`),
      },
      perStatus: statusIds
        .map((statusId) => {
          const metStatus = issues.filter(
            (issue) => issue.statusId === statusId,
          );
          return {
            status: metStatus[0].status,
            aantal: metStatus.length,
            url: jqlUrl(`${jql} AND status = ${statusId}`),
          };
        })
        .sort((a, b) => b.aantal - a.aantal),
      fetchedAt,
    };
  });
}

export type AccountJira = {
  jira: { key: string; result: JiraResult<JiraOverzicht> }[];
  /** null: geen Organization in SUPP ingesteld. */
  support: JiraResult<SupportOverzicht> | null;
};

/** Jira-projecten en support van één account, met de Jira-rechten van de gebruiker. */
export async function fetchAccountJira(account: {
  jiraKeys: string[];
  supportOrganizations: string[];
}): Promise<AccountJira> {
  const email = (await currentUser())?.email ?? "";
  const [jira, support] = await Promise.all([
    Promise.all(
      account.jiraKeys.map(async (key) => ({
        key,
        result: await fetchJiraOverzicht(email, key),
      })),
    ),
    account.supportOrganizations.length > 0
      ? fetchSupportOverzicht(email, account.supportOrganizations)
      : null,
  ]);
  return { jira, support };
}
