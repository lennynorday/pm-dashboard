import { database } from "@/lib/db";
import { bronAan, leesUitsluitingen } from "@/lib/inbox-bronnen";
import { isUitgesloten } from "@/lib/taak";
import { deleteKoppeling } from "@/lib/koppelingen";
import { gmailInInbox, ruimGmailOp, voegGmailToe } from "@/lib/todos";
import { gmailGet, GmailNietVerbondenError } from "./api";
import { beoordeelGesprek, type GmailGesprek } from "./gesprekken";

export type GmailProbleem = { toestaan: true } | { fout: string } | null;

// ponytail: de nieuwste 50 threads per zoekopdracht; wat al in de Inbox staat, wordt apart nagekeken, dus alleen mail die nooit binnenkwam en buiten die 50 valt, mist. Pagineren als dat gebeurt.
const AANTAL = "50";
// threads.get kost 10 quota-eenheden; in groepjes blijft het onder de limiet per seconde.
const GROEPJE = 10;
// Primair = geen van de andere tabbladen; `category:primary` vindt via de API niets.
const PRIMAIR =
  "-category:social -category:promotions -category:updates -category:forums";

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
  return (Array.isArray(body?.threads) ? body.threads : [])
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
            `in:inbox ${PRIMAIR} {to:me cc:me} after:${start}`,
          );
    // Ook wat al in de Inbox staat, zodat een wachtend gesprek buiten de 50 blijft.
    const ids = [...new Set([...ster, ...inbox, ...gmailInInbox(email)])];

    const uitsluitingen = leesUitsluitingen(email);
    const uitgesloten = (adres: string) => isUitgesloten(adres, uitsluitingen);
    const gesprekken: GmailGesprek[] = [];
    for (let i = 0; i < ids.length; i += GROEPJE) {
      const threads = await Promise.all(
        ids.slice(i, i + GROEPJE).map((id) => haalThread(email, id)),
      );
      gesprekken.push(
        ...threads
          // Een verwijderde thread (404) wacht niet meer.
          .map(
            (thread) => thread && beoordeelGesprek(thread, email, uitgesloten),
          )
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
    // Toegang ingetrokken of verlopen: koppeling en mailitems weg, zodat Instellingen om toestemming vraagt.
    // ponytail: een tijdelijke fout bij het vernieuwen van het token vraagt zo ook om opnieuw inloggen; onderscheiden als dat vaak gebeurt.
    if (fout instanceof GmailNietVerbondenError) {
      deleteKoppeling(email, "gmail");
      ruimGmailOp(email, []);
      return { toestaan: true };
    }
    const reden = fout instanceof Error ? fout.message : String(fout);
    return { fout: `Gmail synchroniseren mislukt: ${reden}` };
  }
}
