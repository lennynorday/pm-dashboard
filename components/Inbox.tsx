"use client";

import { useEffect, useState } from "react";
import {
  gedaanAction,
  naarTodoAction,
  sluitUitAction,
  staToeAction,
  verplaatsTaakAction,
  zetStatusAction,
} from "@/app/actions";
import { BRON_LABELS, domeinVan, type Prio, type Taak } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import {
  BlockIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  InboxIcon,
  PlusIcon,
  StarIcon,
} from "./icons";
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

type Props = { taken: Taak[]; genegeerd: Taak[] };

export function Inbox({ taken, genegeerd }: Props) {
  // Weggehaald is lokaal bijgehouden, zodat een item niet terugspringt voor de server klaar is.
  const [weg, setWeg] = useState<ReadonlySet<number>>(new Set());
  const [kiezen, setKiezen] = useState<Taak | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  // Teruggezet uit genegeerd, tot de server de lijsten ververst.
  const [terug, setTerug] = useState<ReadonlySet<number>>(new Set());
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

  function gedaan(taak: Taak) {
    haalWeg(taak.id);
    void gedaanAction(taak.id);
    toon("Gedaan, staat in Klaar", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => {
        zetTerug(taak.id);
        void zetStatusAction(taak.id, "niet-gestart");
      },
    });
  }

  function negeer(taak: Taak) {
    haalWeg(taak.id);
    void verplaatsTaakAction(taak.id, "genegeerd");
    toon("Genegeerd", { ongedaan: () => zetTerug(taak.id) });
  }

  function haalTerug(taak: Taak) {
    zetTerug(taak.id);
    setTerug((huidig) => new Set(huidig).add(taak.id));
    void verplaatsTaakAction(taak.id, "inbox");
    toon("Terug in je Inbox", {
      ongedaan: () => {
        setTerug((huidig) => {
          const nieuw = new Set(huidig);
          nieuw.delete(taak.id);
          return nieuw;
        });
        void verplaatsTaakAction(taak.id, "genegeerd");
      },
    });
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
  const stil = genegeerd.filter((taak) => !terug.has(taak.id));

  return (
    <>
      <section className={styles.paneel} aria-label="Inbox">
        {open.length === 0 && <p className="nd-empty">Inbox leeg.</p>}
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
                  <div className={`nd-row ${styles.item}`}>
                    <div className={styles.body}>
                      <p className={`nd-meta ${styles.meta}`}>
                        <span
                          className="nd-chip"
                          data-tint={gmail ? "pink" : "lilac"}
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
                      <p className={gmail ? styles.titel : styles.snippet}>
                        {berichtTekst(taak)}
                      </p>
                      {gmail && taak.bericht && (
                        <p className={styles.snippet}>{taak.bericht}</p>
                      )}
                    </div>
                    <div className={`nd-actions ${styles.acties}`}>
                      <div className={styles.kolom}>
                        {taak.url && (
                          <ExternalLink href={taak.url} className="nd-action">
                            Open in {BRON_LABELS[taak.bron]}
                          </ExternalLink>
                        )}
                        <button
                          type="button"
                          className="nd-action nd-action--main"
                          onClick={() => setKiezen(taak)}
                        >
                          <PlusIcon className={styles.icoon} />
                          Maak to-do aan
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                      </div>
                      <div className={styles.kolom}>
                        <button
                          type="button"
                          className={`nd-action ${styles.gedaan}`}
                          onClick={() => gedaan(taak)}
                        >
                          <CheckIcon className={styles.icoon} />
                          Gedaan
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="nd-action"
                          onClick={() => negeer(taak)}
                        >
                          <CloseIcon className={styles.icoon} />
                          Negeer
                          <span className="nd-visually-hidden">
                            : {berichtTekst(taak)}
                          </span>
                        </button>
                        {gmail && taak.afzender && (
                          <>
                            <button
                              type="button"
                              id={`meer-${taak.id}`}
                              data-menu={taak.id}
                              className="nd-action"
                              aria-haspopup="menu"
                              aria-expanded={menu === taak.id}
                              aria-controls={`menu-${taak.id}`}
                              onClick={() =>
                                setMenu(menu === taak.id ? null : taak.id)
                              }
                            >
                              <BlockIcon className={styles.icoon} />
                              Demp
                              <span className="nd-visually-hidden">
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
                                Demp {taak.auteur ?? taak.afzender}
                                <small>{taak.afzender}</small>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => sluitUit(taak, "domein")}
                              >
                                Demp {domeinVan(taak.afzender)}
                                <small>Alle afzenders op dit domein</small>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {stil.length > 0 && (
        <details className={styles.genegeerd}>
          <summary>
            <ChevronIcon className={styles.icoon} aria-hidden="true" />
            {stil.length} genegeerd
          </summary>
          <p className={styles.hint}>
            Afgelopen 30 dagen, nieuwste eerst. Komt er een nieuw bericht in het
            gesprek, dan staat het vanzelf weer in je Inbox.
          </p>
          <ul className={`${styles.lijst} ${styles.stil}`}>
            {stil.map((taak) => (
              <li key={taak.id} className={`nd-row ${styles.item}`}>
                <div className={styles.body}>
                  <p className={`nd-meta ${styles.meta}`}>
                    <span
                      className="nd-chip"
                      data-tint={taak.bron === "gmail" ? "pink" : "lilac"}
                    >
                      {BRON_LABELS[taak.bron]}
                    </span>
                    {taak.auteur && <span>{taak.auteur}</span>}
                    {taak.plek && <span>{taak.plek}</span>}
                    {taak.tijd !== null && <span>{tijdTekst(taak)}</span>}
                  </p>
                  <p className={styles.snippet}>{berichtTekst(taak)}</p>
                </div>
                <div className={`nd-actions ${styles.acties}`}>
                  <button
                    type="button"
                    className="nd-action nd-action--main"
                    onClick={() => haalTerug(taak)}
                  >
                    <InboxIcon className={styles.icoon} />
                    Zet terug
                    <span className="nd-visually-hidden">
                      : {berichtTekst(taak)}
                    </span>
                  </button>
                  {taak.url && (
                    <ExternalLink href={taak.url} className="nd-action">
                      Open in {BRON_LABELS[taak.bron]}
                    </ExternalLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

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
