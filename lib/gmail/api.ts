import { vernieuwToken } from "@/lib/google/oauth";
import { parseStoredToken, validToken } from "@/lib/koppelingen";

/** Geen Gmail-toegang gegeven, of de toegang is ingetrokken. */
export class GmailNietVerbondenError extends Error {
  constructor() {
    super("Geen toegang tot Gmail");
  }
}

/** Eén GET op de Gmail API met het token van de gebruiker; `pad` na `users/me/`. Null als het niet (meer) bestaat. */
export async function gmailGet(
  email: string,
  pad: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const token = await validToken(email, "gmail", parseStoredToken, (_, oud) =>
    vernieuwToken(oud),
  );
  if (!token) throw new GmailNietVerbondenError();

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/${pad}?${params}`,
    { headers: { Authorization: `Bearer ${token.accessToken}` }, signal },
  );
  if (response.status === 401) throw new GmailNietVerbondenError();
  if (response.status === 404) return null;
  if (!response.ok) {
    const tekst = await response.text();
    // Een 403 is alleen een kwestie van toegang als de scope ontbreekt; anders
    // is het bijvoorbeeld de aanvraaglimiet of een uitgeschakelde Gmail API.
    if (/insufficientPermissions|SCOPE_INSUFFICIENT/.test(tekst)) {
      throw new GmailNietVerbondenError();
    }
    const melding = /"message":\s*"([^"]+)"/.exec(tekst)?.[1];
    throw new Error(
      `Gmail gaf status ${response.status} bij ${pad}${melding ? `: ${melding}` : ""}`,
    );
  }
  const data: unknown = await response.json();
  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : {};
}
