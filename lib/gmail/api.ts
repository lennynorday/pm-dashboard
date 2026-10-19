import { heeftComposeScope, vernieuwToken } from "@/lib/google/oauth";
import { parseStoredToken, validToken } from "@/lib/koppelingen";

/** Geen Gmail-toegang gegeven, of de toegang is ingetrokken. */
export class GmailNietVerbondenError extends Error {
  constructor() {
    super("Geen toegang tot Gmail");
  }
}

/** Gmail is verbonden, maar het token mag geen concepten maken: opnieuw verbinden met Google. */
export class GmailComposeOntbreektError extends Error {
  constructor() {
    super("Geen toestemming om concepten in Gmail te maken");
  }
}

/** Eén aanroep op de Gmail API met het token van de gebruiker; `pad` na `users/me/`. Null als het niet (meer) bestaat. */
async function gmailVraag(
  email: string,
  pad: string,
  params: URLSearchParams,
  init: RequestInit,
  eisCompose: boolean,
): Promise<Record<string, unknown> | null> {
  const token = await validToken(email, "gmail", parseStoredToken, (_, oud) =>
    vernieuwToken(oud),
  );
  if (!token) throw new GmailNietVerbondenError();
  if (eisCompose && !heeftComposeScope(token)) {
    throw new GmailComposeOntbreektError();
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/${pad}?${params}`,
    {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token.accessToken}`,
      },
    },
  );
  if (response.status === 401) throw new GmailNietVerbondenError();
  if (response.status === 404) return null;
  if (!response.ok) {
    const tekst = await response.text();
    // Een 403 is alleen een kwestie van toegang als de scope ontbreekt; anders
    // is het bijvoorbeeld de aanvraaglimiet of een uitgeschakelde Gmail API.
    if (/insufficientPermissions|SCOPE_INSUFFICIENT/.test(tekst)) {
      throw eisCompose
        ? new GmailComposeOntbreektError()
        : new GmailNietVerbondenError();
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

/** Eén GET op de Gmail API. */
export const gmailGet = (
  email: string,
  pad: string,
  params: URLSearchParams,
  signal?: AbortSignal,
) => gmailVraag(email, pad, params, { signal }, false);

/**
 * Eén POST met een JSON-body. Alleen voor concepten: vraagt de compose-scope en
 * geeft GmailComposeOntbreektError (en niet GmailNietVerbondenError) als die ontbreekt.
 */
export const gmailPost = (email: string, pad: string, body: unknown) =>
  gmailVraag(
    email,
    pad,
    new URLSearchParams(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    },
    true,
  );
