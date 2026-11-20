"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { bewaarNotulenAction, collegasAction } from "@/app/actions";
import type { Meeting } from "@/lib/meetings";
import { htmlNaarMd, mdNaarHtml } from "@/lib/notulen-opmaak";
import { naamOp, type Spreker, toonNaam } from "@/lib/sprekers";
import styles from "./NotulenAkkoord.module.css";

type Props = {
  meeting: Meeting;
  notulen: string;
  /** Wie welke spreker is; de namen in de notulen verwijzen ernaar. */
  sprekers: Spreker[];
  /** Laatst aangepast (ms); null als er nog niets is aangepast. */
  bewerkt: number | null;
  onSluit: () => void;
};

const BEWAAR_NA_MS = 800;

/** Het menu bij een naam; `eigen` is de eigen naam van die plek, `vrij` of hij zelf getypt is. */
type Menu = { scherm: "start" | "zoek" | "vrij"; eigen?: string; vrij: boolean };

/** Een naam-knop in het veld (zie mdNaarHtml). */
const alsNaamKnop = (doel: EventTarget | null) =>
  doel instanceof Element
    ? doel.closest<HTMLElement>("[data-spreker]")
    : null;

/**
 * Zet de namen in de naam-knoppen: bij Aanwezig volledig, elders de voornaam.
 * data-soort: spreker (volgt het sprekersveld), los (alleen hier) of vrij (zelf getypt).
 */
function vulKnoppen(veld: HTMLElement, sprekers: Spreker[], bekend: Set<string>) {
  for (const knop of veld.querySelectorAll<HTMLElement>("[data-spreker]")) {
    const label = knop.dataset.spreker ?? "";
    const eigen = knop.dataset.naam;
    const naam = naamOp(label, eigen, sprekers);
    const blok = knop.closest("p, li, h3, div");
    const volledig = blok?.textContent?.trimStart().startsWith("Aanwezig:") ?? false;
    knop.textContent = naam === label ? label : toonNaam(naam, volledig);
    knop.dataset.soort = !eigen ? "spreker" : bekend.has(eigen) ? "los" : "vrij";
    knop.setAttribute("aria-label", `${naam}, naam aanpassen`);
  }
}

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
export function NotulenAkkoord({
  meeting,
  notulen,
  sprekers: beginSprekers,
  bewerkt,
  onSluit,
}: Props) {
  const id = useId();
  const router = useRouter();
  const dialoog = useRef<HTMLDialogElement>(null);
  const veld = useRef<HTMLDivElement>(null);
  const wacht = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Waar de muisklik begon: een selectie die buiten het venster eindigt levert ook een click op het dialoog-element.
  const klikStart = useRef<EventTarget | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(bewerkt);
  const [mislukt, setMislukt] = useState(false);
  const [actief, setActief] = useState<ReadonlySet<string>>(new Set());
  const [bezig, startTransition] = useTransition();
  const [sprekers, setSprekers] = useState(beginSprekers);
  // Ook in de uitgestelde bewaar-timer de nieuwste sprekers.
  const sprekersNu = useRef(beginSprekers);
  const [collegas, setCollegas] = useState<string[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [zoek, setZoek] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  // De naam-knop waar het menu bij hoort; een DOM-element, dus geen state.
  const knopRef = useRef<HTMLElement | null>(null);
  const sprekerNamen = [...new Set(sprekers.map((s) => s.naam))];
  const bekend = new Set([...collegas, ...sprekerNamen]);

  useEffect(() => {
    // Alleen bij openen: daarna is het veld van de gebruiker, React schrijft er niet meer in.
    if (veld.current) veld.current.innerHTML = mdNaarHtml(notulen);
    dialoog.current?.showModal();
    veld.current?.focus();
    if (beginSprekers.length) void collegasAction().then(setCollegas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sprekersNu.current = sprekers;
    if (veld.current) vulKnoppen(veld.current, sprekers, bekend);
    // bekend volgt uit sprekers en collegas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprekers, collegas]);

  useEffect(() => {
    const paneel = menuRef.current;
    if (!menu || !paneel || !knopRef.current) return;
    const plek = knopRef.current.getBoundingClientRect();
    paneel.style.top = `${Math.max(8, Math.min(plek.bottom + 6, innerHeight - 340))}px`;
    paneel.style.left = `${Math.max(8, Math.min(plek.left, innerWidth - 296))}px`;
    if (!paneel.matches(":popover-open")) paneel.showPopover();
    paneel.querySelector<HTMLElement>("input, button")?.focus();
  }, [menu]);

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
    const tijd = await bewaarNotulenAction(
      meeting.id,
      tekst,
      sprekersNu.current,
      akkoord,
    );
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

  /** Een naam in het sprekersveld; staat die al bij een andere spreker, dan wisselen ze. */
  function kiesSpreker(label: string, naam: string) {
    const oud = sprekers.find((s) => s.label === label)?.naam;
    setSprekers(
      sprekers.map((s) => {
        if (s.label === label) return { ...s, naam };
        return s.naam === naam && oud ? { ...s, naam: oud } : s;
      }),
    );
    gewijzigd();
  }

  /** Een eigen naam voor één plek, of null: weer de naam van de spreker. */
  function zetPlek(naam: string | null) {
    const knop = knopRef.current;
    if (!knop || !veld.current) return;
    const spreker = sprekers.find((s) => s.label === knop.dataset.spreker);
    if (naam && naam !== spreker?.naam) knop.dataset.naam = naam;
    else delete knop.dataset.naam;
    vulKnoppen(veld.current, sprekers, bekend);
    menuRef.current?.hidePopover();
    gewijzigd();
  }

  function openMenu(knop: HTMLElement) {
    knopRef.current = knop;
    setZoek("");
    setMenu({
      scherm: "start",
      eigen: knop.dataset.naam,
      vrij: knop.dataset.soort === "vrij",
    });
  }

  function klik(event: React.MouseEvent<HTMLDivElement>) {
    const knop = alsNaamKnop(event.target);
    if (knop) openMenu(knop);
  }

  function toets(event: React.KeyboardEvent<HTMLDivElement>) {
    const knop = alsNaamKnop(event.target);
    if (knop && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openMenu(knop);
      return;
    }
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
        // Sluiten bewaart wat nog niet bewaard was en haalt het concept op, anders toont heropenen de oude tekst.
        const aangepast = wacht.current !== null || opgeslagen !== bewerkt;
        const klaar = wacht.current ? bewaar(false) : Promise.resolve();
        if (aangepast) void klaar.then(() => router.refresh());
        onSluit();
      }}
      onMouseDown={(event) => {
        klikStart.current = event.target;
      }}
      onClick={(event) => {
        const opBuitenKant =
          event.target === event.currentTarget &&
          klikStart.current === event.currentTarget;
        if (opBuitenKant) dialoog.current?.close();
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
        {sprekers.length > 0 && (
          <fieldset className={styles.sprekers}>
            <legend className={`nd-label ${styles.legenda}`}>Sprekers</legend>
            {sprekers.map((spreker) => (
              <div key={spreker.label} className={styles.spreker}>
                <label className="nd-meta" htmlFor={`${id}-${spreker.label}`}>
                  {spreker.label}
                </label>
                <select
                  id={`${id}-${spreker.label}`}
                  className={`nd-field ${styles.keuze}`}
                  value={spreker.naam}
                  onChange={(event) => kiesSpreker(spreker.label, event.target.value)}
                >
                  {[...new Set([...sprekerNamen, ...collegas])].map((naam) => (
                    <option key={naam}>{naam}</option>
                  ))}
                </select>
                {spreker.citaat && (
                  <p className={`nd-meta ${styles.citaat}`}>“{spreker.citaat}”</p>
                )}
              </div>
            ))}
            <p className={`nd-meta ${styles.regel}`}>
              Wat je hier kiest, verandert die persoon overal in de notulen.
              Klik op een naam in de tekst om alleen die plek aan te passen.
            </p>
          </fieldset>
        )}
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
          onClick={klik}
        />
        <div
          ref={menuRef}
          className={`nd-menu ${styles.menu}`}
          popover="auto"
          role="dialog"
          aria-label="Naam kiezen"
          onToggle={(event) => {
            if (event.newState !== "closed") return;
            knopRef.current?.focus();
            setMenu(null);
          }}
        >
          {menu?.scherm === "start" && (
            <>
              <p className={`nd-meta ${styles.menuKop}`}>Alleen deze plek</p>
              {sprekerNamen.map((naam) => (
                <button
                  key={naam}
                  type="button"
                  className="nd-menu__item"
                  onClick={() => zetPlek(naam)}
                >
                  {naam}
                </button>
              ))}
              <hr className="nd-menu__divider" />
              <button
                type="button"
                className="nd-menu__item"
                onClick={() => setMenu({ ...menu, scherm: "zoek" })}
              >
                Andere collega…
              </button>
              <button
                type="button"
                className="nd-menu__item"
                onClick={() => setMenu({ ...menu, scherm: "vrij" })}
              >
                Ontkoppelen…
              </button>
              {menu.eigen && (
                <>
                  <hr className="nd-menu__divider" />
                  <button
                    type="button"
                    className="nd-menu__item"
                    onClick={() => zetPlek(null)}
                  >
                    Terug naar spreker
                  </button>
                </>
              )}
            </>
          )}
          {menu?.scherm === "zoek" && (
            <>
              <p className={`nd-meta ${styles.menuKop}`}>Zoek in Slack-collega&apos;s</p>
              <input
                type="search"
                className={`nd-field nd-field--search ${styles.menuVeld}`}
                aria-label="Zoek een collega"
                placeholder="Naam"
                value={zoek}
                onChange={(event) => setZoek(event.target.value)}
              />
              <div className={styles.menuLijst}>
                {collegas
                  .filter((naam) => naam.toLowerCase().includes(zoek.toLowerCase()))
                  .map((naam) => (
                    <button
                      key={naam}
                      type="button"
                      className="nd-menu__item"
                      onClick={() => zetPlek(naam)}
                    >
                      {naam}
                    </button>
                  ))}
                {collegas.length === 0 && (
                  <p className={`nd-meta ${styles.menuKop}`}>Geen collega&apos;s gevonden in Slack</p>
                )}
              </div>
            </>
          )}
          {menu?.scherm === "vrij" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const naam = new FormData(event.currentTarget).get("naam");
                if (typeof naam === "string" && naam.trim()) zetPlek(naam.trim());
              }}
            >
              <p className={`nd-meta ${styles.menuKop}`}>Zelf een naam typen</p>
              <input
                name="naam"
                className={`nd-field ${styles.menuVeld}`}
                aria-label="Naam"
                defaultValue={menu.vrij ? menu.eigen : ""}
                maxLength={100}
                required
              />
              <button className="nd-button nd-button--small">Opslaan</button>
            </form>
          )}
        </div>
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
