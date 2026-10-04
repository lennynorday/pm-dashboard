export const SPRINT_STATES = ["active", "future", "closed"] as const;
export type SprintState = (typeof SPRINT_STATES)[number];

export type JiraSprint = {
  name: string;
  state: SprintState;
  endDate: string | null;
};

export type JiraIssue = {
  key: string;
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
  };
}

/** Parst één issue uit de Jira-zoekresultaten; issues zonder key worden overgeslagen. */
function parseIssue(data: unknown): JiraIssue | null {
  const issue = record(data);
  if (typeof issue.key !== "string") return null;
  const sprints = record(issue.fields)[SPRINT_FIELD];
  return {
    key: issue.key,
    sprints: (Array.isArray(sprints) ? sprints : [])
      .map(parseSprint)
      .filter((sprint): sprint is JiraSprint => sprint !== null),
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** Haalt alle issues op die bij de JQL horen, met alleen hun sprints. */
export async function searchIssues(jql: string): Promise<JiraIssue[]> {
  const { baseUrl, authorization } = settings();
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jql,
        fields: [SPRINT_FIELD],
        maxResults: PAGE_SIZE,
        nextPageToken,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Jira gaf status ${response.status}`);
    }

    const data = record(await response.json());
    const pageIssues = Array.isArray(data.issues) ? data.issues : [];
    issues.push(
      ...pageIssues
        .map(parseIssue)
        .filter((issue): issue is JiraIssue => issue !== null),
    );

    if (data.isLast !== false || typeof data.nextPageToken !== "string")
      return issues;
    nextPageToken = data.nextPageToken;
  }
  return issues;
}
