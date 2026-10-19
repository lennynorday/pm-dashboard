import { gmailGet } from "../gmail/api";
import { metRe } from "../gmail/antwoord";
import { header, json, lijst, parseVan } from "../gmail/gesprekken";

const AANTAL_MAILS = 3;
const MAX_TEKENS = 3000;
const TIMEOUT_MS = 15_000;

/** De thread als tekst voor de prompt, plus wie het concept aanschrijft en onder welk onderwerp: uit de headers van de laatste mail. */
export type MailContext = {
  gesprek: string;
  antwoordAan: string;
  onderwerp: string;
};

/** De platte tekst van een mail: het eerste text/plain-deel, ook diep in multipart. */
function platteTekst(deel: Record<string, unknown>): string {
  const body = json(deel.body);
  if (deel.mimeType === "text/plain" && typeof body.data === "string") {
    return Buffer.from(body.data, "base64url").toString("utf8");
  }
  for (const kind of lijst(deel.parts)) {
    const tekst = platteTekst(kind);
    if (tekst) return tekst;
  }
  return "";
}

/**
 * De laatste mails van een thread voor in de prompt, of null als Gmail
 * niet verbonden is of de thread niet te lezen is; de aanroeper valt dan terug op het bericht.
 */
export async function laatsteMails(
  email: string,
  threadId: string,
): Promise<MailContext | null> {
  try {
    const thread = await gmailGet(
      email,
      `threads/${threadId}`,
      new URLSearchParams({ format: "full" }),
      AbortSignal.timeout(TIMEOUT_MS),
    );
    const alle = lijst(thread?.messages).filter(
      (mail) => !String(mail.labelIds).includes("DRAFT"),
    );
    const laatste = alle.at(-1);
    if (!laatste) return null;
    const mails = alle.slice(-AANTAL_MAILS).map((mail) => {
      const tekst = platteTekst(json(mail.payload)) || String(mail.snippet);
      return `Van: ${header(mail, "From")}\nAan: ${header(mail, "To")}\nOnderwerp: ${header(mail, "Subject")}\n\n${tekst.trim().slice(0, MAX_TEKENS)}`;
    });
    const onderwerp = header(laatste, "Subject");
    return {
      gesprek: mails.join("\n\n---\n\n"),
      antwoordAan: parseVan(
        header(laatste, "Reply-To") || header(laatste, "From"),
      ).adres,
      onderwerp: metRe(onderwerp),
    };
  } catch {
    return null;
  }
}
