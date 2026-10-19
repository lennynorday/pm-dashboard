"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./UitzetDialoog.module.css";

type Props = {
  titel: string;
  /** Wie en waar, bijvoorbeeld "Gmail · Jan de Vries"; leeg bij een eigen to-do. */
  wie: string;
  onSluit: () => void;
  onBevestig: (instructie: string) => void;
};

/**
 * Popup met het optionele instructieveld. Render hem alleen als hij open moet:
 * hij opent bij het laden en meldt via onSluit dat hij dicht is.
 */
export function UitzetDialoog({ titel, wie, onSluit, onBevestig }: Props) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const [instructie, setInstructie] = useState("");

  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  function verstuur(event: React.FormEvent) {
    event.preventDefault();
    dialoog.current?.close();
    onBevestig(instructie.trim());
  }

  return (
    <dialog
      ref={dialoog}
      className="nd-dialog"
      aria-labelledby="uitzet-kop"
      onClose={onSluit}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <form className="nd-dialog__body" onSubmit={verstuur}>
        <h2 id="uitzet-kop" className="nd-title">
          Uitzetten bij Claude
        </h2>
        <p className={`nd-meta ${styles.context}`}>
          {titel}
          {wie && ` · ${wie}`}
        </p>
        <div>
          <label className="nd-label" htmlFor="uitzet-instructie">
            Wat moet Claude doen? (optioneel)
          </label>
          <textarea
            id="uitzet-instructie"
            className={`nd-field ${styles.veld}`}
            value={instructie}
            maxLength={2000}
            aria-describedby="uitzet-hint"
            onChange={(event) => setInstructie(event.target.value)}
          />
          <p id="uitzet-hint" className={`nd-meta ${styles.hint}`}>
            Leeg laten: Claude kiest zelf. Claude maakt alleen een concept en
            verstuurt nooit iets.
          </p>
        </div>
        <div className="nd-dialog__foot">
          <button
            type="button"
            className="nd-button nd-button--quiet"
            onClick={() => dialoog.current?.close()}
          >
            Annuleren
          </button>
          <button type="submit" className="nd-button">
            Uitzetten
          </button>
        </div>
      </form>
    </dialog>
  );
}
