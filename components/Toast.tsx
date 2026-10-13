"use client";

import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";
import styles from "./Toast.module.css";

export type ToastOpties = {
  ongedaan?: () => void;
  link?: { label: string; href: string };
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

  function toon(tekst: string, opties: ToastOpties = {}) {
    clearTimeout(timer.current);
    setGetoond({ tekst, opties });
    setZichtbaar(true);
    timer.current = setTimeout(() => setZichtbaar(false), TOON_MS);
  }

  const element = (
    <div
      role="status"
      className={styles.toast}
      data-zichtbaar={zichtbaar || undefined}
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
