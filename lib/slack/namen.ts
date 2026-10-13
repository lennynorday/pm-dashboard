import { database } from "@/lib/db";
import { record, slackPost } from "./api";

const VERSHEID = 7 * 24 * 60 * 60;

/** User-ids van afzenders en van <@U…>-vermeldingen in de tekst. */
function gebruikersIds(matches: Record<string, unknown>[]): string[] {
  const ids = matches.flatMap((match) => [
    ...(typeof match.user === "string" ? [match.user] : []),
    ...(typeof match.text === "string"
      ? [...match.text.matchAll(/<@([A-Z0-9]+)/g)].map((m) => m[1])
      : []),
  ]);
  return [...new Set(ids)];
}

type Gebruiker = { naam: string; bot: boolean };

/** Volledige naam uit een users.info-antwoord, en of het een app is; null zonder naam. */
function parseGebruiker(body: Record<string, unknown>): Gebruiker | null {
  const user = record(body.user);
  const kandidaten = [
    record(user.profile).real_name,
    user.real_name,
    user.name,
  ];
  const naam = kandidaten.find(
    (kandidaat): kandidaat is string =>
      typeof kandidaat === "string" && kandidaat !== "",
  );
  if (!naam) return null;
  return { naam, bot: user.is_bot === true || user.id === "USLACKBOT" };
}

async function haalGebruikerOp(
  email: string,
  id: string,
): Promise<Gebruiker | null> {
  try {
    return parseGebruiker(await slackPost(email, "users.info", { user: id }));
  } catch (fout) {
    if (fout instanceof Error && fout.message.endsWith(": user_not_found")) {
      return null;
    }
    throw fout;
  }
}

/**
 * Namen van alle gebruikers in deze berichten. Eerder opgehaalde namen komen
 * uit de database; alleen onbekende of oudere dan 7 dagen gaan naar Slack.
 * Gebruikers die Slack niet kent ontbreken in het resultaat. `bots` zijn de
 * ids van apps, zoals Jira en Google Calendar.
 */
export async function haalNamenOp(
  email: string,
  matches: Record<string, unknown>[],
): Promise<{ namen: Map<string, string>; bots: Set<string> }> {
  const nu = Math.floor(Date.now() / 1000);
  const namen = new Map<string, string>();
  const bots = new Set<string>();
  const verouderd: string[] = [];
  const lees = database().prepare(
    "SELECT naam, opgehaald, bot FROM slack_gebruikers WHERE id = ?",
  );
  for (const id of gebruikersIds(matches)) {
    const rij = lees.get(id);
    if (
      typeof rij?.naam !== "string" ||
      typeof rij.opgehaald !== "number" ||
      typeof rij.bot !== "number"
    ) {
      verouderd.push(id);
      continue;
    }
    namen.set(id, rij.naam);
    if (rij.bot === 1) bots.add(id);
    if (nu - rij.opgehaald > VERSHEID) verouderd.push(id);
  }

  // Elke naam meteen bewaren: faalt er één (rate limit), dan hoeft de rest niet opnieuw.
  const bewaar = database().prepare(
    "INSERT OR REPLACE INTO slack_gebruikers (id, naam, opgehaald, bot) VALUES (?, ?, ?, ?)",
  );
  await Promise.all(
    verouderd.map(async (id) => {
      const gebruiker = await haalGebruikerOp(email, id);
      if (gebruiker === null) return;
      namen.set(id, gebruiker.naam);
      if (gebruiker.bot) bots.add(id);
      else bots.delete(id);
      bewaar.run(id, gebruiker.naam, nu, gebruiker.bot ? 1 : 0);
    }),
  );
  return { namen, bots };
}
