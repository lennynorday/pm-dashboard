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
  sprints: JiraSprint[];
};

/** Het Sprint-veld in deze Jira-omgeving. */
const SPRINT_FIELD = "customfield_10003";

export class JiraNotConfiguredError extends Error {
  constructor() {
    super("Jira is nog niet ingesteld in .env.local");
  }
}

type JiraSettings = { baseUrl: string; authorization: string };

function settings(): JiraSettings {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new JiraNotConfiguredError();
  }
  const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    "base64",
  );
  return { baseUrl: JIRA_BASE_URL, authorization: `Basic ${credentials}` };
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
  const status = record(fields.status).name;
  const sprints = fields[SPRINT_FIELD];
  return {
    key: issue.key,
    status: typeof status === "string" ? status : "Onbekend",
    sprints: (Array.isArray(sprints) ? sprints : [])
      .map(parseSprint)
      .filter((sprint): sprint is JiraSprint => sprint !== null),
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

async function postSearch(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { baseUrl, authorization } = settings();
  const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: ["status", SPRINT_FIELD], ...body }),
    cache: "no-store",
  });
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
export async function searchIssues(jql: string): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await postSearch({
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
export async function findBoardId(key: string): Promise<number | null> {
  const data = await postSearch({
    jql: `project = "${key.replace(/"/g, '\\"')}" AND sprint is not EMPTY ORDER BY updated DESC`,
    maxResults: 1,
  });
  const sprint = parseIssues(data)[0]?.sprints.find(
    (item) => item.boardId !== null,
  );
  return sprint?.boardId ?? null;
}
