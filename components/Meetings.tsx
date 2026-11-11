"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  koppelMeetingAction,
  type MeetingRef,
  slaMeetingOverAction,
  zetMeetingTerugAction,
} from "@/app/actions";
import {
  type Meeting,
  type PlatformNaam,
  PRIVE,
  type Scope,
  TEAM,
  titelWoord,
  type Week,
  weekVan,
} from "@/lib/meetings";
import type { NotulenStatus } from "@/lib/notulen-stand";
import { dagPlus } from "@/lib/sprint";
import { formatUren } from "@/lib/format";
import { CheckIcon, ChevronIcon, PencilIcon, RefreshIcon } from "./icons";
import verversen from "./InboxVerversen.module.css";
import orbit from "./OrbitStatus.module.css";
import { Checklist, Dot, Legenda, StatusIcoon } from "./NotulenStappen";
import { TodosMenu } from "./TodosMenu";
import styles from "./Meetings.module.css";

type Props = {
  week: Week;
  meetings: Meeting[];
  platforms: PlatformNaam[];
  vandaag: { datum: string; minuten: number };
  /** De notulenstatus per meeting-id, ook van de meetings in Notulen te doen. */
  statussen: Record<string, NotulenStatus>;
  /** Afgelopen meetings van deze en vorige werkweek die nog niet klaar zijn, nieuwste eerst. */
  teDoen: Meeting[];
  /** Het id uit ?meeting=, bijvoorbeeld vanuit de inbox. */
  gekozen: string | null;
};

const DAGNAMEN = ["Ma", "Di", "Wo", "Do", "Vr"];
const BEGIN = 9 * 60;
const EIND = 18 * 60;
const dagMaand = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const kort = (datum: string) =>
  dagMaand.format(Date.parse(`${datum}T00:00:00Z`)).replaceAll(".", "");

function status(meeting: Meeting, notulen?: NotulenStatus): string {
  if (notulen) return notulen.tekst;
  if (meeting.overgeslagen) return "Geen notulen";
  if (meeting.afgelopen) return "Afgelopen";
  return "Gepland";
}

function soort(meeting: Meeting): string {
  if (meeting.hoort === TEAM || meeting.hoort === PRIVE) return meeting.hoort;
  return "platform";
}

const ref = ({ id, serieId, titel, start }: Meeting): MeetingRef => ({
  id,
  serieId,
  titel,
  start,
});

/** De Meetings-pagina: werkweek of lijst, met rechts het paneel van de gekozen meeting. */
export function Meetings({
  week,
  meetings,
  platforms,
  vandaag,
  statussen,
  teDoen,
  gekozen: vooraf,
}: Props) {
  const [weergave, setWeergave] = useState<"week" | "lijst">("week");
  const [filter, setFilter] = useState<string | null>(null);
  const router = useRouter();
  const [ophalen, startOphalen] = useTransition();
  const [gekozenId, setGekozenId] = useState<string | null>(vooraf);
  const gekozen =
    [...meetings, ...teDoen].find((meeting) => meeting.id === gekozenId) ??
    null;
  const huidig = week.dagen.includes(vandaag.datum);
  const past = (meeting: Meeting) => !filter || meeting.hoort === filter;
  const kies = (meeting: Meeting) =>
    setGekozenId(gekozenId === meeting.id ? null : meeting.id);

  // Uren in overleg deze week, per platform, Team en Privé.
  const minuten = new Map<string, number>();
  for (const meeting of meetings) {
    minuten.set(
      meeting.hoort,
      (minuten.get(meeting.hoort) ?? 0) + meeting.eind - meeting.begin,
    );
  }
  const uren = (totaal = 0) => (totaal ? ` (${formatUren(totaal)} u)` : "");
  const opties = [
    ...platforms.filter((platform) => minuten.has(platform.slug)),
    { slug: TEAM, naam: "Team" },
    { slug: PRIVE, naam: "Privé" },
  ];
  const actief = opties.find((optie) => optie.slug === filter)?.naam;

  return (
    <div className={styles.meetings}>
      <div className={styles.balk}>
        <div className={styles.weeknav}>
          <NextLink
            href={`?week=${dagPlus(week.maandag, -7)}`}
            className="nd-icon-button nd-icon-button--small"
            aria-label="Vorige week"
          >
            <ChevronIcon className={styles.pijlVorige} />
          </NextLink>
          <span className={styles.weekLabel} aria-live="polite">
            {week.label}
          </span>
          <NextLink
            href={`?week=${dagPlus(week.maandag, 7)}`}
            className="nd-icon-button nd-icon-button--small"
            aria-label="Volgende week"
          >
            <ChevronIcon className={styles.pijlVolgende} />
          </NextLink>
          <NextLink
            href="/meetings"
            className="nd-button nd-button--small nd-button--quiet"
            aria-current={huidig ? "date" : undefined}
          >
            Vandaag
          </NextLink>
        </div>
        <div className="nd-filters" role="group" aria-label="Weergave">
          <button
            type="button"
            className="nd-filter"
            aria-pressed={weergave === "week"}
            onClick={() => setWeergave("week")}
          >
            Week
          </button>
          <button
            type="button"
            className="nd-filter"
            aria-pressed={weergave === "lijst"}
            onClick={() => setWeergave("lijst")}
          >
            Lijst
          </button>
        </div>
        <div className={styles.filter}>
          <TodosMenu
            knopClass={`nd-button nd-button--small nd-button--quiet ${filter ? styles.filterActief : ""}`}
            ariaLabel={`Filter: ${actief ?? "Alle platforms"}, met uren in overleg deze week`}
            items={[
              {
                label: `Alle platforms${uren([...minuten.values()].reduce((a, b) => a + b, 0))}`,
                gekozen: filter === null,
                kies: () => setFilter(null),
              },
              ...opties.map((optie) => ({
                label: `${optie.naam}${uren(minuten.get(optie.slug))}`,
                gekozen: filter === optie.slug,
                scheiding: optie.slug === TEAM,
                kies: () => setFilter(optie.slug),
              })),
            ]}
          >
            {actief ?? "Alle platforms"}
            <ChevronIcon className={styles.filterPijl} />
          </TodosMenu>
        </div>
        <button
          className={verversen.knop}
          type="button"
          disabled={ophalen}
          aria-busy={ophalen}
          onClick={() => startOphalen(() => router.refresh())}
        >
          <RefreshIcon
            className={`${orbit.icoon} ${ophalen ? orbit.draait : ""}`}
          />
          {ophalen ? "Ophalen…" : "Verversen"}
        </button>
      </div>

      <div className={styles.indeling}>
        <div>
          {weergave === "week" ? (
            <WeekGrid
              week={week}
              meetings={meetings}
              statussen={statussen}
              vandaag={vandaag}
              gekozenId={gekozenId}
              past={past}
              kies={kies}
            />
          ) : (
            <Lijst
              week={week}
              meetings={meetings.filter(past)}
              statussen={statussen}
              vandaag={vandaag.datum}
              gekozenId={gekozenId}
              kies={kies}
            />
          )}
        </div>
        <aside className={styles.paneel} aria-label="Meeting">
          <section className={`nd-card ${styles.kaart}`}>
            {gekozen ? (
              <Detail
                key={gekozen.id}
                meeting={gekozen}
                status={statussen[gekozen.id]}
                platforms={platforms}
                terug={() => setGekozenId(null)}
              />
            ) : (
              <Overzicht
                meetings={teDoen}
                statussen={statussen}
                vandaag={vandaag.datum}
                kies={kies}
              />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

type WeekProps = {
  week: Week;
  meetings: Meeting[];
  statussen: Record<string, NotulenStatus>;
  vandaag: { datum: string; minuten: number };
  gekozenId: string | null;
  past: (meeting: Meeting) => boolean;
  kies: (meeting: Meeting) => void;
};

function WeekGrid({
  week,
  meetings,
  statussen,
  vandaag,
  gekozenId,
  past,
  kies,
}: WeekProps) {
  const nuZichtbaar = vandaag.minuten >= BEGIN && vandaag.minuten <= EIND;
  return (
    <div className={styles.week} role="region" aria-label={week.label}>
      <span />
      {week.dagen.map((dag, index) => (
        <span
          key={dag}
          className={styles.dagkop}
          aria-current={dag === vandaag.datum ? "date" : undefined}
        >
          {DAGNAMEN[index]}
          <span
            className={styles.dagDatum}
            data-vandaag={dag === vandaag.datum || undefined}
          >
            {kort(dag)}
            {dag === vandaag.datum && " · vandaag"}
          </span>
        </span>
      ))}
      <div className={styles.uren} aria-hidden="true">
        {Array.from({ length: 9 }, (_, uur) => (
          <span
            key={uur}
            className={styles.uur}
            style={{ "--start": uur } as React.CSSProperties}
          >
            {9 + uur}:00
          </span>
        ))}
      </div>
      {week.dagen.map((dag) => (
        <div
          key={dag}
          className={styles.dag}
          data-vandaag={dag === vandaag.datum || undefined}
        >
          {meetings
            .filter((m) => m.datum === dag && m.eind > BEGIN && m.begin < EIND)
            .map((meeting) => {
              const begin = Math.max(meeting.begin, BEGIN);
              const duur = (Math.min(meeting.eind, EIND) - begin) / 60;
              const notulen = statussen[meeting.id];
              return (
                <button
                  key={meeting.id}
                  type="button"
                  className={styles.afspraak}
                  data-soort={soort(meeting)}
                  data-kort={duur < 0.5 || undefined}
                  data-overgeslagen={meeting.overgeslagen !== null || undefined}
                  data-stand={notulen?.stand}
                  data-vervaagd={!past(meeting) || undefined}
                  aria-pressed={gekozenId === meeting.id}
                  title={`${meeting.titel}, ${meeting.label}${notulen ? `, ${notulen.tekst}` : ""}`}
                  style={
                    {
                      "--start": (begin - BEGIN) / 60,
                      "--duur": duur,
                      "--kolom": meeting.kolom,
                      "--kolommen": meeting.kolommen,
                    } as React.CSSProperties
                  }
                  onClick={() => kies(meeting)}
                >
                  <strong className={styles.afspraakTitel}>
                    {meeting.titel}
                  </strong>
                  {duur >= 0.75 && (
                    <span className={styles.afspraakMeta} aria-hidden="true">
                      {meeting.van} · {meeting.label}
                    </span>
                  )}
                  <span className="nd-visually-hidden">
                    , {meeting.van}–{meeting.tot}, {meeting.label}
                    {notulen && `, ${notulen.tekst}`}
                  </span>
                  {notulen && (
                    <Dot
                      stand={notulen.stand}
                      stap={notulen.stap}
                      className={styles.icoon}
                    />
                  )}
                </button>
              );
            })}
          {dag === vandaag.datum && nuZichtbaar && (
            <span
              className={styles.nu}
              style={
                {
                  "--start": (vandaag.minuten - BEGIN) / 60,
                } as React.CSSProperties
              }
              aria-hidden="true"
            />
          )}
        </div>
      ))}
      <Legenda />
    </div>
  );
}

type LijstProps = {
  week: Week;
  meetings: Meeting[];
  statussen: Record<string, NotulenStatus>;
  vandaag: string;
  gekozenId: string | null;
  kies: (meeting: Meeting) => void;
};

function Lijst({
  week,
  meetings,
  statussen,
  vandaag,
  gekozenId,
  kies,
}: LijstProps) {
  return (
    <div>
      {week.dagen.map((dag, index) => {
        const rijen = meetings.filter((meeting) => meeting.datum === dag);
        return (
          <section key={dag} className={styles.lijstGroep}>
            <h2 className={styles.lijstKop}>
              {DAGNAMEN[index]} {kort(dag)}
              {dag === vandaag && " · vandaag"}
            </h2>
            <ul className={styles.rijen}>
              {rijen.length === 0 && <li className="nd-meta">Geen meetings</li>}
              {rijen.map((meeting) => {
                const notulen = statussen[meeting.id];
                return (
                  <li key={meeting.id}>
                    <button
                      type="button"
                      className={styles.lijstRij}
                      aria-pressed={gekozenId === meeting.id}
                      onClick={() => kies(meeting)}
                    >
                      <span className={styles.tijd}>
                        {meeting.van}–{meeting.tot}
                      </span>
                      <span className={styles.lijstTitel}>{meeting.titel}</span>
                      <span className="nd-meta">{meeting.label}</span>
                      <span className={styles.lijstStatus}>
                        {notulen && (
                          <Dot stand={notulen.stand} stap={notulen.stap} />
                        )}
                        <span className="nd-meta">
                          {status(meeting, notulen)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

type OverzichtProps = {
  meetings: Meeting[];
  statussen: Record<string, NotulenStatus>;
  vandaag: string;
  kies: (meeting: Meeting) => void;
};

/** Notulen te doen: deze en vorige werkweek, wat nog niet klaar is. */
function Overzicht({ meetings, statussen, vandaag, kies }: OverzichtProps) {
  const maandag = weekVan(vandaag).maandag;
  return (
    <>
      <div className="nd-card__head">
        <h2 className="nd-title">Notulen te doen</h2>
        <span className="nd-badge">{meetings.length}</span>
      </div>
      <p className={`nd-meta ${styles.teDoenUitleg}`}>
        Deze en vorige werkweek
      </p>
      <ul className={styles.rijen}>
        {meetings.length === 0 && (
          <li className="nd-meta">Niets meer te doen.</li>
        )}
        {meetings.map((meeting) => {
          const notulen = statussen[meeting.id];
          if (!notulen) return null;
          const dag =
            DAGNAMEN[new Date(`${meeting.datum}T00:00:00Z`).getUTCDay() - 1];
          return (
            <li key={meeting.id}>
              <button
                type="button"
                className={styles.teDoenRij}
                onClick={() => kies(meeting)}
              >
                <span className="nd-row__title">{meeting.titel}</span>
                <span className={styles.teDoenMeta}>
                  <span
                    className="nd-status"
                    data-status={
                      notulen.stand === "jij" ? "open" : notulen.stand
                    }
                  >
                    <StatusIcoon stand={notulen.stand} stap={notulen.stap} />
                    {notulen.tekst}
                  </span>
                  <span className="nd-meta">
                    {meeting.datum < maandag
                      ? "vorige week"
                      : `${dag} ${meeting.van}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

type DetailProps = {
  meeting: Meeting;
  status: NotulenStatus | undefined;
  platforms: PlatformNaam[];
  terug: () => void;
};

function Detail({ meeting, status, platforms, terug }: DetailProps) {
  const [bezig, startTransition] = useTransition();
  const dag = DAGNAMEN[new Date(`${meeting.datum}T00:00:00Z`).getUTCDay() - 1];
  const [fout, setFout] = useState<string | null>(null);
  const doe = (actie: () => Promise<void>) => startTransition(actie);
  const koppel = (doel: string, scope: Scope) =>
    startTransition(async () => {
      setFout(await koppelMeetingAction(ref(meeting), doel, scope));
    });

  return (
    <div className={styles.detail} aria-busy={bezig}>
      <button
        type="button"
        className={`nd-button nd-button--small nd-button--quiet ${styles.terug}`}
        onClick={terug}
      >
        <ChevronIcon className={styles.pijlVorige} />
        Terug
      </button>
      <h2 className={`nd-title ${styles.detailTitel}`}>{meeting.titel}</h2>
      <p className="nd-meta">
        {dag} {kort(meeting.datum)} · {meeting.van}–{meeting.tot}
        {meeting.serieId && " · terugkerend"}
      </p>
      <div className={styles.chips}>
        {status?.lopend && (
          <span className="nd-chip" data-tint="lilac-soft">
            Bezig
          </span>
        )}
        {soort(meeting) === "platform" && (
          <span
            className="nd-chip"
            data-tint={meeting.extern ? "lilac" : "yellow-soft"}
          >
            {meeting.extern ? "Extern" : "Intern"}
          </span>
        )}
        <HoortMenu meeting={meeting} platforms={platforms} kies={koppel} />
      </div>
      {fout && (
        <p role="alert" className={styles.uitleg}>
          {fout}
        </p>
      )}

      {status && meeting.overgeslagen && (
        <p className={styles.statuskop}>
          <Dot stand={status.stand} stap={status.stap} />
          {status.tekst}
        </p>
      )}
      {status && !meeting.overgeslagen && (
        <Checklist meeting={meeting} status={status} />
      )}
      {meeting.overgeslagen && (
        <>
          <p className={styles.uitleg}>{UITLEG[meeting.overgeslagen]}</p>
          <div className={styles.linkKnoppen}>
            {meeting.overgeslagen === "prive" ? (
              <AanzetKnop
                meeting={meeting}
                kies={(scope) => koppel(PRIVE, scope)}
              />
            ) : (
              <button
                type="button"
                className={styles.linkKnop}
                onClick={() => doe(() => zetMeetingTerugAction(ref(meeting)))}
              >
                {meeting.overgeslagen === "serie"
                  ? "Serie terugzetten"
                  : "Terugzetten"}
              </button>
            )}
          </div>
        </>
      )}
      {!meeting.overgeslagen && (
        <div className={styles.linkKnoppen}>
          {meeting.serieId ? (
            <TodosMenu
              knopClass={styles.linkKnop}
              ariaLabel="Geen notulen"
              items={[
                {
                  label: "Alleen deze meeting",
                  kies: () =>
                    doe(() => slaMeetingOverAction(ref(meeting), false)),
                },
                {
                  label: "Hele serie",
                  kies: () =>
                    doe(() => slaMeetingOverAction(ref(meeting), true)),
                },
              ]}
            >
              Geen notulen
            </TodosMenu>
          ) : (
            <button
              type="button"
              className={styles.linkKnop}
              onClick={() =>
                doe(() => slaMeetingOverAction(ref(meeting), false))
              }
            >
              Geen notulen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const UITLEG = {
  meeting: "Deze meeting sla je over.",
  serie: "Deze serie sla je over.",
  prive: "Overgeslagen: niet aan een platform gekoppeld.",
};

/** "Toch notulen maken": een handmatige Privé-regel, die het automatisch overslaan opheft. */
function AanzetKnop({
  meeting,
  kies,
}: {
  meeting: Meeting;
  kies: (scope: Scope) => void;
}) {
  if (!meeting.serieId) {
    return (
      <button
        type="button"
        className={styles.linkKnop}
        onClick={() => kies("deze")}
      >
        Toch notulen maken
      </button>
    );
  }
  return (
    <TodosMenu
      knopClass={styles.linkKnop}
      ariaLabel="Toch notulen maken"
      items={[
        { label: "Alleen deze meeting", kies: () => kies("deze") },
        { label: "Hele serie", kies: () => kies("serie") },
      ]}
    >
      Toch notulen maken
    </TodosMenu>
  );
}

type HoortMenuProps = {
  meeting: Meeting;
  platforms: PlatformNaam[];
  kies: (doel: string, scope: Scope) => void;
};

/** De pil met het potloodje: kies het platform, Team of Privé, en voor welke meetings dat geldt. */
function HoortMenu({ meeting, platforms, kies }: HoortMenuProps) {
  const knop = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [scope, setScope] = useState<Scope>(meeting.serieId ? "serie" : "deze");
  const woord = titelWoord(meeting.titel);
  const doelen = [
    ...[...platforms].sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
    { slug: TEAM, naam: "Team-overleg (geen project)" },
    { slug: PRIVE, naam: "Privé (alleen voor mij, niet delen)" },
  ];

  function toggle() {
    // Een klik op de knop sluit het menu al via "klikken buiten".
    const sluitKlik = wasOpen.current;
    wasOpen.current = false;
    if (sluitKlik || !knop.current || !menu.current) return;
    const rect = knop.current.getBoundingClientRect();
    menu.current.style.top = `${rect.bottom + 6}px`;
    menu.current.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 328))}px`;
    menu.current.showPopover();
  }

  return (
    <>
      <button
        ref={knop}
        type="button"
        className={styles.pil}
        title={meeting.label}
        aria-haspopup="dialog"
        onPointerDown={() => {
          wasOpen.current = !!menu.current?.matches(":popover-open");
        }}
        onClick={toggle}
      >
        <span className={styles.pilTekst}>{meeting.label}</span>
        <PencilIcon className={styles.pilIcoon} />
        <span className="nd-visually-hidden">
          : wijzig waar deze meeting bij hoort
        </span>
      </button>
      <div
        ref={menu}
        popover="auto"
        role="dialog"
        aria-label="Hoort bij"
        className={`nd-menu ${styles.hoortMenu}`}
        onToggle={(e) => {
          if (e.newState === "open")
            menu.current
              ?.querySelector<HTMLElement>("[aria-pressed=true], button")
              ?.focus();
        }}
      >
        <p className={styles.menuKop}>Hoort bij</p>
        <ul className={styles.doelen}>
          {doelen.map((doel) => (
            <li key={doel.slug}>
              {doel.slug === TEAM && <hr className="nd-menu__divider" />}
              <button
                type="button"
                className="nd-menu__item"
                aria-pressed={meeting.hoort === doel.slug}
                // Een titelwoord wordt een roepnaam van een platform; Team en Privé hebben die niet.
                disabled={
                  scope === "titel" &&
                  (doel.slug === TEAM || doel.slug === PRIVE)
                }
                onClick={() => {
                  menu.current?.hidePopover();
                  kies(doel.slug, scope);
                }}
              >
                {doel.naam}
                {meeting.hoort === doel.slug && (
                  <CheckIcon className={styles.vink} />
                )}
              </button>
            </li>
          ))}
        </ul>
        <fieldset className={styles.menuScope}>
          <legend className="nd-visually-hidden">Voor welke meetings</legend>
          <label className={styles.keuze}>
            <input
              type="radio"
              name="scope"
              checked={scope === "deze"}
              onChange={() => setScope("deze")}
            />
            Alleen deze meeting
          </label>
          {meeting.serieId ? (
            <label className={styles.keuze}>
              <input
                type="radio"
                name="scope"
                checked={scope === "serie"}
                onChange={() => setScope("serie")}
              />
              Deze en alle volgende in deze reeks
            </label>
          ) : (
            <label className={styles.keuze}>
              <input
                type="radio"
                name="scope"
                checked={scope === "titel"}
                onChange={() => setScope("titel")}
              />
              Ook toekomstige meetings met &quot;{woord}&quot; in de titel
            </label>
          )}
        </fieldset>
      </div>
    </>
  );
}
