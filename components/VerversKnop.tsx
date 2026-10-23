"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatTime } from "@/lib/format";
import type { Voortgang } from "@/lib/orbit/achtergrond";
import { RefreshIcon } from "./icons";
import styles from "./OrbitStatus.module.css";

// Orbit begrenst aanroepen per account; vlak na het ophalen nog eens verversen levert niets nieuws op.
const PAUZE_MS = 2 * 60 * 1000;

// Zolang er op de achtergrond geladen wordt, haalt de pagina zo vaak de nieuwe stand op.
const BIJWERKEN_MS = 10 * 1000;

type Props = { opgehaald: string; voortgang: Voortgang | null };

/**
 * Verversen, met een draaiend icoon tijdens het ophalen en een pauze daarna.
 * Loopt er op de achtergrond nog werk, dan is de knop een voortgangsbalk.
 */
export function VerversKnop({ opgehaald, voortgang }: Props) {
  const { pending } = useFormStatus();
  const router = useRouter();
  const vrijVanaf = new Date(opgehaald).getTime() + PAUZE_MS;
  const [nu, setNu] = useState(() => Date.now());

  useEffect(() => {
    const wacht = vrijVanaf - Date.now();
    if (wacht <= 0) return;
    const timer = setTimeout(() => setNu(Date.now()), wacht);
    return () => clearTimeout(timer);
  }, [vrijVanaf]);

  useEffect(() => {
    if (!voortgang) return;
    const timer = setInterval(() => router.refresh(), BIJWERKEN_MS);
    return () => clearInterval(timer);
  }, [voortgang, router]);

  const rust = nu < vrijVanaf;

  if (voortgang) {
    const { klaar, totaal } = voortgang;
    return (
      <span
        className={`nd-button nd-button--small ${styles.voortgang}`}
        role="progressbar"
        aria-label="Gegevens uit Orbit ophalen"
        aria-valuemin={0}
        aria-valuemax={totaal}
        aria-valuenow={klaar}
        aria-valuetext={`${klaar} van ${totaal}`}
        title="Nog even geduld, we halen alles voor je op uit Orbit"
      >
        <RefreshIcon className={styles.draait} />
        {klaar} van {totaal}
        <span
          className={styles.balk}
          style={{ inlineSize: `${(klaar / totaal) * 100}%` }}
          aria-hidden="true"
        />
      </span>
    );
  }
  const weer = formatTime(new Date(vrijVanaf));

  if (pending) {
    return (
      <button
        className="nd-button nd-button--small"
        type="submit"
        disabled
        aria-busy="true"
      >
        <RefreshIcon className={styles.draait} />
        Ophalen…
      </button>
    );
  }

  return (
    <button
      className="nd-button nd-button--small"
      type="submit"
      disabled={rust}
      title={
        rust
          ? `Net opgehaald; verversen kan weer om ${weer}`
          : "Orbit, Jira en Superhuman opnieuw ophalen"
      }
    >
      <RefreshIcon />
      Verversen
      <span className="visually-hidden">
        {rust
          ? `: kan weer om ${weer}`
          : ": Orbit, Jira en Superhuman opnieuw ophalen"}
      </span>
    </button>
  );
}
