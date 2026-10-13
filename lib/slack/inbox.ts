import { database } from "@/lib/db";
import {
  parseBericht,
  record,
  slackPost,
  type SlackTodo,
  zoekBerichten,
} from "./api";
import { deelGesprekkenIn, isGesprek } from "./gesprekken";
import { haalNamenOp } from "./namen";

// ponytail: de laatste 100 DM-berichten bepalen welke gesprekken op je wachten; bij heel veel eigen DM-verkeer valt een ouder gesprek eruit. Pagineren als dat gebeurt.
const DM_AANTAL = 100;
const VERMELDING_AANTAL = 50;

/** Het moment vanaf wanneer we vermeldingen en DM's meenemen: de eerste synchronisatie. */
function leesStart(email: string): number | null {
  const row = database()
    .prepare("SELECT sinds FROM slack_start WHERE email = ?")
    .get(email);
  return typeof row?.sinds === "number" ? row.sinds : null;
}

/**
 * De berichten waarop jij met een emoji reageerde, als `kanaal:ts`; de laatste 100.
 * Zonder de scope reactions:read (nog niet opnieuw verbonden) tellen ze niet mee.
 */
async function mijnReacties(email: string): Promise<Set<string>> {
  try {
    const body = await slackPost(email, "reactions.list", { count: "100" });
    const items = Array.isArray(body.items) ? body.items.map(record) : [];
    return new Set(
      items.map((item) => `${item.channel}:${record(item.message).ts}`),
    );
  } catch (fout) {
    if (fout instanceof Error && fout.message.endsWith(": missing_scope")) {
      return new Set();
    }
    throw fout;
  }
}

/** Slack zoekt op datum; we filteren daarna op het exacte moment. */
function datumVanaf(sinds: number): string {
  return new Date((sinds - 24 * 60 * 60) * 1000).toISOString().slice(0, 10);
}

/**
 * Wat om aandacht vraagt sinds de eerste synchronisatie: vermeldingen, en
 * DM-gesprekken waarvan het laatste bericht nog op jou wacht. Per gesprek één
 * item; `beantwoord` zijn de gesprekken waarin jij als laatste reageerde (ook
 * met een emoji) of waarvan het laatste bericht van een app komt.
 * De eerste keer haalt dit niets op, het zet alleen het startmoment: wat er
 * al lag, wordt niet binnengehaald.
 */
export async function fetchSlackInbox(
  email: string,
): Promise<{ items: SlackTodo[]; beantwoord: string[] }> {
  const start = leesStart(email);
  if (start === null) {
    database()
      .prepare("INSERT OR IGNORE INTO slack_start (email, sinds) VALUES (?, ?)")
      .run(email, Math.floor(Date.now() / 1000));
    return { items: [], beantwoord: [] };
  }
  const ik = record(await slackPost(email, "auth.test")).user_id;
  if (typeof ik !== "string") return { items: [], beantwoord: [] };
  const sinds = `after:${datumVanaf(start)}`;
  const nieuw = (match: Record<string, unknown>) => Number(match.ts) > start;

  const [[vermeldingen, dms], gereageerd] = await Promise.all([
    Promise.all([
      zoekBerichten(email, `<@${ik}> ${sinds}`, VERMELDING_AANTAL),
      zoekBerichten(email, `is:dm ${sinds}`, DM_AANTAL),
    ]).then((lijsten) => lijsten.map((lijst) => lijst.filter(nieuw))),
    mijnReacties(email),
  ]);

  const { namen, bots } = await haalNamenOp(email, [...vermeldingen, ...dms]);
  const vanApp = (match: Record<string, unknown>) =>
    typeof match.bot_id === "string" || bots.has(String(match.user));

  // Nieuwste eerst, dus het eerste bericht per gesprek is het laatste.
  const { wachtOpJou, beantwoord } = deelGesprekkenIn(
    dms,
    (match) =>
      match.user === ik ||
      vanApp(match) ||
      gereageerd.has(`${record(match.channel).id}:${match.ts}`),
  );

  // Een vermelding in een DM valt onder het gesprek, niet apart.
  const items = [
    ...vermeldingen
      .filter(
        (match) => match.user !== ik && !vanApp(match) && !isGesprek(match),
      )
      .map((match) => parseBericht(match, "Vermelding", namen)),
    ...wachtOpJou.map((match) => {
      const bericht = parseBericht(match, "Direct bericht", namen);
      const gesprek = record(match.channel).id;
      return bericht && typeof gesprek === "string"
        ? { ...bericht, gesprek }
        : null;
    }),
  ].filter((bericht): bericht is SlackTodo => bericht !== null);

  return { items, beantwoord };
}
