import { parseStoredToken, validToken } from "@/lib/koppelingen";

export type SlackTodo = {
  text: string;
  auteur: string;
  /** "#kanaal", of "Direct bericht" voor een DM. */
  kanaal: string;
  /** Unix-seconden. */
  tijd: number;
  permalink: string;
};

/** De gebruiker heeft Slack niet verbonden, of de koppeling is ingetrokken. */
export class SlackNietVerbondenError extends Error {
  constructor() {
    super("Niet verbonden met Slack");
  }
}

const NIET_VERBONDEN = ["not_authed", "invalid_auth", "token_revoked"];
const PAGE_SIZE = 100;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/** Slack-opmaak als gewone tekst: <url|label> wordt label, <@U123> wordt @gebruiker. */
function platteTekst(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, "@gebruiker")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<([^>|]+)\|([^>]+)>/g, "$2")
    .replace(/<([^>]+)>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function kanaalNaam(data: unknown): string {
  const kanaal = record(data);
  if (kanaal.is_im === true || kanaal.is_mpim === true) return "Direct bericht";
  return typeof kanaal.name === "string" ? `#${kanaal.name}` : "Slack";
}

function parseTodo(data: unknown): SlackTodo | null {
  const bericht = record(data);
  const tijd = Number(bericht.ts);
  if (typeof bericht.permalink !== "string" || !Number.isFinite(tijd)) {
    return null;
  }
  return {
    text: typeof bericht.text === "string" ? platteTekst(bericht.text) : "",
    auteur:
      typeof bericht.username === "string" ? bericht.username : "Onbekend",
    kanaal: kanaalNaam(bericht.channel),
    tijd,
    permalink: bericht.permalink,
  };
}

/**
 * De bewaarde berichten van de gebruiker, nieuwste eerst. Slack heeft geen
 * API voor Later; zoeken op is:saved is de officiële route. De eerste 100.
 */
export async function fetchSlackTodos(email: string): Promise<SlackTodo[]> {
  const token = await validToken(email, "slack", parseStoredToken, () =>
    Promise.reject(new Error("Slack-tokens worden niet vernieuwd")),
  );
  if (!token) throw new SlackNietVerbondenError();

  const response = await fetch("https://slack.com/api/search.messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}` },
    body: new URLSearchParams({
      query: "is:saved",
      sort: "timestamp",
      sort_dir: "desc",
      count: String(PAGE_SIZE),
    }),
  });
  const body = record(await response.json());
  if (body.ok !== true) {
    const fout = typeof body.error === "string" ? body.error : response.status;
    if (NIET_VERBONDEN.includes(String(fout))) {
      throw new SlackNietVerbondenError();
    }
    throw new Error(`Slack gaf een fout bij het zoeken: ${fout}`);
  }
  const matches = record(body.messages).matches;
  return (Array.isArray(matches) ? matches : [])
    .map(parseTodo)
    .filter((todo): todo is SlackTodo => todo !== null);
}
