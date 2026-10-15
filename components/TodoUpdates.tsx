"use client";

import { useState } from "react";
import { zetGezienAction } from "@/app/actions";
import { BRON_LABELS, STATUS_LABELS, type Taak } from "@/lib/taak";
import grid from "@/app/grid.module.css";
import { ExternalLink } from "./ExternalLink";
import { CheckIcon } from "./icons";
import styles from "./Inbox.module.css";
import { useToast } from "./Toast";

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** To-do's met een nieuwe reactie in het gesprek, onder de Inbox. */
export function TodoUpdates({ taken }: { taken: Taak[] }) {
  // Lokaal bijgehouden, zodat een update niet terugspringt voor de server klaar is.
  const [gezien, setGezien] = useState<ReadonlySet<number>>(new Set());
  const { toon, element } = useToast();

  function zet(id: number, weg: boolean) {
    setGezien((huidig) => {
      const nieuw = new Set(huidig);
      if (weg) nieuw.add(id);
      else nieuw.delete(id);
      return nieuw;
    });
    void zetGezienAction(id, weg);
  }

  function markeerGezien(taak: Taak) {
    zet(taak.id, true);
    toon("Gezien, de to-do blijft staan", {
      ongedaan: () => zet(taak.id, false),
    });
  }

  if (taken.length === 0) return element;

  return (
    <section
      className={`${grid.section} ${styles.updates}`}
      aria-labelledby="updates"
    >
      <h2 id="updates" className={grid.sectionTitle}>
        Updates op je to-do&apos;s
      </h2>
      <p className={grid.muted}>
        Nieuwe reacties in gesprekken die al op je to-do&apos;s staan.
      </p>
      <div className={styles.paneel}>
        {taken.every((taak) => gezien.has(taak.id)) && (
          <p className={styles.leeg}>Alles gezien.</p>
        )}
        <ul className={styles.lijst}>
          {taken.map((taak) => (
            <li
              key={taak.id}
              className={styles.rij}
              data-weg={gezien.has(taak.id) || undefined}
              inert={gezien.has(taak.id)}
            >
              <div className={styles.klap}>
                <div className={`${styles.item} ${styles.update}`}>
                  <div className={styles.body}>
                    <p className={styles.meta}>
                      <span
                        className={`${styles.bron} ${taak.bron === "gmail" ? styles.gmail : ""}`}
                      >
                        {BRON_LABELS[taak.bron]}
                      </span>
                      <span className={styles.status}>
                        To-do · {STATUS_LABELS[taak.status]}
                      </span>
                      {taak.auteur && <span>{taak.auteur}</span>}
                      {taak.tijd !== null && (
                        <span>
                          {tijdFormat.format(new Date(taak.tijd * 1000))}
                        </span>
                      )}
                    </p>
                    <p className={styles.titel}>{taak.titel}</p>
                    {taak.bericht && (
                      <p className={styles.snippet}>{taak.bericht}</p>
                    )}
                  </div>
                  <div className={styles.acties}>
                    {taak.url && (
                      <ExternalLink href={taak.url} className={styles.open}>
                        Openen in {BRON_LABELS[taak.bron]}
                      </ExternalLink>
                    )}
                    <button
                      type="button"
                      className={styles.todo}
                      onClick={() => markeerGezien(taak)}
                    >
                      <CheckIcon className={styles.icoon} aria-hidden="true" />
                      Gezien
                      <span className="visually-hidden">: {taak.titel}</span>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {element}
    </section>
  );
}
