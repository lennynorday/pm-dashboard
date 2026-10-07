"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatTime } from "@/lib/format";
import { RefreshIcon } from "./icons";
import styles from "./OrbitStatus.module.css";

// Orbit begrenst aanroepen per account; vlak na het ophalen nog eens verversen levert niets nieuws op.
const PAUZE_MS = 2 * 60 * 1000;

type Props = { opgehaald: string };

/** Verversen, met een draaiend icoon tijdens het ophalen en een pauze daarna. */
export function VerversKnop({ opgehaald }: Props) {
  const { pending } = useFormStatus();
  const vrijVanaf = new Date(opgehaald).getTime() + PAUZE_MS;
  const [nu, setNu] = useState(() => Date.now());

  useEffect(() => {
    const wacht = vrijVanaf - Date.now();
    if (wacht <= 0) return;
    const timer = setTimeout(() => setNu(Date.now()), wacht);
    return () => clearTimeout(timer);
  }, [vrijVanaf]);

  const rust = nu < vrijVanaf;
  const weer = formatTime(new Date(vrijVanaf));

  if (pending) {
    return (
      <button className={styles.knop} type="submit" disabled aria-busy="true">
        <RefreshIcon className={`${styles.icoon} ${styles.draait}`} />
        Ophalen…
      </button>
    );
  }

  return (
    <button
      className={styles.knop}
      type="submit"
      disabled={rust}
      title={
        rust
          ? `Net opgehaald; verversen kan weer om ${weer}`
          : "Orbit, Jira en Superhuman opnieuw ophalen"
      }
    >
      <RefreshIcon className={styles.icoon} />
      Verversen
      <span className="visually-hidden">
        {rust
          ? `: kan weer om ${weer}`
          : ": Orbit, Jira en Superhuman opnieuw ophalen"}
      </span>
    </button>
  );
}
