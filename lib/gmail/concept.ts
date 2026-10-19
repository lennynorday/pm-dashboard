import { gmailGet, gmailPost } from "./api";
import { bouwAntwoord, metRe } from "./antwoord";
import { header, json, lijst } from "./gesprekken";

/**
 * Zet een antwoord klaar als concept in hetzelfde Gmail-gesprek (`drafts.create`
 * met `threadId`). Er wordt niets verstuurd. Geeft de link om het te openen.
 */
export async function zetConceptKlaar(
  email: string,
  threadId: string,
  concept: { aan: string; tekst: string },
): Promise<string> {
  // In-Reply-To en References komen van de laatste mail in de thread (zonder concepten).
  const thread = await gmailGet(
    email,
    `threads/${threadId}`,
    new URLSearchParams([
      ["format", "metadata"],
      ...["Message-ID", "References", "Subject"].map((kop) => [
        "metadataHeaders",
        kop,
      ]),
    ]),
  );
  const laatste = lijst(thread?.messages)
    .filter((mail) => !String(mail.labelIds).includes("DRAFT"))
    .at(-1);
  if (!laatste) throw new Error("Het Gmail-gesprek bestaat niet meer");

  const gemaakt = await gmailPost(email, "drafts", {
    message: {
      threadId,
      raw: bouwAntwoord({
        ...concept,
        // Het onderwerp van de laatste mail zelf, niet de titel van de to-do.
        onderwerp: metRe(header(laatste, "Subject") || "(geen onderwerp)"),
        inReplyTo: header(laatste, "Message-ID") || null,
        references: header(laatste, "References") || null,
      }),
    },
  });
  const berichtId = json(gemaakt?.message).id;
  if (typeof berichtId !== "string")
    throw new Error("Gmail gaf geen concept terug");
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#drafts?compose=${berichtId}`;
}
