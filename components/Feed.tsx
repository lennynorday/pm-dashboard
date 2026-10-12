"use client";

import { useState } from "react";
import {
  feedNaarTodoAction,
  feedTodoOngedaanAction,
  herstelMeldingenAction,
  negeerMeldingAction,
} from "@/app/actions";
import type { FeedItem, FeedSoort } from "@/lib/feed";
import type { Prio } from "@/lib/taak";
import { TodoDialoog } from "./TodoDialoog";
import { useToast } from "./Toast";
import styles from "./Feed.module.css";

/** "koppelen" heeft geen eigen filter en staat alleen onder Alles. */
type Groep = "budget" | "koppelen" | "support" | "sprint";

const SOORT: Record<FeedSoort, { label: string; groep: Groep; icoon: string }> =
  {
    "boven-offerte": {
      label: "Boven offerte",
      groep: "budget",
      icoon:
        "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    },
    "bijna-op": {
      label: "Bijna op",
      groep: "budget",
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
      icoon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    },
    "sprint-verlopen": {
      label: "Sprint verlopen",
      groep: "sprint",
      icoon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
  };

const FILTERS: { label: string; groep: Groep | null }[] = [
  { label: "Alles", groep: null },
  { label: "Budget", groep: "budget" },
  { label: "Support", groep: "support" },
  { label: "Sprints", groep: "sprint" },
];

type Props = { items: FeedItem[]; genegeerd: number };

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

  return (
    <section aria-labelledby="feed" className={styles.feed}>
      <div className={styles.kop}>
        <h2 id="feed" className={styles.titel}>
          Mijn feed <span className={styles.aantal}>{over.length}</span>
        </h2>
        <div
          role="group"
          aria-label="Filter de feed"
          className={styles.filters}
        >
          {FILTERS.map(({ label, groep }) => (
            <button
              key={label}
              type="button"
              className={styles.filter}
              aria-pressed={filter === groep}
              onClick={() => setFilter(groep)}
            >
              {groep && (
                <span
                  className={styles.punt}
                  data-groep={groep}
                  aria-hidden="true"
                />
              )}
              {label}{" "}
              <span className={styles.filterAantal}>
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
        <p className={styles.leeg}>
          Niets meer in deze feed. Alles is afgehandeld of genegeerd.
        </p>
      ) : (
        <div
          role="region"
          aria-label="Mijn feed, scrollbaar"
          tabIndex={0}
          className={styles.scroll}
        >
          <ul className={styles.lijst}>
            {zichtbaar.map((item) => {
              const { label, icoon } = SOORT[item.soort];
              const extern = !/^[#/]/.test(item.url);
              return (
                <li
                  key={item.id}
                  className={styles.item}
                  data-weg={weg.has(item.id) || undefined}
                >
                  <span
                    className={styles.icoon}
                    data-soort={item.soort}
                    aria-hidden="true"
                  >
                    <svg
                      width="20"
                      height="20"
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
                  <span className={styles.tekst}>
                    <span className={styles.meta}>
                      <span className="visually-hidden">{label}: </span>
                      <a href={`/platforms/${item.platformSlug}`}>
                        {item.platformNaam}
                      </a>
                      {item.klantNaam && (
                        <span className={styles.klant}>· {item.klantNaam}</span>
                      )}
                    </span>
                    <a
                      href={item.url}
                      className={styles.itemTitel}
                      target={extern ? "_blank" : undefined}
                      rel={extern ? "noopener noreferrer" : undefined}
                    >
                      {item.titel}
                      {extern && (
                        <span className="visually-hidden">
                          {" "}
                          (opent in nieuw tabblad)
                        </span>
                      )}
                    </a>
                    <span className={styles.detail}>{item.detail}</span>
                  </span>
                  <div className={styles.acties}>
                    <button
                      type="button"
                      className={styles.naarTodo}
                      onClick={() => setDialoog(item)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Naar to-do
                      <span className="visually-hidden">: {item.titel}</span>
                    </button>
                    <form action={negeerMeldingAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className={styles.negeer}
                        aria-label={`Negeren: ${item.titel}`}
                        title="Negeren"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {genegeerd > 0 && (
        <form action={herstelMeldingenAction} className={styles.herstel}>
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
