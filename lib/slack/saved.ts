import { parseBericht, type SlackTodo, zoekBerichten } from "./api";
import { haalNamenOp } from "./namen";

/**
 * De bewaarde berichten van de gebruiker, nieuwste eerst. Slack heeft geen
 * API voor Later; zoeken op is:saved is de officiële route. De eerste 100.
 */
export async function fetchSlackTodos(email: string): Promise<SlackTodo[]> {
  const matches = await zoekBerichten(email, "is:saved", 100);
  const { namen } = await haalNamenOp(email, matches);
  return matches
    .map((match) => parseBericht(match, "Bewaard", namen))
    .filter((todo): todo is SlackTodo => todo !== null);
}
