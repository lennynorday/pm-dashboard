"use client";

import { useState } from "react";
import { naarTodoAction, verplaatsTaakAction } from "@/app/actions";
import type { Prio, Taak } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon, PlusIcon } from "./icons";
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

const berichtTekst = (taak: Taak) => taak.bericht ?? taak.titel;

function dialoogBron(taak: Taak): DialoogBron {
  const wie = [taak.auteur, taak.plek, tijdTekst(taak)]
    .filter(Boolean)
    .join(" · ");
  return { label: "Slack", wie, tekst: berichtTekst(taak), url: taak.url };
}

export function Inbox({ taken }: { taken: Taak[] }) {
  // Weggehaald is lokaal bijgehouden, zodat een item niet terugspringt voor de server klaar is.
  const [weg, setWeg] = useState<ReadonlySet<number>>(new Set());
  const [kiezen, setKiezen] = useState<Taak | null>(null);
  const { toon, element } = useToast();

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

  function negeer(taak: Taak) {
    haalWeg(taak.id);
    void verplaatsTaakAction(taak.id, "genegeerd");
    toon("Genegeerd", { ongedaan: () => zetTerug(taak.id) });
  }

  const open = taken.filter((taak) => !weg.has(taak.id));

  return (
    <>
      <section className={styles.paneel} aria-label="Inbox">
        {open.length === 0 && <p className={styles.leeg}>Inbox leeg.</p>}
        <ul className={styles.lijst}>
          {taken.map((taak) => (
            <li
              key={taak.id}
              className={styles.rij}
              data-weg={weg.has(taak.id) || undefined}
              inert={weg.has(taak.id)}
            >
              <div className={styles.klap}>
                <div className={styles.item}>
                  <div className={styles.body}>
                    <p className={styles.meta}>
                      <span className={styles.bron}>Slack</span>
                      {taak.auteur && <span>{taak.auteur}</span>}
                      {taak.plek && <span>{taak.plek}</span>}
                      {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                      {taak.soort && <span>{taak.soort}</span>}
                    </p>
                    <p className={styles.titel}>{berichtTekst(taak)}</p>
                  </div>
                  <div className={styles.acties}>
                    {taak.url && (
                      <ExternalLink href={taak.url} className={styles.open}>
                        Openen in Slack
                      </ExternalLink>
                    )}
                    <button
                      type="button"
                      className={styles.todo}
                      onClick={() => setKiezen(taak)}
                    >
                      <PlusIcon className={styles.icoon} />
                      Naar to-do
                    </button>
                    <button
                      type="button"
                      className={styles.negeer}
                      onClick={() => negeer(taak)}
                    >
                      <CloseIcon className={styles.icoon} aria-hidden="true" />
                      <span className="visually-hidden">
                        Negeren: {berichtTekst(taak)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

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
