import { parseStoredToken, validToken } from "@/lib/koppelingen";
import { heeftSchrijfScope } from "./oauth";
import { platteTekst } from "./tekst";

export type SlackTodo = {
  text: string;
  auteur: string;
  /** "#kanaal", of "Direct bericht" voor een DM. */
  kanaal: string;
  /** Unix-seconden. */
  tijd: number;
  /** Zonder ?thread_ts, die Slack toevoegt zodra er een thread onder komt. */
  permalink: string;
  /** Opent het bericht direct in de Slack-app; de permalink als dat niet lukt. */
  url: string;
  /** Waarom het in de inbox komt: "Bewaard", "Vermelding" of "Direct bericht". */
  soort: string;
  /** Kanaal-id van het DM-gesprek; dat gesprek is dan één inbox-item. Anders null. */
  gesprek: string | null;
};

/** De gebruiker heeft Slack niet verbonden, of de koppeling is ingetrokken. */
export class SlackNietVerbondenError extends Error {
  constructor() {
    super("Niet verbonden met Slack");
  }
}

const NIET_VERBONDEN = [
  "not_authed",
  "invalid_auth",
  "token_revoked",
  "missing_scope",
];

export function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/** Verbonden, maar het token mag geen berichten plaatsen (chat:write): opnieuw verbinden. */
export class SlackSchrijvenOntbreektError extends Error {
  constructor() {
    super("Geen toestemming om berichten in Slack te plaatsen");
  }
}

/** Mag het dashboard namens de gebruiker berichten plaatsen? */
export async function slackMagSchrijven(email: string): Promise<boolean> {
  const token = await validToken(email, "slack", parseStoredToken, () =>
    Promise.reject(new Error("Slack-tokens worden niet vernieuwd")),
  );
  return token !== null && heeftSchrijfScope(token);
}

/**
 * Plaatst een bericht onder de naam van de gebruiker (een gebruikerstoken
 * post altijd als de gebruiker). Alleen na een klik op Verstuur.
 */
export async function plaatsBericht(
  email: string,
  kanaal: string,
  tekst: string,
): Promise<{ ts: string; permalink: string | null }> {
  if (!(await slackMagSchrijven(email)))
    throw new SlackSchrijvenOntbreektError();
  const geplaatst = await slackPost(email, "chat.postMessage", {
    channel: kanaal,
    text: tekst,
  });
  const ts = String(geplaatst.ts);
  // Het bericht staat er al: een mislukte permalink mag niet tot een tweede bericht leiden.
  const link = await slackPost(email, "chat.getPermalink", {
    channel: String(geplaatst.channel),
    message_ts: ts,
  }).catch(() => null);
  return {
    ts,
    permalink: typeof link?.permalink === "string" ? link.permalink : null,
  };
}

/** Eén aanroep van de Slack Web API met het token van de gebruiker. */
export async function slackPost(
  email: string,
  methode: string,
  params: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const token = await validToken(email, "slack", parseStoredToken, () =>
    Promise.reject(new Error("Slack-tokens worden niet vernieuwd")),
  );
  if (!token) throw new SlackNietVerbondenError();

  const response = await fetch(`https://slack.com/api/${methode}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}` },
    body: new URLSearchParams(params),
  });
  const body = record(await response.json());
  if (body.ok === true) return body;
  const fout = typeof body.error === "string" ? body.error : response.status;
  if (NIET_VERBONDEN.includes(String(fout)))
    throw new SlackNietVerbondenError();
  throw new Error(`Slack gaf een fout bij ${methode}: ${fout}`);
}

function kanaalNaam(data: unknown): string {
  const kanaal = record(data);
  if (kanaal.is_im === true || kanaal.is_mpim === true) return "Direct bericht";
  return typeof kanaal.name === "string" ? `#${kanaal.name}` : "Slack";
}

/** Zoekt berichten; Slack geeft de nieuwste eerst. */
export async function zoekBerichten(
  email: string,
  query: string,
  aantal: number,
): Promise<Record<string, unknown>[]> {
  const body = await slackPost(email, "search.messages", {
    query,
    sort: "timestamp",
    sort_dir: "desc",
    count: String(aantal),
  });
  const matches = record(body.messages).matches;
  return (Array.isArray(matches) ? matches : []).map(record);
}

function auteurNaam(
  match: Record<string, unknown>,
  namen: Map<string, string>,
): string {
  const naam = typeof match.user === "string" && namen.get(match.user);
  if (naam) return naam;
  return typeof match.username === "string" ? match.username : "Onbekend";
}

/**
 * De tekst van een app-bericht (Jira, Google Calendar) staat niet in `text`
 * maar in de secties van `blocks`; zonder vet, citaattekens en emoji-codes.
 */
function blokTekst(match: Record<string, unknown>): string {
  const blocks = Array.isArray(match.blocks) ? match.blocks.map(record) : [];
  return blocks
    .filter((block) => block.type === "section")
    .map((block) => record(block.text).text)
    .filter((tekst): tekst is string => typeof tekst === "string")
    .join("\n")
    .replace(/^(&gt;)+ ?/gm, "")
    .replace(/(?<![\w/]):[a-z][a-z0-9_+-]*: ?/g, "")
    .replace(/\*/g, "");
}

/** Een slack://-link slaat de doorklikpagina van slack.com over en opent geen tabblad. */
function appLink(match: Record<string, unknown>, permalink: string): string {
  const kanaal = record(match.channel).id;
  if (typeof match.team !== "string" || typeof kanaal !== "string") {
    return permalink;
  }
  const thread = new URL(permalink).searchParams.get("thread_ts");
  const params = new URLSearchParams({
    team: match.team,
    id: kanaal,
    message: String(match.ts),
    ...(thread ? { thread_ts: thread } : {}),
  });
  return `slack://channel?${params}`;
}

/** De permalink zonder query, zodat een bericht na een nieuwe thread hetzelfde item blijft. */
export function vasteLink(permalink: string): string {
  return permalink.split("?")[0];
}

export function parseBericht(
  match: Record<string, unknown>,
  soort: string,
  namen: Map<string, string>,
): SlackTodo | null {
  const tijd = Number(match.ts);
  if (typeof match.permalink !== "string" || !Number.isFinite(tijd)) {
    return null;
  }
  return {
    text: platteTekst(
      typeof match.text === "string" && match.text !== ""
        ? match.text
        : blokTekst(match),
      namen,
    ),
    auteur: auteurNaam(match, namen),
    kanaal: kanaalNaam(match.channel),
    tijd,
    permalink: vasteLink(match.permalink),
    url: appLink(match, match.permalink),
    soort,
    gesprek: null,
  };
}
