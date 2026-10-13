"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { PRIO_LABELS, PRIOS, type Prio } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import styles from "./TodoDialoog.module.css";

/** Het bericht of de melding waar de taak uit komt; blijft in de popup zichtbaar. */
export type DialoogBron = {
  /** "Slack" of "Feed". */
  label: string;
  /** Wie en waar, bijvoorbeeld "Mark Jansen · Direct bericht". */
  wie: string;
  tekst: string;
  url: string | null;
};

type Props = {
  modus: "nieuw" | "bewerk";
  /** Voorinvulling; leeg bij een nieuwe taak uit Slack, de titel van de melding bij de feed. */
  titel?: string;
  bron?: DialoogBron;
  onSluit: () => void;
  onBevestig: (titel: string, prio: Prio) => void;
};

/**
 * Popup om een taak concreet uit te schrijven. Render hem alleen als hij open moet:
 * hij opent bij het laden en meldt via onSluit dat hij dicht is.
 */
export function TodoDialoog({
  modus,
  titel = "",
  bron,
  onSluit,
  onBevestig,
}: Props) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const veld = useRef<HTMLInputElement>(null);
  const [tekst, setTekst] = useState(titel);
  const [prio, setPrio] = useState<Prio>(3);
  const [fout, setFout] = useState(false);

  useEffect(() => {
    dialoog.current?.showModal();
    // Cursor achteraan: bij een voorgevulde titel vul je aan in plaats van te overschrijven.
    const invoer = veld.current;
    invoer?.setSelectionRange(invoer.value.length, invoer.value.length);
  }, []);

  function verstuur(event: React.FormEvent) {
    event.preventDefault();
    const schoon = tekst.trim();
    if (!schoon) {
      setFout(true);
      veld.current?.focus();
      return;
    }
    dialoog.current?.close();
    onBevestig(schoon, prio);
  }

  return (
    <dialog
      ref={dialoog}
      className={styles.dialoog}
      aria-labelledby="todo-dialoog-kop"
      onClose={onSluit}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <form className={styles.formulier} noValidate onSubmit={verstuur}>
        <h2 id="todo-dialoog-kop" className={styles.kop}>
          {modus === "nieuw" ? "Op je to-do's zetten" : "Titel aanpassen"}
        </h2>
        <label className={styles.label} htmlFor="todo-dialoog-titel">
          Wat moet er gebeuren?
        </label>
        <input
          ref={veld}
          id="todo-dialoog-titel"
          className={styles.veld}
          value={tekst}
          maxLength={120}
          autoComplete="off"
          placeholder="Bijvoorbeeld: eindtijden agendapagina Effenaar controleren"
          aria-invalid={fout || undefined}
          aria-describedby={fout ? "todo-dialoog-fout" : undefined}
          onChange={(event) => {
            setTekst(event.target.value);
            setFout(false);
          }}
        />
        {fout && (
          <p id="todo-dialoog-fout" className={styles.fout} role="alert">
            Schrijf kort op wat er moet gebeuren.
          </p>
        )}

        {bron && (
          <figure className={styles.bericht}>
            <figcaption className={styles.herkomst}>
              <span className={styles.bron}>{bron.label}</span>
              <span>{bron.wie}</span>
              {bron.url &&
                (/^https?:/.test(bron.url) ? (
                  <ExternalLink href={bron.url} className={styles.link}>
                    Openen
                  </ExternalLink>
                ) : (
                  <NextLink href={bron.url} className={styles.link}>
                    Openen
                  </NextLink>
                ))}
            </figcaption>
            <blockquote className={styles.tekst}>{bron.tekst}</blockquote>
          </figure>
        )}

        {modus === "nieuw" && (
          <fieldset className={styles.prio}>
            <legend className={styles.label}>Prioriteit</legend>
            {PRIOS.map((optie) => (
              <label key={optie} className={styles.keuze}>
                <input
                  type="radio"
                  name="prio"
                  value={optie}
                  checked={prio === optie}
                  onChange={() => setPrio(optie)}
                />
                {optie} | {PRIO_LABELS[optie]}
              </label>
            ))}
          </fieldset>
        )}

        <div className={styles.acties}>
          <button
            type="button"
            className={styles.annuleer}
            onClick={() => dialoog.current?.close()}
          >
            Annuleren
          </button>
          <button type="submit" className={styles.bevestig}>
            {modus === "nieuw" ? "Zet op to-do's" : "Opslaan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
