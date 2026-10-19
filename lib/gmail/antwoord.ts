/** Het antwoord op een mail als RFC 2822-bericht voor `drafts.create`. Zonder imports, zodat dit los te testen is. */

/** "Re: " voor het onderwerp, maar niet dubbel. */
export const metRe = (onderwerp: string): string =>
  /^re:/i.test(onderwerp.trim()) ? onderwerp : `Re: ${onderwerp}`;

/** Een headerwaarde mag geen regeleinde hebben, anders kan tekst uit een mail extra headers toevoegen. */
const eenRegel = (waarde: string): string =>
  waarde.replace(/[\r\n]+/g, " ").trim();

const base64 = (tekst: string): string =>
  Buffer.from(tekst, "utf8").toString("base64");

/** Niet-ASCII in een header gaat als encoded-word (RFC 2047). */
// ponytail: één encoded-word, ook bij een heel lang onderwerp; Gmail verdraagt dat. Opsplitsen als dat misgaat.
const kop = (waarde: string): string =>
  /^[\x20-\x7e]*$/.test(waarde) ? waarde : `=?UTF-8?B?${base64(waarde)}?=`;

export type Antwoord = {
  aan: string;
  onderwerp: string;
  tekst: string;
  /** Message-ID van de mail waar dit op antwoordt, met haakjes. */
  inReplyTo: string | null;
  /** De References van die mail; het antwoord voegt inReplyTo eraan toe. */
  references: string | null;
};

/** Base64url-gecodeerd bericht, zoals Gmail het in `message.raw` wil. */
export function bouwAntwoord(antwoord: Antwoord): string {
  const inReplyTo = antwoord.inReplyTo ? eenRegel(antwoord.inReplyTo) : null;
  const references = [antwoord.references, inReplyTo]
    .map((deel) => eenRegel(deel ?? ""))
    .filter(Boolean)
    .join(" ");
  const regels = [
    `To: ${eenRegel(antwoord.aan)}`,
    `Subject: ${kop(eenRegel(metRe(antwoord.onderwerp)))}`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(references ? [`References: ${references}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    // Base64 in regels van 76 tekens, zoals MIME wil.
    ...(base64(antwoord.tekst).match(/.{1,76}/g) ?? []),
  ];
  return Buffer.from(regels.join("\r\n"), "utf8").toString("base64url");
}
