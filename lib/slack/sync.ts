import { voegSlackToe } from "@/lib/todos";
import { SlackNietVerbondenError } from "./api";
import { fetchSlackInbox } from "./inbox";
import { fetchSlackTodos } from "./saved";

export type SlackProbleem = { verbinden: true } | { fout: string } | null;

/**
 * Haalt bewaarde berichten, vermeldingen en DM's op en zet nieuwe in de inbox.
 * Wat al bekend is, blijft zoals het is. Eén mislukte bron stopt de andere niet.
 */
export async function synchroniseerSlack(
  email: string,
): Promise<SlackProbleem> {
  const resultaten = await Promise.allSettled([
    fetchSlackTodos(email),
    fetchSlackInbox(email),
  ]);
  let probleem: SlackProbleem = null;
  for (const resultaat of resultaten) {
    if (resultaat.status === "fulfilled") {
      voegSlackToe(email, resultaat.value);
      continue;
    }
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
