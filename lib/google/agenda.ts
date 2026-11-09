import { DEMO, demoAgenda } from "@/lib/demo";
import { heeftAgendaScope, vernieuwToken } from "@/lib/google/oauth";
import { parseStoredToken, validToken } from "@/lib/koppelingen";
import type { AgendaItem } from "@/lib/meetings";
import { dagPlus } from "@/lib/sprint";

/** De afspraken, of waarom ze er niet zijn: geen (agenda)toegang, of een andere fout. */
export type AgendaUitkomst =
  { items: AgendaItem[] } | { verbinden: true } | { fout: string };

type Deelnemer = {
  email?: string;
  self?: boolean;
  resource?: boolean;
  responseStatus?: string;
};

type GoogleEvent = {
  id?: string;
  recurringEventId?: string;
  summary?: string;
  status?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  attendees?: Deelnemer[];
};

function naarItem(event: GoogleEvent): AgendaItem[] {
  const start = event.start?.dateTime;
  const eind = event.end?.dateTime;
  // Hele dagen passen niet in de week van 9 tot 18 uur.
  if (!event.id || !start || !eind || event.status === "cancelled") return [];
  const deelnemers = event.attendees ?? [];
  // Afspraken die ik heb afgeslagen, tellen niet mee.
  if (deelnemers.some((d) => d.self && d.responseStatus === "declined"))
    return [];
  return [
    {
      id: event.id,
      serieId: event.recurringEventId ?? null,
      titel: event.summary?.trim() || "(geen titel)",
      start,
      eind,
      deelnemers: deelnemers.flatMap((d) =>
        d.email && !d.self && !d.resource ? [d.email] : [],
      ),
    },
  ];
}

/** De afspraken uit de hoofdagenda van maandag t/m vrijdag van deze week. */
export async function leesAgenda(
  email: string,
  maandag: string,
): Promise<AgendaUitkomst> {
  if (DEMO) return { items: demoAgenda(maandag) };
  const token = await validToken(email, "gmail", parseStoredToken, (_, oud) =>
    vernieuwToken(oud),
  );
  if (!token || !heeftAgendaScope(token)) return { verbinden: true };

  // Ruim genomen in UTC; bepaalMeetings houdt alleen ma–vr in Nederlandse tijd over.
  const params = new URLSearchParams({
    timeMin: `${dagPlus(maandag, -1)}T00:00:00Z`,
    timeMax: `${dagPlus(maandag, 6)}T00:00:00Z`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (response.status === 401) return { verbinden: true };
    if (!response.ok) {
      const tekst = await response.text();
      if (/insufficientPermissions|SCOPE_INSUFFICIENT/.test(tekst))
        return { verbinden: true };
      const melding = /"message":\s*"([^"]+)"/.exec(tekst)?.[1];
      return {
        fout: `Google Agenda gaf status ${response.status}${melding ? `: ${melding}` : ""}`,
      };
    }
    const data = (await response.json()) as { items?: GoogleEvent[] };
    return { items: (data.items ?? []).flatMap(naarItem) };
  } catch (fout) {
    return { fout: fout instanceof Error ? fout.message : String(fout) };
  }
}
