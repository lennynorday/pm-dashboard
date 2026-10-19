import { leesBezig, markeerMislukt, rondAf } from "../opdrachten";
import { leesTaak } from "../todos";
import { laatsteMails } from "./mail";
import { bouwPrompt } from "./prompt";
import { draaiClaude } from "./run";
import { parseUitvoer } from "./voorstel";

/**
 * Draait een opdracht met status bezig en bewaart de uitkomst. Wacht niemand op:
 * de aanroeper start hem met `void` en de pagina ziet de stand via de database.
 */
export async function draaiOpdracht(id: number): Promise<void> {
  try {
    const opdracht = leesBezig(id);
    if (!opdracht) return;
    const gevonden = leesTaak(opdracht.email, opdracht.taakId);
    if (!gevonden) return markeerMislukt(id, "De to-do bestaat niet meer");
    const { taak, bronId } = gevonden;

    // Bij Gmail liever de laatste mails van de thread dan de ±200 tekens in het dashboard.
    const mails =
      taak.bron === "gmail" && bronId
        ? await laatsteMails(opdracht.email, bronId)
        : null;
    const run = await draaiClaude(
      bouwPrompt({
        taak,
        gesprek: mails ?? taak.bericht ?? "",
        instructie: opdracht.instructie,
        soort: opdracht.soort,
      }),
    );
    if ("fout" in run) return markeerMislukt(id, run.fout);

    const uitvoer = parseUitvoer(run.stdout, opdracht.soort);
    if ("fout" in uitvoer) return markeerMislukt(id, uitvoer.fout);
    rondAf(id, uitvoer.voorstel);
  } catch (fout) {
    markeerMislukt(id, fout instanceof Error ? fout.message : String(fout));
  }
}
