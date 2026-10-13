import { parseBericht, type SlackTodo, zoekBerichten } from "./api";

/**
 * De bewaarde berichten van de gebruiker, nieuwste eerst. Slack heeft geen
 * API voor Later; zoeken op is:saved is de officiële route. De eerste 100.
 */
export async function fetchSlackTodos(email: string): Promise<SlackTodo[]> {
  return (await zoekBerichten(email, "is:saved", 100))
    .map((match) => parseBericht(match, "Bewaard"))
    .filter((todo): todo is SlackTodo => todo !== null);
}
