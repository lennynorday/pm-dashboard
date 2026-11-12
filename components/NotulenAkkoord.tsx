"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { bewaarNotulenAction } from "@/app/actions";
import type { Meeting } from "@/lib/meetings";
import { htmlNaarMd, mdNaarHtml } from "@/lib/notulen-opmaak";
import styles from "./NotulenAkkoord.module.css";

type Props = {
  meeting: Meeting;
  notulen: string;
  /** Laatst aangepast (ms); null als er nog niets is aangepast. */
  bewerkt: number | null;
  onSluit: () => void;
};

const BEWAAR_NA_MS = 800;

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const dagFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

// execCommand is verouderd, maar is nog steeds de enige manier waarop ongedaan maken (⌘Z) in een contenteditable blijft werken.
const OPMAAK = [
  { opdracht: "bold", label: "Vet", toets: "⌘B", inhoud: <strong>B</strong> },
  { opdracht: "italic", label: "Cursief", toets: "⌘I", inhoud: <em>I</em> },
  { opdracht: "kop", label: "Kop", toets: null, inhoud: "Kop" },
  { opdracht: "insertUnorderedList", label: "Opsomming", toets: "⇧⌘8", inhoud: "• Lijst" },
  { opdracht: "insertOrderedList", label: "Genummerde lijst", toets: "⇧⌘7", inhoud: "1. Lijst" },
] as const;

/** Sneltoetsen op event.code, zodat ⇧⌘7 en ⇧⌘8 op elk toetsenbord werken. */
const SNELTOETSEN: Record<string, { shift: boolean; opdracht: string }> = {
  KeyB: { shift: false, opdracht: "bold" },
  KeyI: { shift: false, opdracht: "italic" },
  Digit7: { shift: true, opdracht: "insertOrderedList" },
  Digit8: { shift: true, opdracht: "insertUnorderedList" },
};

/** Welke opmaak aan staat waar de cursor staat, voor de knoppenbalk. */
const actieveOpmaak = () =>
  new Set<string>(
    OPMAAK.map((knop) => knop.opdracht).filter(
      (opdracht) => opdracht !== "kop" && document.queryCommandState(opdracht),
    ),
  );

/** De notulen lezen en aanpassen; elke wijziging is meteen een concept, Akkoord zet ze door. */
export function NotulenAkkoord({ meeting, notulen, bewerkt, onSluit }: Props) {
  const id = useId();
  const dialoog = useRef<HTMLDialogElement>(null);
  const veld = useRef<HTMLDivElement>(null);
  const wacht = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(bewerkt);
  const [mislukt, setMislukt] = useState(false);
  const [actief, setActief] = useState<ReadonlySet<string>>(new Set());
  const [bezig, startTransition] = useTransition();

  useEffect(() => {
    // Alleen bij openen: daarna is het veld van de gebruiker, React schrijft er niet meer in.
    if (veld.current) veld.current.innerHTML = mdNaarHtml(notulen);
    dialoog.current?.showModal();
    veld.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const kijk = () => setActief(actieveOpmaak());
    document.addEventListener("selectionchange", kijk);
    return () => document.removeEventListener("selectionchange", kijk);
  }, []);

  const markdown = () => (veld.current ? htmlNaarMd(veld.current) : "");

  async function bewaar(akkoord: boolean) {
    if (wacht.current) clearTimeout(wacht.current);
    wacht.current = null;
    const tekst = markdown();
    if (!tekst.trim()) return null;
    const tijd = await bewaarNotulenAction(meeting.id, tekst, akkoord);
    setMislukt(tijd === null);
    if (tijd !== null) setOpgeslagen(tijd);
    return tijd;
  }

  function gewijzigd() {
    if (wacht.current) clearTimeout(wacht.current);
    wacht.current = setTimeout(() => void bewaar(false), BEWAAR_NA_MS);
  }

  function voerUit(opdracht: string) {
    if (opdracht === "kop") {
      const inKop = window
        .getSelection()
        ?.anchorNode?.parentElement?.closest("h3");
      document.execCommand("formatBlock", false, inKop ? "p" : "h3");
    } else document.execCommand(opdracht);
    // Ook zonder selectie meteen tonen: dan komt er geen selectionchange.
    setActief(actieveOpmaak());
    gewijzigd();
  }

  function toets(event: React.KeyboardEvent<HTMLDivElement>) {
    const sneltoets = SNELTOETSEN[event.code];
    if (!sneltoets || !(event.metaKey || event.ctrlKey)) return;
    if (event.shiftKey !== sneltoets.shift) return;
    event.preventDefault();
    voerUit(sneltoets.opdracht);
  }

  function invoer(event: React.FormEvent<HTMLDivElement>) {
    // "- " aan het begin van een regel wordt een opsomming, zoals in Superhuman.
    const selectie = window.getSelection();
    const knoop = selectie?.anchorNode;
    const begin =
      (event.nativeEvent as InputEvent).data === " " &&
      knoop?.nodeType === Node.TEXT_NODE &&
      knoop.textContent?.slice(0, selectie?.anchorOffset) === "- " &&
      !knoop.parentElement?.closest("li");
    if (begin && knoop) {
      knoop.textContent = knoop.textContent?.slice(2) ?? "";
      document.execCommand("insertUnorderedList");
    }
    gewijzigd();
  }

  const status = () => {
    if (mislukt) return "Opslaan mislukt, probeer het opnieuw";
    if (opgeslagen === null) return "Nog niets aangepast";
    return `Concept opgeslagen om ${tijdFormat.format(opgeslagen)}`;
  };

  return (
    <dialog
      ref={dialoog}
      className={`nd-dialog ${styles.dialoog}`}
      aria-labelledby={`${id}-kop`}
      onClose={() => {
        // Sluiten bewaart wat nog niet bewaard was.
        if (wacht.current) void bewaar(false);
        onSluit();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <div className="nd-dialog__body">
        <p className={`nd-meta ${styles.regel}`}>
          {dagFormat.format(Date.parse(meeting.start))} · {meeting.van}–
          {meeting.tot} · {meeting.label}
        </p>
        <div className={styles.kop}>
          <h2 className={`nd-title ${styles.regel}`} id={`${id}-kop`}>
            {meeting.titel}
          </h2>
          <p
            className={`nd-meta ${styles.regel}`}
            role={mislukt ? "alert" : "status"}
          >
            {status()}
          </p>
        </div>
        <div
          className={styles.balk}
          role="toolbar"
          aria-label="Opmaak"
          aria-controls={`${id}-veld`}
        >
          {OPMAAK.map((knop) => (
            <button
              key={knop.opdracht}
              type="button"
              className={styles.knop}
              title={knop.toets ? `${knop.label} (${knop.toets})` : knop.label}
              aria-label={knop.label}
              aria-pressed={
                knop.opdracht === "kop" ? undefined : actief.has(knop.opdracht)
              }
              // Muisklik mag de selectie in het veld niet weghalen.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => voerUit(knop.opdracht)}
            >
              {knop.inhoud}
            </button>
          ))}
        </div>
        <div
          ref={veld}
          id={`${id}-veld`}
          className={styles.veld}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Notulen"
          onKeyDown={toets}
          onInput={invoer}
        />
        <div className={`nd-dialog__foot ${styles.voet}`}>
          <button
            type="button"
            className="nd-button nd-button--quiet"
            onClick={() => dialoog.current?.close()}
          >
            Sluiten
          </button>
          <button
            type="button"
            className="nd-button"
            aria-busy={bezig}
            disabled={bezig}
            onClick={() =>
              startTransition(async () => {
                if ((await bewaar(true)) !== null) dialoog.current?.close();
              })
            }
          >
            Akkoord, zet in Superhuman
          </button>
        </div>
      </div>
    </dialog>
  );
}
