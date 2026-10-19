import { DEMO } from "./demo";
import {
  GmailComposeOntbreektError,
  GmailNietVerbondenError,
} from "./gmail/api";
import { zetConceptKlaar } from "./gmail/concept";
import { leesOpdrachten, zetAkkoord } from "./opdrachten";
import { leesTaak } from "./todos";

export type AkkoordUitkomst =
  | { uitkomst: "akkoord"; conceptUrl: string | null }
  /** Gmail is niet (met de juiste rechten) verbonden: opnieuw verbinden met Google. */
  | { uitkomst: "verbinden" }
  | { uitkomst: "fout"; fout: string };

const DEMO_CONCEPT = "https://mail.google.com/mail/#drafts";

/**
 * Akkoord op een voorstel. Bij een Gmail-concept zet dit een concept klaar in
 * hetzelfde gesprek; bij Slack en advies markeert het alleen (kopiëren doet de
 * browser). Verstuurt niets en raakt de status van de to-do niet aan.
 */
export async function geefAkkoord(
  email: string,
  opdrachtId: number,
): Promise<AkkoordUitkomst> {
  const opdracht = leesOpdrachten(email).find((o) => o.id === opdrachtId);
  if (opdracht?.status !== "voorstel" || !opdracht.voorstel) {
    return { uitkomst: "fout", fout: "Dit voorstel staat niet meer open" };
  }
  if (opdracht.soort !== "gmail-concept") {
    zetAkkoord(email, opdrachtId, null);
    return { uitkomst: "akkoord", conceptUrl: null };
  }

  const { ontvanger, tekst } = opdracht.voorstel;
  const gevonden = leesTaak(email, opdracht.taakId);
  if (!ontvanger) {
    return { uitkomst: "fout", fout: "Er is geen ontvanger bekend" };
  }
  let conceptUrl = DEMO_CONCEPT;
  if (!DEMO) {
    if (gevonden?.taak.bron !== "gmail" || !gevonden.bronId) {
      return { uitkomst: "fout", fout: "Deze to-do hoort niet bij een mail" };
    }
    try {
      conceptUrl = await zetConceptKlaar(email, gevonden.bronId, {
        aan: ontvanger,
        tekst,
      });
    } catch (fout) {
      if (
        fout instanceof GmailComposeOntbreektError ||
        fout instanceof GmailNietVerbondenError
      ) {
        return { uitkomst: "verbinden" };
      }
      const reden = fout instanceof Error ? fout.message : String(fout);
      return {
        uitkomst: "fout",
        fout: `Het concept zetten mislukte: ${reden}`,
      };
    }
  }
  zetAkkoord(email, opdrachtId, conceptUrl);
  return { uitkomst: "akkoord", conceptUrl };
}
