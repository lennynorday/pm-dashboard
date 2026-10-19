import { gmailGet } from "../gmail/api";
import { header, json, lijst } from "../gmail/gesprekken";

const AANTAL_MAILS = 3;
const MAX_TEKENS = 3000;

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
 * De laatste mails van een thread als tekst voor in de prompt, of null als Gmail
 * niet verbonden is of de thread niet te lezen is; de aanroeper valt dan terug op het bericht.
 */
export async function laatsteMails(
  email: string,
  threadId: string,
): Promise<string | null> {
  try {
    const thread = await gmailGet(
      email,
      `threads/${threadId}`,
      new URLSearchParams({ format: "full" }),
    );
    const mails = lijst(thread?.messages)
      .filter((mail) => !String(mail.labelIds).includes("DRAFT"))
      .slice(-AANTAL_MAILS)
      .map((mail) => {
        const tekst = platteTekst(json(mail.payload)) || String(mail.snippet);
        return `Van: ${header(mail, "From")}\nAan: ${header(mail, "To")}\nOnderwerp: ${header(mail, "Subject")}\n\n${tekst.trim().slice(0, MAX_TEKENS)}`;
      });
    return mails.length > 0 ? mails.join("\n\n---\n\n") : null;
  } catch {
    return null;
  }
}
