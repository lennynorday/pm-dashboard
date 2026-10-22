"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  feedNaarTodoAction,
  feedTodoOngedaanAction,
  herstelMeldingAction,
  herstelMeldingenAction,
  negeerMeldingAction,
} from "@/app/actions";
import type { FeedItem, FeedSoort } from "@/lib/feed";
import type { Prio } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon, LinkIcon, PlusIcon } from "./icons";
import { TodoDialoog } from "./TodoDialoog";
import { useToast } from "./Toast";
import styles from "./Feed.module.css";

/** "koppelen" en "eigen" hebben geen eigen filter en staan alleen onder Alles. */
type Groep = "budget" | "koppelen" | "support" | "sprint" | "eigen";

/** Tint van het ronde icoon, zoals nd-avatar die kent; zonder tint is het zacht lila. */
type Tint = "pink" | "lilac" | "yellow" | undefined;

const SOORT: Record<
  FeedSoort,
  { label: string; groep: Groep; icoon: string; tint?: Tint }
> = {
  "boven-offerte": {
    label: "Boven offerte",
    groep: "budget",
    tint: "pink",
    icoon:
      "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  },
  "bijna-op": {
    label: "Bijna op",
    groep: "budget",
    tint: "pink",
    icoon:
      "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  },
  koppelen: {
    label: "Koppelen",
    groep: "koppelen",
    icoon:
      "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  },
  "eerste-reactie": {
    label: "Eerste reactie",
    groep: "support",
    tint: "lilac",
    icoon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  "sprint-verlopen": {
    label: "Sprint verlopen",
    groep: "sprint",
    tint: "yellow",
    icoon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  "stil-ticket": {
    label: "Ligt stil",
    groep: "eigen",
    icoon: "M10 9v6M14 9v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  timesheet: {
    label: "Timesheet",
    groep: "eigen",
    icoon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
};

/** Stip per filter, in de kleur van het icoon. */
const DOT: Record<Groep, string | undefined> = {
  budget: "pink-soft",
  support: "lilac",
  sprint: "yellow",
  koppelen: undefined,
  eigen: undefined,
};

const FILTERS: { label: string; groep: Groep | null }[] = [
  { label: "Alles", groep: null },
  { label: "Budget", groep: "budget" },
  { label: "Support", groep: "support" },
  { label: "Sprints", groep: "sprint" },
];

type Props = { items: FeedItem[]; genegeerd: number };

/** Zeg waar de link heen gaat, zoals bij de to-do's. */
function openTekst(url: string): string {
  if (url.endsWith("/koppelen")) return "Koppelen";
  if (url.includes("#project-")) return "Naar project";
  if (/atlassian\.net/.test(url)) return "Openen in Jira";
  if (/teamleader\.eu/.test(url)) return "Openen in Orbit";
  return "Openen";
}

/** Mijn feed: alles wat aandacht vraagt, te filteren en te negeren. */
export function Feed({ items, genegeerd }: Props) {
  const [filter, setFilter] = useState<Groep | null>(null);
  const [dialoog, setDialoog] = useState<FeedItem | null>(null);
  // Ids die naar de to-do's gaan: vervagen meteen, ook als `items` ze nog bevat.
  const [weg, setWeg] = useState<ReadonlySet<string>>(new Set());
  const { toon, element } = useToast();

  const over = items.filter((item) => !weg.has(item.id));
  const zichtbaar = items.filter(
    (item) => filter === null || SOORT[item.soort].groep === filter,
  );
  const aantalZichtbaar = over.filter(
    (item) => filter === null || SOORT[item.soort].groep === filter,
  ).length;

  function zetWeg(id: string, aan: boolean) {
    setWeg((huidig) => {
      const nieuw = new Set(huidig);
      if (aan) nieuw.add(id);
      else nieuw.delete(id);
      return nieuw;
    });
  }

  function naarTodo(item: FeedItem, titel: string, prio: Prio) {
    setDialoog(null);
    zetWeg(item.id, true);
    feedNaarTodoAction(
      {
        id: item.id,
        titel: item.titel,
        detail: item.detail,
        plek: item.platformNaam,
        url: item.url,
      },
      titel,
      prio,
    ).catch(() => zetWeg(item.id, false));
    toon("Toegevoegd aan je to-do's", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => {
        zetWeg(item.id, false);
        feedTodoOngedaanAction(item.id);
      },
    });
  }

  function negeer(item: FeedItem) {
    zetWeg(item.id, true);
    negeerMeldingAction(item.id).catch(() => zetWeg(item.id, false));
    toon("Genegeerd", {
      ongedaan: () => {
        zetWeg(item.id, false);
        herstelMeldingAction(item.id);
      },
    });
  }

  return (
    <section aria-labelledby="feed" className="nd-card">
      <div className="nd-card__head">
        <h2 id="feed" className="nd-title">
          Mijn feed <span className="nd-count">{over.length}</span>
        </h2>
        <div role="group" aria-label="Filter de feed" className="nd-filters">
          {FILTERS.map(({ label, groep }) => (
            <button
              key={label}
              type="button"
              className="nd-filter"
              aria-pressed={filter === groep}
              onClick={() => setFilter(groep)}
            >
              {groep && (
                <span
                  className="nd-dot"
                  data-tint={DOT[groep]}
                  aria-hidden="true"
                />
              )}
              {label}{" "}
              <span className="nd-muted">
                {
                  over.filter(
                    (item) =>
                      groep === null || SOORT[item.soort].groep === groep,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {aantalZichtbaar === 0 ? (
        <p className="nd-empty">
          Niets meer in deze feed. Alles is afgehandeld of genegeerd.
        </p>
      ) : (
        <div
          role="region"
          aria-label="Mijn feed, scrollbaar"
          tabIndex={0}
          className={styles.scroll}
        >
          <ul className="nd-rows">
            {zichtbaar.map((item) => {
              const { label, icoon, tint } = SOORT[item.soort];
              const extern = !/^[#/]/.test(item.url);
              return (
                <li
                  key={item.id}
                  className={`nd-row ${styles.item}`}
                  data-weg={weg.has(item.id) || undefined}
                >
                  <span
                    className="nd-avatar"
                    data-tint={tint}
                    aria-hidden="true"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={icoon} />
                    </svg>
                  </span>
                  <div className={styles.tekst}>
                    <p className={`nd-meta ${styles.meta}`}>
                      <span className="visually-hidden">{label}: </span>
                      <span>{item.platformNaam}</span>
                      {item.klantNaam && <span>{item.klantNaam}</span>}
                    </p>
                    <p className={`nd-row__title ${styles.itemTitel}`}>
                      {item.titel}
                    </p>
                    <p className={styles.detail}>{item.detail}</p>
                  </div>
                  <div className={`nd-actions ${styles.acties}`}>
                    <button
                      type="button"
                      className="nd-action nd-action--main"
                      onClick={() => setDialoog(item)}
                    >
                      <PlusIcon />
                      Naar to-do
                      <span className="visually-hidden">: {item.titel}</span>
                    </button>
                    {extern ? (
                      <ExternalLink href={item.url} className="nd-action">
                        {openTekst(item.url)}
                        <span className="visually-hidden">: {item.titel}</span>
                      </ExternalLink>
                    ) : (
                      <NextLink href={item.url} className="nd-action">
                        <LinkIcon />
                        {openTekst(item.url)}
                        <span className="visually-hidden">: {item.titel}</span>
                      </NextLink>
                    )}
                    <button
                      type="button"
                      className="nd-action"
                      onClick={() => negeer(item)}
                    >
                      <CloseIcon />
                      Negeren
                      <span className="visually-hidden">: {item.titel}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {genegeerd > 0 && (
        <form
          action={herstelMeldingenAction}
          className={`nd-meta ${styles.herstel}`}
        >
          {genegeerd === 1
            ? "1 melding genegeerd."
            : `${genegeerd} meldingen genegeerd.`}{" "}
          <button type="submit" className={styles.herstelKnop}>
            Terugzetten
          </button>
        </form>
      )}
      {dialoog && (
        <TodoDialoog
          modus="nieuw"
          titel={dialoog.titel}
          bron={{
            label: "Feed",
            wie: dialoog.klantNaam
              ? `${dialoog.platformNaam} · ${dialoog.klantNaam}`
              : dialoog.platformNaam,
            tekst: `${dialoog.titel}. ${dialoog.detail}`,
            url: dialoog.url,
          }}
          onSluit={() => setDialoog(null)}
          onBevestig={(titel, prio) => naarTodo(dialoog, titel, prio)}
        />
      )}
      {element}
    </section>
  );
}
