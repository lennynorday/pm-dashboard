import { database } from "@/lib/db";
import { bronAan, isUitgesloten, leesUitsluitingen } from "@/lib/inbox-bronnen";
import { ruimGmailOp, voegGmailToe } from "@/lib/todos";
import { gmailGet, GmailNietVerbondenError } from "./api";
import { beoordeelGesprek, type GmailGesprek } from "./gesprekken";

export type GmailProbleem = { toestaan: true } | { fout: string } | null;

// ponytail: de nieuwste 50 threads per zoekopdracht; een ouder gesprek dat nog wacht, valt eruit tot er nieuwe mail in komt. Pagineren als dat gebeurt.
const AANTAL = "50";
// threads.get kost 10 quota-eenheden; in groepjes blijft het onder de limiet per seconde.
const GROEPJE = 10;

/** Het moment van de eerste synchronisatie, in Unix-seconden; zet het als het er nog niet is. */
function leesStart(email: string): number | null {
  const row = database()
    .prepare("SELECT sinds FROM gmail_start WHERE email = ?")
    .get(email);
  if (typeof row?.sinds === "number") return row.sinds;
  database()
    .prepare("INSERT OR IGNORE INTO gmail_start (email, sinds) VALUES (?, ?)")
    .run(email, Math.floor(Date.now() / 1000));
  return null;
}

async function zoekThreads(email: string, q: string): Promise<string[]> {
  const body = await gmailGet(
    email,
    "threads",
    new URLSearchParams({ q, maxResults: AANTAL }),
  );
  return (Array.isArray(body.threads) ? body.threads : [])
    .map((thread: unknown) =>
      typeof thread === "object" && thread !== null
        ? (thread as Record<string, unknown>).id
        : null,
    )
    .filter((id): id is string => typeof id === "string");
}

const haalThread = (email: string, id: string) =>
  gmailGet(
    email,
    `threads/${id}`,
    new URLSearchParams([
      ["format", "metadata"],
      ...["From", "To", "Cc", "Subject"].map((kop) => ["metadataHeaders", kop]),
    ]),
  );

/**
 * Haalt mailgesprekken op en werkt de Inbox bij: Primair in Postvak IN met jou
 * in Aan of CC sinds de eerste synchronisatie, plus alles met een ster. De
 * eerste keer zet dit alleen het startmoment en haalt het alleen mail met een
 * ster. Wat niet meer op je wacht, gaat uit de inbox. `{ toestaan: true }` =
 * geen (werkende) Gmail-toegang.
 */
export async function synchroniseerGmail(
  email: string,
): Promise<GmailProbleem> {
  if (!bronAan(email, "gmail")) return null;
  try {
    const ster = await zoekThreads(email, "is:starred");
    // Pas na een gelukte aanroep, anders telt de start van voor de toegang.
    const start = leesStart(email);
    const inbox =
      start === null
        ? []
        : await zoekThreads(
            email,
            `in:inbox category:primary {to:me cc:me} after:${start}`,
          );
    const ids = [...new Set([...ster, ...inbox])];

    const uitsluitingen = leesUitsluitingen(email);
    const uitgesloten = (adres: string) => isUitgesloten(adres, uitsluitingen);
    const gesprekken: GmailGesprek[] = [];
    for (let i = 0; i < ids.length; i += GROEPJE) {
      const threads = await Promise.all(
        ids.slice(i, i + GROEPJE).map((id) => haalThread(email, id)),
      );
      gesprekken.push(
        ...threads
          .map((thread) => beoordeelGesprek(thread, email, uitgesloten))
          .filter((gesprek): gesprek is GmailGesprek => gesprek !== null),
      );
    }

    voegGmailToe(email, gesprekken);
    ruimGmailOp(
      email,
      gesprekken.map(({ id }) => id),
    );
    return null;
  } catch (fout) {
    if (fout instanceof GmailNietVerbondenError) return { toestaan: true };
    const reden = fout instanceof Error ? fout.message : String(fout);
    return { fout: `Gmail synchroniseren mislukt: ${reden}` };
  }
}
