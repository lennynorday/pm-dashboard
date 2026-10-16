import { DEMO } from "@/lib/demo";
import { verwijderBeantwoorde, voegSlackToe } from "@/lib/todos";
import { SlackNietVerbondenError } from "./api";
import { fetchSlackInbox } from "./inbox";
import { fetchSlackTodos } from "./saved";

export type SlackProbleem = { verbinden: true } | { fout: string } | null;

/**
 * Haalt bewaarde berichten, vermeldingen en DM's op en zet nieuwe in de inbox.
 * Een DM-gesprek is één item dat meegroeit met het laatste bericht en verdwijnt
 * zodra jij zelf reageert. Eén mislukte bron stopt de andere niet.
 */
export async function synchroniseerSlack(
  email: string,
): Promise<SlackProbleem> {
  if (DEMO) return null;
  const resultaten = await Promise.allSettled([
    fetchSlackTodos(email).then((todos) => voegSlackToe(email, todos)),
    fetchSlackInbox(email).then(({ items, beantwoord }) => {
      voegSlackToe(email, items);
      verwijderBeantwoorde(email, beantwoord);
    }),
  ]);
  let probleem: SlackProbleem = null;
  for (const resultaat of resultaten) {
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
