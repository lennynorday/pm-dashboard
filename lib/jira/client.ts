import { validToken } from "@/lib/koppelingen";
import { parseJiraToken, refreshJiraToken } from "./oauth";

export const SPRINT_STATES = ["active", "future", "closed"] as const;
export type SprintState = (typeof SPRINT_STATES)[number];

export type JiraSprint = {
  name: string;
  state: SprintState;
  endDate: string | null;
  boardId: number | null;
};

export type JiraIssue = {
  key: string;
  status: string;
  /** Gebruik het id in JQL: de naam is vertaald in de taal van de gebruiker. */
  statusId: string;
  sprints: JiraSprint[];
};

/** Het Sprint-veld in deze Jira-omgeving. */
const SPRINT_FIELD = "customfield_10003";

/** De gebruiker heeft Jira niet verbonden, of de koppeling is verlopen of ingetrokken. */
export class JiraNietVerbondenError extends Error {
  constructor() {
    super("Niet verbonden met Jira");
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function parseSprint(data: unknown): JiraSprint | null {
  const sprint = record(data);
  const state = SPRINT_STATES.find((item) => item === sprint.state);
  if (typeof sprint.name !== "string" || !state) return null;
  return {
    name: sprint.name,
    state,
    endDate: typeof sprint.endDate === "string" ? sprint.endDate : null,
    boardId: typeof sprint.boardId === "number" ? sprint.boardId : null,
  };
}

/** Parst één issue uit de Jira-zoekresultaten; issues zonder key worden overgeslagen. */
function parseIssue(data: unknown): JiraIssue | null {
  const issue = record(data);
  if (typeof issue.key !== "string") return null;
  const fields = record(issue.fields);
  const { name: status, id: statusId } = record(fields.status);
  const sprints = fields[SPRINT_FIELD];
  return {
    key: issue.key,
    status: typeof status === "string" ? status : "Onbekend",
    statusId: typeof statusId === "string" ? statusId : "",
    sprints: (Array.isArray(sprints) ? sprints : [])
      .map(parseSprint)
      .filter((sprint): sprint is JiraSprint => sprint !== null),
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

async function postSearch(
  email: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await validToken(
    email,
    "jira",
    parseJiraToken,
    refreshJiraToken,
  );
  if (!token) throw new JiraNietVerbondenError();
  const url = `https://api.atlassian.com/ex/jira/${encodeURIComponent(token.cloudId)}/rest/api/3/search/jql`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: ["status", SPRINT_FIELD], ...body }),
    cache: "no-store",
  });
  if (response.status === 401) throw new JiraNietVerbondenError();
  if (!response.ok) {
    throw new Error(`Jira gaf status ${response.status}`);
  }
  return record(await response.json());
}

function parseIssues(data: Record<string, unknown>): JiraIssue[] {
  const issues = Array.isArray(data.issues) ? data.issues : [];
  return issues
    .map(parseIssue)
    .filter((issue): issue is JiraIssue => issue !== null);
}

/** Haalt alle issues op die bij de JQL horen, met alleen status en sprints. */
export async function searchIssues(
  email: string,
  jql: string,
): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await postSearch(email, {
      jql,
      maxResults: PAGE_SIZE,
      nextPageToken,
    });
    issues.push(...parseIssues(data));
    if (data.isLast !== false || typeof data.nextPageToken !== "string")
      return issues;
    nextPageToken = data.nextPageToken;
  }
  return issues;
}

/** Het board van een Jira-project, afgeleid uit de sprint van een recent ticket. */
export async function findBoardId(
  email: string,
  key: string,
): Promise<number | null> {
  const data = await postSearch(email, {
    jql: `project = "${key.replace(/"/g, '\\"')}" AND sprint is not EMPTY ORDER BY updated DESC`,
    maxResults: 1,
  });
  const sprint = parseIssues(data)[0]?.sprints.find(
    (item) => item.boardId !== null,
  );
  return sprint?.boardId ?? null;
}
