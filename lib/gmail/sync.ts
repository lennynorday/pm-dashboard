export type GmailProbleem = { toestaan: true } | { fout: string } | null;

/**
 * STUB, wordt ingevuld door de backend. Haalt mailgesprekken op en werkt de
 * Inbox bij. `{ toestaan: true }` = geen (werkende) Gmail-toegang.
 */
export async function synchroniseerGmail(
  email: string,
): Promise<GmailProbleem> {
  void email;
  return null;
}
