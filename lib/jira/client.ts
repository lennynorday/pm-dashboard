export const STATUS_CATEGORIES = ["new", "indeterminate", "done"] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

export type JiraIssue = {
  key: string;
  status: string;
  statusCategory: StatusCategory;
  type: string;
};

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

function parseCategory(value: unknown): StatusCategory {
  return (
    STATUS_CATEGORIES.find((category) => category === value) ?? "indeterminate"
  );
}

/** Parst één issue uit de Jira-zoekresultaten; onvolledige issues worden overgeslagen. */
function parseIssue(data: unknown): JiraIssue | null {
  const issue = record(data);
  const fields = record(issue.fields);
  const status = record(fields.status);
  const type = record(fields.issuetype);
  if (typeof issue.key !== "string" || typeof status.name !== "string")
    return null;
  return {
    key: issue.key,
    status: status.name,
    statusCategory: parseCategory(record(status.statusCategory).key),
    type: typeof type.name === "string" ? type.name : "Onbekend",
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** Haalt alle issues op die bij de JQL horen, met alleen status en type. */
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
        fields: ["status", "issuetype"],
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
