import { after, connection } from "next/server";
import { ExternalLink } from "@/components/ExternalLink";
import { leesActies } from "@/lib/actiepunt";
import { leesVanMeetings } from "@/lib/actiepunten";
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
  conceptMail,
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
  const platforms = metLinks.map(({ slug, naam, roepnamen }) => ({
    slug,
    naam,
    roepnamen,
  }));
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
          new Set(
            leesNotulen(
              user.email,
              agenda.items.map((item) => item.id),
            ).map((rij) => rij.meetingId),
          ),
        )
      : [];

  // De getoonde week is al opgehaald; die hoeft niet nog een keer.
  const recent = await meetingsVoorNotulen(
    user.email,
    platforms,
    nu.getTime(),
    {
      maandag: week.maandag,
      agenda,
    },
  );
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
  // De mail en het Slack-kanaal voor de stap Delen.
  const deelInfo = (meeting: Meeting): DeelInfo => {
    const doel = deelKanaal(meeting, metLinks, regels);
    const rij = rijen.get(meeting.id);
    const mail = {
      ontvangers: poAdressen(
        metLinks.find((p) => p.slug === meeting.hoort)?.contactpersonen ?? [],
      ),
      genodigden: externeGenodigden(meeting.deelnemers, NORDAY_DOMEIN),
      ...conceptMail(
        meeting,
        rij?.paginaUrl ?? "",
        user.voornaam,
        leesActies(rij?.tekst ?? ""),
      ),
    };
    return {
      mail: meeting.extern ? mail : null,
      slack:
        "melding" in doel
          ? doel
          : { soort: "slack", naam: doel.naam, magSchrijven },
    };
  };
  const acties = Map.groupBy(
    leesVanMeetings(
      user.email,
      user.voornaam,
      alle.map((meeting) => meeting.id),
    ),
    (actie) => actie.meetingId,
  );
  const statussen: Record<string, NotulenStatus> = {};
  for (const meeting of alle) {
    const status = notulenStatus(
      meeting,
      rijen.get(meeting.id),
      vanaf,
      nu.getTime(),
    );
    if (!status) continue;
    // Ook na het delen: de overlay toont dan wat er verstuurd is.
    const delen = status.stap >= 5 && meeting.hoort !== PRIVE;
    statussen[meeting.id] = {
      ...status,
      delen: delen ? deelInfo(meeting) : null,
      acties: status.actiesUit ? (acties.get(meeting.id) ?? []) : null,
    };
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
