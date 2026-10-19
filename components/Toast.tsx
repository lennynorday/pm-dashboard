"use client";

import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";
import styles from "./Toast.module.css";

export type ToastOpties = {
  ongedaan?: () => void;
  link?: { label: string; href: string };
  /** Een knop die iets doet in de pagina, zoals een dialoog openen. */
  knop?: { label: string; kies: () => void };
};

type Getoond = { tekst: string; opties: ToastOpties };

const TOON_MS = 5000;

/**
 * Melding onderin: schuift in, blijft even staan en schuift weer weg.
 * `toon(tekst, { ongedaan })` laat hem zien; render `element` ergens in de pagina.
 */
export function useToast() {
  const [getoond, setGetoond] = useState<Getoond | null>(null);
  const [zichtbaar, setZichtbaar] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const loop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setZichtbaar(false), TOON_MS);
  }, []);

  /** Stabiel, zodat een effect hem kan gebruiken. */
  const toon = useCallback(
    (tekst: string, opties: ToastOpties = {}) => {
      setGetoond({ tekst, opties });
      setZichtbaar(true);
      loop();
    },
    [loop],
  );

  const element = (
    <div
      role="status"
      className={styles.toast}
      data-zichtbaar={zichtbaar || undefined}
      // Met de muis erop of de focus erin blijft de melding staan (WCAG 2.2.1).
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={() => zichtbaar && loop()}
      onFocus={() => clearTimeout(timer.current)}
      onBlur={() => zichtbaar && loop()}
    >
      {getoond && (
        <>
          <span className={styles.vink} aria-hidden="true">
            <CheckIcon />
          </span>
          <span>{getoond.tekst}</span>
          {getoond.opties.link && (
            <NextLink href={getoond.opties.link.href} className={styles.actie}>
              {getoond.opties.link.label}
            </NextLink>
          )}
          {getoond.opties.knop && (
            <button
              type="button"
              className={styles.actie}
              onClick={() => {
                getoond.opties.knop?.kies();
                setZichtbaar(false);
              }}
            >
              {getoond.opties.knop.label}
            </button>
          )}
          {getoond.opties.ongedaan && (
            <button
              type="button"
              className={styles.actie}
              onClick={() => {
                getoond.opties.ongedaan?.();
                setZichtbaar(false);
              }}
            >
              Ongedaan maken
            </button>
          )}
        </>
      )}
    </div>
  );

  return { toon, element };
}
