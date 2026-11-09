"use client";

import NextLink from "next/link";
import { useEffect, useState } from "react";
import {
  gedaanAction,
  slaMeetingOverAction,
  naarTodoAction,
  sluitUitAction,
  staToeAction,
  verplaatsTaakAction,
  zetGezienAction,
  zetMeetingTerugAction,
  zetStatusAction,
} from "@/app/actions";
import {
  BRON_LABELS,
  domeinVan,
  STATUS_LABELS,
  type Prio,
  type Taak,
} from "@/lib/taak";
import { maandagVan } from "@/lib/sprint";
import type { VastgelopenMeeting } from "@/lib/notulen";
import { ExternalLink } from "./ExternalLink";
import {
  BlockIcon,
  BookmarkIcon,
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  InboxIcon,
  PlusIcon,
  StarIcon,
} from "./icons";
import styles from "./Inbox.module.css";
import { TodoDialoog, type DialoogBron } from "./TodoDialoog";
import { useToast } from "./Toast";

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const tijdTekst = (taak: Taak) =>
  taak.tijd === null ? null : tijdFormat.format(new Date(taak.tijd * 1000));

// Bij mail is de titel het onderwerp en het bericht een voorproefje.
const berichtTekst = (taak: Taak) =>
  taak.bron === "gmail" ? taak.titel : (taak.bericht ?? taak.titel);

function dialoogBron(taak: Taak): DialoogBron {
  const wie = [taak.auteur, taak.plek, tijdTekst(taak)]
    .filter(Boolean)
    .join(" · ");
  return {
    label: BRON_LABELS[taak.bron],
    wie,
    tekst: berichtTekst(taak),
    url: taak.url,
  };
}

type Props = {
  taken: Taak[];
  genegeerd: Taak[];
  updates: Taak[];
  /** Meetings zonder opname of transcript, 4 uur na afloop. */
  vastgelopen: VastgelopenMeeting[];
};

const meetingTijd = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/** Waarom een meeting vastzit en wat je kunt doen, per stap. */
function vastTekst(stap: number): { wat: string; hulp: string } {
  if (stap <= 1)
    return { wat: "Geen opname gevonden", hulp: "Stond Plaud Desktop aan?" };
  if (stap === 2) {
    return {
      wat: "Transcript nog niet gemaakt",
      hulp: "Klik in Plaud web op Auto-generate.",
    };
  }
  return {
    wat: "Notulen nog niet gedeeld",
    hulp: "Deel ze vanuit de meeting via Gmail of Slack.",
  };
}

export function Inbox({ taken, genegeerd, updates, vastgelopen }: Props) {
  // Weggehaald is lokaal bijgehouden, zodat een item niet terugspringt voor de server klaar is.
  const [weg, setWeg] = useState<ReadonlySet<number>>(new Set());
  const [kiezen, setKiezen] = useState<Taak | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [wegMeetings, setWegMeetings] = useState<ReadonlySet<string>>(
    new Set(),
  );
  // Teruggezet uit genegeerd, tot de server de lijsten ververst.
  const [terug, setTerug] = useState<ReadonlySet<number>>(new Set());
  const { toon, element } = useToast();

  useEffect(() => {
    if (menu === null) return;
    document.querySelector<HTMLElement>(`#menu-${menu} button`)?.focus();
    const sluitBuiten = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[data-menu="${menu}"]`))
        setMenu(null);
    };
    const sluitEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      document.getElementById(`meer-${menu}`)?.focus();
    };
    document.addEventListener("pointerdown", sluitBuiten);
    document.addEventListener("keydown", sluitEscape);
    return () => {
      document.removeEventListener("pointerdown", sluitBuiten);
      document.removeEventListener("keydown", sluitEscape);
    };
  }, [menu]);

  function haalWeg(id: number) {
    setWeg((huidig) => new Set(huidig).add(id));
  }

  function zetTerug(id: number) {
    setWeg((huidig) => {
      const nieuw = new Set(huidig);
      nieuw.delete(id);
      return nieuw;
    });
    void verplaatsTaakAction(id, "inbox");
  }

  function bevestig(taak: Taak, titel: string, prio: Prio) {
    setKiezen(null);
    haalWeg(taak.id);
    void naarTodoAction(taak.id, titel, prio);
    toon("Toegevoegd aan je to-do's", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => zetTerug(taak.id),
    });
  }

  function gedaan(taak: Taak) {
    haalWeg(taak.id);
    void gedaanAction(taak.id);
    toon("Gedaan, staat in Klaar", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => {
        zetTerug(taak.id);
        void zetStatusAction(taak.id, "niet-gestart");
      },
    });
  }

  function markeerGezien(taak: Taak) {
    haalWeg(taak.id);
    void zetGezienAction(taak.id, true);
    toon("Gezien, de to-do blijft staan", {
      ongedaan: () => {
        setWeg((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(taak.id);
          return nieuw;
        });
        void zetGezienAction(taak.id, false);
      },
    });
  }

  function negeer(taak: Taak) {
    haalWeg(taak.id);
    void verplaatsTaakAction(taak.id, "genegeerd");
    toon("Genegeerd", { ongedaan: () => zetTerug(taak.id) });
  }

  function haalTerug(taak: Taak) {
    zetTerug(taak.id);
    setTerug((huidig) => new Set(huidig).add(taak.id));
    void verplaatsTaakAction(taak.id, "inbox");
    toon("Terug in je Inbox", {
      ongedaan: () => {
        setTerug((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(taak.id);
          return nieuw;
        });
        void verplaatsTaakAction(taak.id, "genegeerd");
      },
    });
  }

  function sluitUit(taak: Taak, soort: "afzender" | "domein") {
    if (!taak.afzender) return;
    const waarde =
      soort === "afzender" ? taak.afzender : domeinVan(taak.afzender);
    setMenu(null);
    haalWeg(taak.id);
    void sluitUitAction(taak.id, soort);
    toon(`Mail van ${waarde} komt niet meer in je Inbox`, {
      ongedaan: () => {
        setWeg((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(taak.id);
          return nieuw;
        });
        void staToeAction(waarde, taak.id);
      },
    });
  }

  function geenNotulen(meeting: VastgelopenMeeting) {
    const ref = {
      id: meeting.id,
      serieId: meeting.serieId,
      titel: meeting.titel,
      start: meeting.start,
    };
    setWegMeetings((huidig) => new Set(huidig).add(meeting.id));
    void slaMeetingOverAction(ref, false);
    toon("Geen notulen voor deze meeting", {
      ongedaan: () => {
        setWegMeetings((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(meeting.id);
          return nieuw;
        });
        void zetMeetingTerugAction(ref);
      },
    });
  }

  // Updates op to-do's staan op het moment van de reactie tussen de berichten.
  const feed = [...taken, ...updates].sort(
    (a, b) => (b.tijd ?? 0) - (a.tijd ?? 0),
  );
  const meetings = vastgelopen.filter((m) => !wegMeetings.has(m.id));
  const open = feed.filter((taak) => !weg.has(taak.id));
  const stil = genegeerd.filter((taak) => !terug.has(taak.id));

  return (
    <>
      <section className={styles.paneel} aria-label="Inbox">
        {open.length + meetings.length === 0 && (
          <p className="nd-empty">Inbox leeg.</p>
        )}
        <ul className={styles.lijst}>
          {meetings.map((meeting) => {
            const { wat, hulp } = vastTekst(meeting.stap);
            const datum = meeting.start.slice(0, 10);
            return (
              <li key={meeting.id} className={styles.rij}>
                <div className={styles.klap}>
                  <div className={`nd-row ${styles.item}`}>
                    <div className={styles.body}>
                      <p className={`nd-meta ${styles.meta}`}>
                        <span className="nd-chip" data-tint="pink">
                          <CalendarIcon className={styles.icoon} />
                          Meeting
                        </span>
                        <span>{meeting.label}</span>
                        <span>
                          {meetingTijd.format(Date.parse(meeting.start))}
                        </span>
                      </p>
                      <p className={styles.titel}>
                        {wat}: {meeting.titel}
                      </p>
                      <p className={styles.snippet}>{hulp}</p>
                    </div>
                    <div className={`nd-actions ${styles.acties}`}>
                      <NextLink
                        href={`/meetings?week=${maandagVan(datum)}&meeting=${encodeURIComponent(meeting.id)}`}
                        className="nd-action nd-action--main"
                      >
                        Naar de meeting
                        <span className="nd-visually-hidden">
                          : {meeting.titel}
                        </span>
                      </NextLink>
                      <button
                        type="button"
                        className="nd-action"
                        onClick={() => geenNotulen(meeting)}
                      >
                        <CloseIcon className={styles.icoon} />
                        Geen notulen
                        <span className="nd-visually-hidden">
                          : {meeting.titel}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {feed.map((taak) => {
            if (taak.lijst === "todo") {
              return (
                <li
                  key={taak.id}
                  className={styles.rij}
                  data-weg={weg.has(taak.id) || undefined}
                  inert={weg.has(taak.id)}
                >
                  <div className={styles.klap}>
                    <div className={`nd-row ${styles.item} ${styles.update}`}>
                      <div className={styles.body}>
                        <p className={`nd-meta ${styles.meta}`}>
                          <span
                            className="nd-chip"
                            data-tint={taak.bron === "gmail" ? "pink" : "lilac"}
                          >
                            {BRON_LABELS[taak.bron]}
                          </span>
                          <span className="nd-chip" data-tint="yellow">
                            To-do · {STATUS_LABELS[taak.status]}
                          </span>
                          {taak.auteur && <span>{taak.auteur}</span>}
                          {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                        </p>
                        <p className={styles.titel}>{taak.titel}</p>
                        {taak.bericht && (
                          <p className={styles.snippet}>{taak.bericht}</p>
                        )}
                      </div>
                      <div className={`nd-actions ${styles.acties}`}>
                        <button
                          type="button"
                          className="nd-action nd-action--main"
                          onClick={() => markeerGezien(taak)}
                        >
                          <CheckIcon
                            className={styles.icoon}
                            aria-hidden="true"
                          />
                          Gezien
                          <span className="nd-visually-hidden">
                            : {taak.titel}
                          </span>
                        </button>
                        {taak.url && (
                          <ExternalLink href={taak.url} className="nd-action">
                            Openen in {BRON_LABELS[taak.bron]}
                          </ExternalLink>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            }
            const gmail = taak.bron === "gmail";
            const Markering =
              taak.soort === "Ster"
                ? StarIcon
                : taak.soort === "Bewaard"
                  ? BookmarkIcon
                  : null;
            return (
              <li
                key={taak.id}
                className={styles.rij}
                data-weg={weg.has(taak.id) || undefined}
                inert={weg.has(taak.id)}
              >
                <div className={styles.klap}>
                  <div className={`nd-row ${styles.item}`}>
                    <div className={styles.body}>
                      <p className={`nd-meta ${styles.meta}`}>
                        <span
                          className="nd-chip"
                          data-tint={gmail ? "pink" : "lilac"}
                        >
                          {BRON_LABELS[taak.bron]}
                        </span>
                        {Markering && (
                          <span className={styles.markering}>
                            <Markering className={styles.markeerIcoon} />
                            {taak.soort}
                          </span>
                        )}
                        {taak.auteur && <span>{taak.auteur}</span>}
                        {taak.plek && <span>{taak.plek}</span>}
                        {gmail && !Markering && taak.soort && (
                          <span>{taak.soort}</span>
                        )}
                        {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                        {!gmail && !Markering && taak.soort && (
                          <span>{taak.soort}</span>
                        )}
                      </p>
                      <p className={gmail ? styles.titel : styles.snippet}>
                        {berichtTekst(taak)}
                      </p>
                      {gmail && taak.bericht && (
                        <p className={styles.snippet}>{taak.bericht}</p>
                      )}
                    </div>
                    <div className={`nd-actions ${styles.acties}`}>
                      <div className={styles.kolom}>
                        {taak.url && (
                          <ExternalLink href={taak.url} className="nd-action">
                            Open in {BRON_LABELS[taak.bron]}
                          </ExternalLink>
                        )}
                        <button
                          type="button"
                          className="nd-action nd-action--main"
                          onClick={() => setKiezen(taak)}
                        >
                          <PlusIcon className={styles.icoon} />
                          Maak to-do aan
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                      </div>
                      <div className={styles.kolom}>
                        <button
                          type="button"
                          className={`nd-action ${styles.gedaan}`}
                          onClick={() => gedaan(taak)}
                        >
                          <CheckIcon className={styles.icoon} />
                          Gedaan
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="nd-action"
                          onClick={() => negeer(taak)}
                        >
                          <CloseIcon className={styles.icoon} />
                          Negeer
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                        {gmail && taak.afzender && (
                          <>
                            <button
                              type="button"
                              id={`meer-${taak.id}`}
                              data-menu={taak.id}
                              className="nd-action"
                              aria-haspopup="menu"
                              aria-expanded={menu === taak.id}
                              aria-controls={`menu-${taak.id}`}
                              onClick={() =>
                                setMenu(menu === taak.id ? null : taak.id)
                              }
                            >
                              <BlockIcon className={styles.icoon} />
                              Demp
                              <span className="nd-visually-hidden">
                                : {berichtTekst(taak)}
                              </span>
                            </button>
                            <div
                              id={`menu-${taak.id}`}
                              data-menu={taak.id}
                              role="menu"
                              className={styles.menu}
                              hidden={menu !== taak.id}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => sluitUit(taak, "afzender")}
                              >
                                Demp {taak.auteur ?? taak.afzender}
                                <small>{taak.afzender}</small>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => sluitUit(taak, "domein")}
                              >
                                Demp {domeinVan(taak.afzender)}
                                <small>Alle afzenders op dit domein</small>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {stil.length > 0 && (
        <details className={styles.genegeerd}>
          <summary>
            <ChevronIcon className={styles.icoon} aria-hidden="true" />
            {stil.length} genegeerd
          </summary>
          <p className={styles.hint}>
            Afgelopen 30 dagen, nieuwste eerst. Komt er een nieuw bericht in het
            gesprek, dan staat het vanzelf weer in je Inbox.
          </p>
          <ul className={`${styles.lijst} ${styles.stil}`}>
            {stil.map((taak) => (
              <li key={taak.id} className={`nd-row ${styles.item}`}>
                <div className={styles.body}>
                  <p className={`nd-meta ${styles.meta}`}>
                    <span
                      className="nd-chip"
                      data-tint={taak.bron === "gmail" ? "pink" : "lilac"}
                    >
                      {BRON_LABELS[taak.bron]}
                    </span>
                    {taak.auteur && <span>{taak.auteur}</span>}
                    {taak.plek && <span>{taak.plek}</span>}
                    {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                  </p>
                  <p className={styles.snippet}>{berichtTekst(taak)}</p>
                </div>
                <div className={`nd-actions ${styles.acties}`}>
                  <button
                    type="button"
                    className="nd-action nd-action--main"
                    onClick={() => haalTerug(taak)}
                  >
                    <InboxIcon className={styles.icoon} />
                    Zet terug
                    <span className="nd-visually-hidden">
                      : {berichtTekst(taak)}
                    </span>
                  </button>
                  {taak.url && (
                    <ExternalLink href={taak.url} className="nd-action">
                      Open in {BRON_LABELS[taak.bron]}
                    </ExternalLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {kiezen && (
        <TodoDialoog
          modus="nieuw"
          bron={dialoogBron(kiezen)}
          onSluit={() => setKiezen(null)}
          onBevestig={(titel, prio) => bevestig(kiezen, titel, prio)}
        />
      )}
      {element}
    </>
  );
}
