"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AkkoordUitkomst } from "@/lib/akkoord";
import { SOORT_LABELS, type Opdracht } from "@/lib/claude/voorstel";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon } from "./icons";
import { VerbindLink } from "./VerbindLink";
import styles from "./VoorstelDialoog.module.css";
import type { DialoogBron } from "./TodoDialoog";

type Props = {
  titel: string;
  opdracht: Opdracht;
  /** Het bericht waar het voorstel op reageert; leeg bij een eigen to-do. */
  bron?: DialoogBron;
  onSluit: () => void;
  onAkkoord: () => Promise<AkkoordUitkomst>;
  /** Het voorstel is afgehandeld en de dialoog sluit zichzelf; dit is de melding daarvoor. */
  onKlaar: (melding: string) => void;
  onWijsAf: () => void;
};

const AKKOORD_LABELS: Record<Opdracht["soort"], string> = {
  "gmail-concept": "Klaarzetten in Gmail",
  "slack-concept": "Kopiëren en openen in Slack",
  advies: "Akkoord",
};

/** Wat er na Akkoord in de dialoog blijft staan; zonder stand is het nog te beslissen. */
type Stand =
  | { soort: "gmail"; url: string | null }
  | { soort: "handmatig" }
  | { soort: "verbinden" }
  | { soort: "fout"; fout: string };

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
  onKlaar,
  onWijsAf,
}: Props) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const voorstel = opdracht.voorstel;
  const [stand, setStand] = useState<Stand | null>(null);
  const [bezig, setBezig] = useState(false);

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

  async function akkoord() {
    if (!voorstel || bezig) return;
    setBezig(true);
    // Kopiëren en openen moeten in de klik zelf beginnen, vóór de eerste await.
    const slack = voorstel.soort === "slack-concept";
    const kopie = slack
      ? (navigator.clipboard?.writeText(voorstel.tekst) ?? null)
      : null;
    if (slack && bron?.url && /^https?:/.test(bron.url)) {
      window.open(bron.url, "_blank", "noopener,noreferrer");
    }
    const uitkomst = await onAkkoord().catch((): AkkoordUitkomst => ({
      uitkomst: "fout",
      fout: "Akkoord geven mislukte, probeer het opnieuw",
    }));
    const gekopieerd = kopie
      ? await kopie.then(
          () => true,
          () => false,
        )
      : false;
    setBezig(false);
    if (uitkomst.uitkomst === "verbinden")
      return setStand({ soort: "verbinden" });
    if (uitkomst.uitkomst === "fout") {
      return setStand({ soort: "fout", fout: uitkomst.fout });
    }
    if (voorstel.soort === "gmail-concept") {
      return setStand({ soort: "gmail", url: uitkomst.conceptUrl });
    }
    if (slack && !gekopieerd) return setStand({ soort: "handmatig" });
    dialoog.current?.close();
    onKlaar(
      slack
        ? "Tekst gekopieerd. Plak hem in Slack om te versturen."
        : "Akkoord gegeven",
    );
  }

  // Na Gmail of een mislukte kopie blijft de dialoog open met het resultaat.
  const afgerond = stand?.soort === "gmail" || stand?.soort === "handmatig";

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
              {stand?.soort === "handmatig" ? (
                <textarea
                  className={`nd-field ${styles.handmatig}`}
                  readOnly
                  value={voorstel.tekst}
                  aria-label="Tekst van het concept"
                  onFocus={(event) => event.target.select()}
                />
              ) : (
                <p className={styles.tekst}>{voorstel.tekst}</p>
              )}
            </div>
          </div>
        </div>

        <div aria-live="polite">
          {stand?.soort === "gmail" && (
            <p className={styles.melding}>
              Concept staat in Gmail. Er is niets verstuurd.{" "}
              {stand.url && (
                <ExternalLink href={stand.url}>Openen in Gmail</ExternalLink>
              )}
            </p>
          )}
          {stand?.soort === "handmatig" && (
            <p className={styles.melding}>
              Kopiëren lukte niet. Selecteer de tekst hierboven en kopieer hem
              zelf, plak hem dan in Slack.
            </p>
          )}
          {stand?.soort === "verbinden" && (
            <p className={styles.melding}>
              Het dashboard mag nog geen concepten in Gmail maken. Verbind
              opnieuw met Google en geef toestemming.{" "}
              <VerbindLink href="/api/google/login">
                Opnieuw verbinden met Google
              </VerbindLink>
            </p>
          )}
          {stand?.soort === "fout" && (
            <p className={styles.melding}>{stand.fout}</p>
          )}
        </div>

        {!afgerond && (
          <div className={styles.voet}>
            <button
              type="button"
              className={`nd-button nd-button--quiet ${styles.eerst}`}
              disabled={bezig}
              onClick={() => beslis(onWijsAf)}
            >
              Afwijzen
            </button>
            <button
              type="button"
              className="nd-button"
              aria-busy={bezig}
              disabled={bezig}
              onClick={akkoord}
            >
              {AKKOORD_LABELS[voorstel.soort]}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
