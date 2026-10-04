"use client";

import { useState, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { dataTheme, Thema, THEMA_COOKIE } from "@/lib/preferences";
import { setPreferenceCookie } from "./cookies";
import styles from "./Sidebar.module.css";

type Gekozen = "licht" | "donker";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Thema van de Mac; op de server onbekend. */
function useSysteemThema(): Gekozen | null {
  const donker = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => null,
  );
  if (donker === null) return null;
  return donker ? "donker" : "licht";
}

type Props = { initialThema: Thema };

/** Kiest licht of donker. Zonder keuze volgt de app de instelling van de Mac. */
export function ThemeSwitch({ initialThema }: Props) {
  const [thema, setThema] = useState<Thema>(initialThema);
  const systeem = useSysteemThema();
  const actief = thema === "systeem" ? systeem : thema;

  function kies(keuze: Gekozen) {
    setThema(keuze);
    setPreferenceCookie(THEMA_COOKIE, keuze);
    const value = dataTheme(keuze);
    if (value) document.documentElement.dataset.theme = value;
  }

  return (
    <div className={styles.theme} role="group" aria-label="Thema">
      <button
        type="button"
        className={styles.themeButton}
        aria-pressed={actief === "licht"}
        onClick={() => kies("licht")}
      >
        <SunIcon />
        <span className={styles.label}>Licht</span>
      </button>
      <button
        type="button"
        className={styles.themeButton}
        aria-pressed={actief === "donker"}
        onClick={() => kies("donker")}
      >
        <MoonIcon />
        <span className={styles.label}>Donker</span>
      </button>
    </div>
  );
}
