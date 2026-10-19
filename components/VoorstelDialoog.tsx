"use client";

import NextLink from "next/link";
import { useEffect, useRef } from "react";
import { SOORT_LABELS, type Opdracht } from "@/lib/claude/voorstel";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon } from "./icons";
import styles from "./VoorstelDialoog.module.css";
import type { DialoogBron } from "./TodoDialoog";

type Props = {
  titel: string;
  opdracht: Opdracht;
  /** Het bericht waar het voorstel op reageert; leeg bij een eigen to-do. */
  bron?: DialoogBron;
  onSluit: () => void;
  onAkkoord: () => void;
  onWijsAf: () => void;
};

/**
 * Het voorstel naast het bericht waar het op reageert. Render hem alleen als hij
 * open moet: hij opent bij het laden en meldt via onSluit dat hij dicht is.
 */
export function VoorstelDialoog({
  titel,
  opdracht,
  bron,
  onSluit,
  onAkkoord,
  onWijsAf,
}: Props) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const voorstel = opdracht.voorstel;

  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  if (!voorstel) return null;
  const soort = SOORT_LABELS[voorstel.soort];
  const regels = [
    ["Aan", voorstel.ontvanger],
    ["Onderwerp", voorstel.onderwerp],
  ].filter((regel): regel is [string, string] => regel[1] !== null);

  function beslis(actie: () => void) {
    dialoog.current?.close();
    actie();
  }

  return (
    <dialog
      ref={dialoog}
      className={`nd-dialog ${styles.dialoog}`}
      aria-labelledby="voorstel-kop"
      aria-describedby="voorstel-sub"
      onClose={onSluit}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <div className="nd-dialog__body">
        <div className={styles.kop}>
          <div>
            <h2 id="voorstel-kop" className="nd-title">
              Voorstel van Claude
            </h2>
            <p id="voorstel-sub" className={`nd-meta ${styles.sub}`}>
              {titel} · {soort}
            </p>
          </div>
          <button
            type="button"
            className="nd-icon-button nd-icon-button--small"
            aria-label="Sluiten"
            onClick={() => dialoog.current?.close()}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.raster}>
          <div className={styles.blok}>
            <h3 className={styles.blokKop}>
              {bron ? `Bericht van ${bron.wie || bron.label}` : "Context"}
            </h3>
            <p className={styles.bericht}>
              {bron
                ? bron.tekst || "Geen tekst bewaard bij deze to-do."
                : "Eigen to-do, zonder gesprek. Claude geeft advies."}
            </p>
            {bron?.url &&
              (/^https?:/.test(bron.url) ? (
                <ExternalLink href={bron.url} className={styles.link}>
                  Openen in {bron.label}
                </ExternalLink>
              ) : (
                <NextLink href={bron.url} className={styles.link}>
                  Openen
                </NextLink>
              ))}
          </div>
          <div className={styles.blok}>
            <h3 className={styles.blokKop}>{soort}</h3>
            <div className={styles.concept}>
              {regels.length > 0 && (
                <dl className={styles.regels}>
                  {regels.map(([naam, waarde]) => (
                    <div key={naam} className={styles.regel}>
                      <dt>{naam}</dt>
                      <dd>{waarde}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className={styles.tekst}>{voorstel.tekst}</p>
            </div>
          </div>
        </div>

        <div className={styles.voet}>
          <button
            type="button"
            className={`nd-button nd-button--quiet ${styles.eerst}`}
            onClick={() => beslis(onWijsAf)}
          >
            Afwijzen
          </button>
          <button
            type="button"
            className="nd-button"
            onClick={() => beslis(onAkkoord)}
          >
            Akkoord
          </button>
        </div>
      </div>
    </dialog>
  );
}
