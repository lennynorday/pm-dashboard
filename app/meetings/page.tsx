import { after, connection } from "next/server";
import { ExternalLink } from "@/components/ExternalLink";
import { Meetings } from "@/components/Meetings";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { VerbindLink } from "@/components/VerbindLink";
import { loadDashboard } from "@/lib/dashboard";
import { leesAgenda } from "@/lib/google/agenda";
import { NORDAY_DOMEIN } from "@/lib/google/oauth";
import { leesOvergeslagen, leesRegels } from "@/lib/meeting-regels";
import { bepaalMeetings, lokaal, type Meeting, weekVan } from "@/lib/meetings";
import {
  leesNotulen,
  meetingsVoorNotulen,
  notulenVanaf,
  verwerkNotulen,
} from "@/lib/notulen";
import {
  nogTeDoen,
  notulenStatus,
  type NotulenStatus,
} from "@/lib/notulen-stand";
import { currentUser } from "@/lib/session";

const HOME = { label: "Overzicht", href: "/" };

export default async function MeetingsPage({
  searchParams,
}: PageProps<"/meetings">) {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;

  const nu = new Date();
  const vandaag = lokaal(nu.toISOString());
  const params = await searchParams;
  const gevraagd = params.week;
  const week = weekVan(
    typeof gevraagd === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(gevraagd) &&
      !Number.isNaN(Date.parse(gevraagd))
      ? gevraagd
      : vandaag.datum,
  );
  const [dashboard, agenda] = await Promise.all([
    loadDashboard(),
    leesAgenda(user.email, week.maandag),
  ]);
  const platforms =
    dashboard.status === "ok"
      ? dashboard.platforms.map(({ slug, naam }) => ({ slug, naam }))
      : [];
  // Bij het openen een ronde notulen; zonder Orbit zou alles op Privé vallen.
  if (dashboard.status === "ok") {
    const metLinks = dashboard.platforms.map(({ slug, naam, gegevens }) => ({
      slug,
      naam,
      links: gegevens.links,
    }));
    after(() => verwerkNotulen(user.email, metLinks));
  }
  const meetings =
    "items" in agenda
      ? bepaalMeetings(
          agenda.items,
          week,
          platforms,
          leesRegels(user.email),
          leesOvergeslagen(user.email),
          NORDAY_DOMEIN,
          nu.getTime(),
        )
      : [];

  const recent = await meetingsVoorNotulen(user.email, platforms, nu.getTime());
  const notulenMeetings = "fout" in recent ? [] : recent;
  const alle = [...meetings, ...notulenMeetings];
  const rijen = new Map(
    leesNotulen(
      user.email,
      alle.map((meeting) => meeting.id),
    ).map((rij) => [rij.meetingId, rij]),
  );
  const vanaf = notulenVanaf(user.email);
  const statussen: Record<string, NotulenStatus> = {};
  for (const meeting of alle) {
    const status = notulenStatus(
      meeting,
      rijen.get(meeting.id),
      vanaf,
      nu.getTime(),
    );
    if (status) statussen[meeting.id] = status;
  }
  const teDoen: Meeting[] = notulenMeetings
    .filter((meeting) => nogTeDoen(statussen[meeting.id] ?? null))
    .reverse();
  const gekozen = typeof params.meeting === "string" ? params.meeting : null;

  return (
    <>
      <PageHeading
        title="Meetings"
        crumbs={[HOME]}
        aside={
          <ExternalLink
            href={`https://calendar.google.com/calendar/r/week/${week.maandag.replaceAll("-", "/")}`}
            className="nd-button nd-button--quiet"
          >
            Open Google Agenda
          </ExternalLink>
        }
      />

      {"verbinden" in agenda && (
        <Melding
          titel="Geen toegang tot Google Agenda"
          actie={
            <VerbindLink href="/api/google/login" className="nd-button">
              Opnieuw verbinden
            </VerbindLink>
          }
        >
          Verbind opnieuw met Google en geef toestemming om je agenda te lezen.
        </Melding>
      )}
      {"fout" in agenda && (
        <Melding titel="Ophalen uit Google Agenda is mislukt" role="alert">
          {agenda.fout}
        </Melding>
      )}

      <Meetings
        key={week.maandag}
        week={week}
        meetings={meetings}
        platforms={platforms}
        vandaag={vandaag}
        statussen={statussen}
        teDoen={teDoen}
        gekozen={gekozen}
      />
    </>
  );
}
