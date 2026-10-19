import { gmailGet, gmailPost } from "./api";
import { bouwAntwoord } from "./antwoord";
import { header, json, lijst } from "./gesprekken";

/**
 * Zet een antwoord klaar als concept in hetzelfde Gmail-gesprek (`drafts.create`
 * met `threadId`). Er wordt niets verstuurd. Geeft het draft-id en de link om het te openen.
 */
export async function zetConceptKlaar(
  email: string,
  threadId: string,
  concept: { aan: string; onderwerp: string; tekst: string },
): Promise<{ draftId: string; url: string }> {
  // In-Reply-To en References komen van de laatste mail in de thread (zonder concepten).
  const thread = await gmailGet(
    email,
    `threads/${threadId}`,
    new URLSearchParams([
      ["format", "metadata"],
      ...["Message-ID", "References"].map((kop) => ["metadataHeaders", kop]),
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
        inReplyTo: header(laatste, "Message-ID") || null,
        references: header(laatste, "References") || null,
      }),
    },
  });
  const draftId = gemaakt?.id;
  const berichtId = json(gemaakt?.message).id;
  if (typeof draftId !== "string" || typeof berichtId !== "string") {
    throw new Error("Gmail gaf geen concept terug");
  }
  return {
    draftId,
    url: `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#drafts?compose=${berichtId}`,
  };
}
