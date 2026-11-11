/** Een voorgestelde to-do-titel uit een inboxbericht: het mailonderwerp, of de eerste zin van een Slack-bericht. */
export function titelSuggestie(bron: string, tekst: string): string {
  const schoon =
    bron === "gmail"
      ? tekst.replace(/^\s*((re|fw|fwd|antw|doorst)\s*:\s*)+/i, "")
      : (tekst
          .replace(/:[a-z0-9_+-]+:/g, "")
          // shortcut: een naam loopt door tot het eerste kleine woord (geen tussenvoegsel), dus "@Jos Kun je" verliest "Kun"; upgrade naar de Slack-ledenlijst als dat stoort.
          .replace(
            /^(\s*@\S+(\s((van|de|der|den|ter|te)(?=\s[A-Z])|[A-Z]\S*))*)+/,
            "",
          )
          .split(/(?<=[.!?])\s|\n/)
          .find((zin) => zin.trim()) ?? "");
  return schoon.replace(/\s+/g, " ").trim().slice(0, 120);
}
