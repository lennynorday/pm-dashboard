"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AkkoordUitkomst } from "@/lib/akkoord";
import { SOORT_LABELS, type Opdracht } from "@/lib/claude/voorstel";
import { ExternalLink } from "./ExternalLink";
import { ChevronIcon, CloseIcon } from "./icons";
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
  /** Feedback voor een nieuwe versie; de dialoog sluit zichzelf. */
  onPasAan: (feedback: string) => void;
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
  onPasAan,
}: Props) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const voorstel = opdracht.voorstel;
  const [stand, setStand] = useState<Stand | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gekozen, setGekozen] = useState<number | null>(null);
  const [aanpassen, setAanpassen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const feedbackVeld = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  useEffect(() => {
    if (aanpassen) feedbackVeld.current?.focus();
  }, [aanpassen]);

  if (!voorstel) return null;
  // Terugbladeren mag; klaarzetten en aanpassen kan alleen bij de nieuwste versie.
  const laatste = opdracht.versies.length - 1;
  const index = Math.min(gekozen ?? laatste, laatste);
  const versie = opdracht.versies[index];
  const nieuwste = index === laatste;
  const soort = SOORT_LABELS[voorstel.soort];
  const regels = [
    ["Aan", versie.ontvanger],
    ["Onderwerp", versie.onderwerp],
  ].filter((regel): regel is [string, string] => regel[1] !== null);

  function beslis(actie: () => void) {
    dialoog.current?.close();
    actie();
  }

  async function akkoord() {
    if (!voorstel || bezig) return;
    setBezig(true);
    const uitkomst = await onAkkoord().catch((): AkkoordUitkomst => ({
      uitkomst: "fout",
      fout: "Akkoord geven mislukte, probeer het opnieuw",
    }));
    setBezig(false);
    if (uitkomst.uitkomst === "verbinden")
      return setStand({ soort: "verbinden" });
    if (uitkomst.uitkomst === "fout") {
      return setStand({ soort: "fout", fout: uitkomst.fout });
    }
    if (voorstel.soort === "gmail-concept") {
      return setStand({ soort: "gmail", url: uitkomst.conceptUrl });
    }
    if (voorstel.soort === "advies") {
      dialoog.current?.close();
      return onKlaar("Akkoord gegeven");
    }
    // Slack: pas na het akkoord kopiëren, en pas na het kopiëren openen.
    const gekopieerd = await navigator.clipboard
      ?.writeText(voorstel.tekst)
      .then(
        () => true,
        () => false,
      );
    if (!gekopieerd) return setStand({ soort: "handmatig" });
    if (bron?.url && /^https?:/.test(bron.url)) {
      window.open(bron.url, "_blank", "noopener,noreferrer");
    }
    dialoog.current?.close();
    onKlaar("Tekst gekopieerd. Plak hem in Slack om te versturen.");
  }

  function pasAan(event: React.FormEvent) {
    event.preventDefault();
    const schoon = feedback.trim();
    if (!schoon) return feedbackVeld.current?.focus();
    dialoog.current?.close();
    onPasAan(schoon);
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
            {versie.feedback && (
              <>
                <h3 className={styles.blokKop}>Jouw feedback</h3>
                <p className={styles.bericht}>{versie.feedback}</p>
              </>
            )}
          </div>
          <div className={styles.blok}>
            <div className={styles.blokRij}>
              <h3 className={styles.blokKop}>{soort}</h3>
              {opdracht.versies.length > 1 && (
                <div className={styles.versies}>
                  <button
                    type="button"
                    className="nd-icon-button nd-icon-button--small"
                    aria-label="Vorige versie"
                    disabled={index === 0}
                    onClick={() => setGekozen(index - 1)}
                  >
                    <ChevronIcon className={styles.vorige} />
                  </button>
                  <span className="nd-meta" aria-live="polite">
                    Versie {index + 1} van {opdracht.versies.length}
                  </span>
                  <button
                    type="button"
                    className="nd-icon-button nd-icon-button--small"
                    aria-label="Volgende versie"
                    disabled={nieuwste}
                    onClick={() => setGekozen(index + 1)}
                  >
                    <ChevronIcon className={styles.volgende} />
                  </button>
                </div>
              )}
            </div>
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
                  value={versie.tekst}
                  aria-label="Tekst van het concept"
                  onFocus={(event) => event.target.select()}
                />
              ) : (
                <p className={styles.tekst}>{versie.tekst}</p>
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

        {!afgerond && aanpassen && (
          <form className={styles.aanpassen} onSubmit={pasAan}>
            <label className="nd-label" htmlFor="voorstel-feedback">
              Wat moet er anders?
            </label>
            <textarea
              ref={feedbackVeld}
              id="voorstel-feedback"
              className={`nd-field ${styles.handmatig}`}
              value={feedback}
              maxLength={2000}
              onChange={(event) => setFeedback(event.target.value)}
            />
            <div className={styles.voet}>
              <button
                type="button"
                className={`nd-button nd-button--quiet ${styles.eerst}`}
                onClick={() => setAanpassen(false)}
              >
                Annuleren
              </button>
              <button type="submit" className="nd-button">
                Nieuwe versie maken
              </button>
            </div>
          </form>
        )}

        {!afgerond && !aanpassen && (
          <div className={styles.voet}>
            <button
              type="button"
              className={`nd-button nd-button--quiet ${styles.eerst}`}
              disabled={bezig}
              onClick={() => beslis(onWijsAf)}
            >
              Afwijzen
            </button>
            {opdracht.status === "voorstel" && (
              <button
                type="button"
                className="nd-button nd-button--quiet"
                disabled={bezig || !nieuwste}
                onClick={() => setAanpassen(true)}
              >
                Aanpassen
              </button>
            )}
            <button
              type="button"
              className="nd-button"
              aria-busy={bezig}
              disabled={bezig || !nieuwste}
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
