/**
 * Slack-opmaak als gewone tekst: <url|label> wordt label, <@U123> wordt
 * @Volledige Naam (@onbekend als de naam ontbreekt).
 */
export function platteTekst(text: string, namen: Map<string, string>): string {
  return text
    .replace(
      /<@([A-Z0-9]+)(?:\|[^>]*)?>/g,
      (_, id: string) => `@${namen.get(id) ?? "onbekend"}`,
    )
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<([^>|]+)\|([^>]+)>/g, "$2")
    .replace(/<([^>]+)>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
