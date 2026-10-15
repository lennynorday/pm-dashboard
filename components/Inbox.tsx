"use client";

import { useEffect, useState } from "react";
import {
  naarTodoAction,
  sluitUitAction,
  staToeAction,
  verplaatsTaakAction,
} from "@/app/actions";
import { BRON_LABELS, domeinVan, type Prio, type Taak } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import { BlockIcon, CloseIcon, PlusIcon, StarIcon } from "./icons";
import styles from "./Inbox.module.css";
import { TodoDialoog, type DialoogBron } from "./TodoDialoog";
import { useToast } from "./Toast";

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const tijdTekst = (taak: Taak) =>
  taak.tijd === null ? null : tijdFormat.format(new Date(taak.tijd * 1000));

// Bij mail is de titel het onderwerp en het bericht een voorproefje.
const berichtTekst = (taak: Taak) =>
  taak.bron === "gmail" ? taak.titel : (taak.bericht ?? taak.titel);

function dialoogBron(taak: Taak): DialoogBron {
  const wie = [taak.auteur, taak.plek, tijdTekst(taak)]
    .filter(Boolean)
    .join(" · ");
  return {
    label: BRON_LABELS[taak.bron],
    wie,
    tekst: berichtTekst(taak),
    url: taak.url,
  };
}

export function Inbox({ taken }: { taken: Taak[] }) {
  // Weggehaald is lokaal bijgehouden, zodat een item niet terugspringt voor de server klaar is.
  const [weg, setWeg] = useState<ReadonlySet<number>>(new Set());
  const [kiezen, setKiezen] = useState<Taak | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const { toon, element } = useToast();

  useEffect(() => {
    if (menu === null) return;
    document.querySelector<HTMLElement>(`#menu-${menu} button`)?.focus();
    const sluitBuiten = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[data-menu="${menu}"]`))
        setMenu(null);
    };
    const sluitEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      document.getElementById(`meer-${menu}`)?.focus();
    };
    document.addEventListener("pointerdown", sluitBuiten);
    document.addEventListener("keydown", sluitEscape);
    return () => {
      document.removeEventListener("pointerdown", sluitBuiten);
      document.removeEventListener("keydown", sluitEscape);
    };
  }, [menu]);

  function haalWeg(id: number) {
    setWeg((huidig) => new Set(huidig).add(id));
  }

  function zetTerug(id: number) {
    setWeg((huidig) => {
      const nieuw = new Set(huidig);
      nieuw.delete(id);
      return nieuw;
    });
    void verplaatsTaakAction(id, "inbox");
  }

  function bevestig(taak: Taak, titel: string, prio: Prio) {
    setKiezen(null);
    haalWeg(taak.id);
    void naarTodoAction(taak.id, titel, prio);
    toon("Toegevoegd aan je to-do's", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => zetTerug(taak.id),
    });
  }

  function negeer(taak: Taak) {
    haalWeg(taak.id);
    void verplaatsTaakAction(taak.id, "genegeerd");
    toon("Genegeerd", { ongedaan: () => zetTerug(taak.id) });
  }

  function sluitUit(taak: Taak, soort: "afzender" | "domein") {
    if (!taak.afzender) return;
    const waarde =
      soort === "afzender" ? taak.afzender : domeinVan(taak.afzender);
    setMenu(null);
    haalWeg(taak.id);
    void sluitUitAction(taak.id, soort);
    toon(`Mail van ${waarde} komt niet meer in je Inbox`, {
      ongedaan: () => {
        setWeg((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(taak.id);
          return nieuw;
        });
        void staToeAction(waarde, taak.id);
      },
    });
  }

  const open = taken.filter((taak) => !weg.has(taak.id));

  return (
    <>
      <section className={styles.paneel} aria-label="Inbox">
        {open.length === 0 && <p className={styles.leeg}>Inbox leeg.</p>}
        <ul className={styles.lijst}>
          {taken.map((taak) => {
            const gmail = taak.bron === "gmail";
            return (
              <li
                key={taak.id}
                className={styles.rij}
                data-weg={weg.has(taak.id) || undefined}
                inert={weg.has(taak.id)}
              >
                <div className={styles.klap}>
                  <div className={styles.item}>
                    <div className={styles.body}>
                      <p className={styles.meta}>
                        <span
                          className={`${styles.bron} ${gmail ? styles.gmail : ""}`}
                        >
                          {BRON_LABELS[taak.bron]}
                        </span>
                        {gmail && taak.soort === "Ster" && (
                          <span className={styles.ster}>
                            <StarIcon className={styles.sterIcoon} />
                            Ster
                          </span>
                        )}
                        {taak.auteur && <span>{taak.auteur}</span>}
                        {taak.plek && <span>{taak.plek}</span>}
                        {gmail && taak.soort !== "Ster" && taak.soort && (
                          <span>{taak.soort}</span>
                        )}
                        {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                        {!gmail && taak.soort && <span>{taak.soort}</span>}
                      </p>
                      <p
                        className={
                          gmail
                            ? styles.titel
                            : `${styles.snippet} ${styles.bericht}`
                        }
                      >
                        {berichtTekst(taak)}
                      </p>
                      {gmail && taak.bericht && (
                        <p className={styles.snippet}>{taak.bericht}</p>
                      )}
                    </div>
                    <div className={styles.acties}>
                      <button
                        type="button"
                        className={`${styles.actie} ${styles.hoofd}`}
                        onClick={() => setKiezen(taak)}
                      >
                        <PlusIcon className={styles.icoon} />
                        Naar to-do
                      </button>
                      {taak.url && (
                        <ExternalLink href={taak.url} className={styles.actie}>
                          Openen in {BRON_LABELS[taak.bron]}
                        </ExternalLink>
                      )}
                      <button
                        type="button"
                        className={styles.actie}
                        onClick={() => negeer(taak)}
                      >
                        <CloseIcon className={styles.icoon} />
                        Negeren
                        <span className="visually-hidden">
                          : {berichtTekst(taak)}
                        </span>
                      </button>
                      {gmail && taak.afzender && (
                        <>
                          <button
                            type="button"
                            id={`meer-${taak.id}`}
                            data-menu={taak.id}
                            className={styles.actie}
                            aria-haspopup="menu"
                            aria-expanded={menu === taak.id}
                            aria-controls={`menu-${taak.id}`}
                            onClick={() =>
                              setMenu(menu === taak.id ? null : taak.id)
                            }
                          >
                            <BlockIcon className={styles.icoon} />
                            Afzender negeren…
                            <span className="visually-hidden">
                              : {berichtTekst(taak)}
                            </span>
                          </button>
                          <div
                            id={`menu-${taak.id}`}
                            data-menu={taak.id}
                            role="menu"
                            className={styles.menu}
                            hidden={menu !== taak.id}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => sluitUit(taak, "afzender")}
                            >
                              Nooit meer van {taak.auteur ?? taak.afzender}
                              <small>{taak.afzender}</small>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => sluitUit(taak, "domein")}
                            >
                              Nooit meer van {domeinVan(taak.afzender)}
                              <small>Alle afzenders op dit domein</small>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {kiezen && (
        <TodoDialoog
          modus="nieuw"
          bron={dialoogBron(kiezen)}
          onSluit={() => setKiezen(null)}
          onBevestig={(titel, prio) => bevestig(kiezen, titel, prio)}
        />
      )}
      {element}
    </>
  );
}
