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
import {
  bepaalMeetings,
  lokaal,
  type Meeting,
  PRIVE,
  weekVan,
} from "@/lib/meetings";
import {
  alsNotulenPlatform,
  leesNotulen,
  meetingsVoorNotulen,
  notulenVanaf,
  verwerkNotulen,
} from "@/lib/notulen";
import {
  type DeelInfo,
  deelKanaal,
  externeGenodigden,
  poAdressen,
} from "@/lib/notulen-delen";
import {
  nogTeDoen,
  notulenStatus,
  type NotulenStatus,
} from "@/lib/notulen-stand";
import { currentUser } from "@/lib/session";
import { slackMagSchrijven } from "@/lib/slack/api";

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
  const metLinks =
    dashboard.status === "ok"
      ? dashboard.platforms.map(alsNotulenPlatform)
      : [];
  const platforms = metLinks.map(({ slug, naam }) => ({ slug, naam }));
  // Bij het openen een ronde notulen; zonder Orbit zou alles op Privé vallen.
  if (dashboard.status === "ok") {
    after(() => verwerkNotulen(user.email, metLinks));
  }
  const regels = leesRegels(user.email);
  const meetings =
    "items" in agenda
      ? bepaalMeetings(
          agenda.items,
          week,
          platforms,
          regels,
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
  const magSchrijven = await slackMagSchrijven(user.email);
  // Ontvangers of kanaal voor de stap Gedeeld.
  const deelInfo = (meeting: Meeting): DeelInfo => {
    if (meeting.extern) {
      return {
        soort: "gmail",
        ontvangers: poAdressen(
          metLinks.find((p) => p.slug === meeting.hoort)?.contactpersonen ?? [],
        ),
        genodigden: externeGenodigden(meeting.deelnemers, NORDAY_DOMEIN),
      };
    }
    const doel = deelKanaal(meeting, metLinks, regels);
    if ("melding" in doel) return doel;
    return { soort: "slack", naam: doel.naam, magSchrijven };
  };
  const statussen: Record<string, NotulenStatus> = {};
  for (const meeting of alle) {
    const status = notulenStatus(
      meeting,
      rijen.get(meeting.id),
      vanaf,
      nu.getTime(),
    );
    if (!status) continue;
    const delen = status.stap === 5 && meeting.hoort !== PRIVE;
    statussen[meeting.id] = delen
      ? { ...status, delen: deelInfo(meeting) }
      : status;
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
