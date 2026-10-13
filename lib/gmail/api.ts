import { vernieuwToken } from "@/lib/google/oauth";
import { parseStoredToken, validToken } from "@/lib/koppelingen";

/** Geen Gmail-toegang gegeven, of de toegang is ingetrokken. */
export class GmailNietVerbondenError extends Error {
  constructor() {
    super("Geen toegang tot Gmail");
  }
}

/** Eén GET op de Gmail API met het token van de gebruiker; `pad` na `users/me/`. */
export async function gmailGet(
  email: string,
  pad: string,
  params: URLSearchParams,
): Promise<Record<string, unknown>> {
  const token = await validToken(email, "gmail", parseStoredToken, (_, oud) =>
    vernieuwToken(oud),
  );
  if (!token) throw new GmailNietVerbondenError();

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/${pad}?${params}`,
    { headers: { Authorization: `Bearer ${token.accessToken}` } },
  );
  // Een 403 kan ook de aanvraaglimiet zijn; dat is geen kwestie van toegang.
  const limiet =
    response.status === 403 &&
    /rateLimitExceeded/i.test(await response.text());
  if (response.status === 401 || (response.status === 403 && !limiet)) {
    throw new GmailNietVerbondenError();
  }
  if (!response.ok) {
    throw new Error(`Gmail gaf status ${response.status} bij ${pad}`);
  }
  const data: unknown = await response.json();
  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : {};
}
