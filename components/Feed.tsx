"use client";

import { useState } from "react";
import { herstelMeldingenAction, negeerMeldingAction } from "@/app/actions";
import type { FeedItem, FeedSoort } from "@/lib/feed";
import styles from "./Feed.module.css";

type Groep = "budget" | "support" | "sprint";

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
  const zichtbaar = items.filter(
    (item) => filter === null || SOORT[item.soort].groep === filter,
  );

  return (
    <section aria-labelledby="feed" className={styles.feed}>
      <div className={styles.kop}>
        <h2 id="feed" className={styles.titel}>
          Mijn feed <span className={styles.aantal}>{items.length}</span>
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
              {label}{" "}
              <span className={styles.filterAantal}>
                {
                  items.filter(
                    (item) =>
                      groep === null || SOORT[item.soort].groep === groep,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {zichtbaar.length === 0 ? (
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
              const extern = !item.url.startsWith("#");
              return (
                <li key={item.id} className={styles.item}>
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
                      <span className={styles.soort} data-soort={item.soort}>
                        {label}
                      </span>
                      <a href={`/platforms/${item.platformSlug}`}>
                        {item.platformNaam}
                      </a>
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
    </section>
  );
}
