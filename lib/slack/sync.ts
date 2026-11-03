import { DEMO } from "@/lib/demo";
import { verwijderBeantwoorde, voegSlackToe } from "@/lib/todos";
import { SlackNietVerbondenError } from "./api";
import { voegBewaardSamen } from "./gesprekken";
import { fetchSlackInbox } from "./inbox";
import { fetchSlackTodos } from "./saved";

export type SlackProbleem = { verbinden: true } | { fout: string } | null;

/**
 * Haalt bewaarde berichten, vermeldingen en DM's op en zet nieuwe in de inbox.
 * Een DM-gesprek is één item dat meegroeit met het laatste bericht en verdwijnt
 * zodra jij zelf reageert; een bewaard bericht daaruit valt onder dat gesprek.
 */
export async function synchroniseerSlack(
  email: string,
): Promise<SlackProbleem> {
  if (DEMO) return null;
  const [bewaard, inbox] = await Promise.allSettled([
    fetchSlackTodos(email),
    fetchSlackInbox(email),
  ]);
  // Zonder de DM-gesprekken weten we niet welke bewaarde berichten daarin vallen; dan volgende keer.
  if (inbox.status === "fulfilled") {
    const samen = voegBewaardSamen(
      bewaard.status === "fulfilled" ? bewaard.value : [],
      inbox.value.items,
    );
    voegSlackToe(email, [...samen.bewaard, ...samen.items]);
    verwijderBeantwoorde(email, inbox.value.beantwoord);
  }
  let probleem: SlackProbleem = null;
  for (const resultaat of [bewaard, inbox]) {
    if (resultaat.status === "fulfilled") continue;
    if (resultaat.reason instanceof SlackNietVerbondenError) {
      return { verbinden: true };
    }
    probleem ??= {
      fout:
        resultaat.reason instanceof Error
          ? resultaat.reason.message
          : String(resultaat.reason),
    };
  }
  return probleem;
}
