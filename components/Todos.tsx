"use client";

import NextLink from "next/link";
import {
  Fragment,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  hernoemTaakAction,
  nieuweTaakAction,
  verplaatsTaakAction,
  zetGezienAction,
  zetPrioAction,
  zetStatusAction,
  zetVolgordeAction,
} from "@/app/actions";
import {
  BRON_LABELS,
  parseInboxBron,
  PRIO_LABELS,
  PRIOS,
  STATUS_LABELS,
  STATUSSEN,
  type Prio,
  type Status,
  type Taak,
} from "@/lib/taak";
import { setPreferenceCookie } from "./Sidebar/cookies";
import {
  BoardIcon,
  CheckIcon,
  ChevronIcon,
  ExternalIcon,
  MenuIcon,
  InboxIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
} from "./icons";
import styles from "./Todos.module.css";
import { TodoDialoog, type DialoogBron } from "./TodoDialoog";
import { useToast } from "./Toast";
import { TodosMenu, type MenuItem } from "./TodosMenu";
import {
  SORTERING_COOKIE,
  SORTERING_LABELS,
  TODOS_COOKIE,
  type Sortering,
  type Weergave,
} from "./TodosWeergave";

type Patch = Pick<Taak, "id"> &
  Partial<
    Pick<Taak, "status" | "prio" | "lijst" | "titel" | "positie" | "reactie">
  >;

/** Klaar is geen kolom maar een afrondzone. */
const KOLOMMEN = STATUSSEN.filter((status) => status !== "klaar");

/** Sorteer stabiel; de volgorde van de database is nieuwste eerst. Nieuwe kaarten (positie null) staan bovenaan. */
const SORTEERDERS: Record<Sortering, (a: Taak, b: Taak) => number> = {
  nieuwste: () => 0,
  prio: (a, b) => a.prio - b.prio,
  eigen: (a, b) => (a.positie ?? -1) - (b.positie ?? -1),
};

const statusKlasse = (status: Status) => styles[`st-${status}`];
const prioKlasse = (prio: Prio) => styles[`pr-${prio}`];
const prioLabel = (prio: Prio) => `${prio} | ${PRIO_LABELS[prio]}`;

function SearchIcon() {
  return (
    <svg
      className={styles.zoekIcoon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

const berichtTekst = (taak: Taak) => taak.bericht ?? taak.titel;

function dialoogBron(taak: Taak): DialoogBron | undefined {
  if (taak.bron === "eigen") return undefined;
  const wie = (taak.bron === "feed" ? [taak.plek] : [taak.auteur, taak.plek])
    .filter(Boolean)
    .join(" · ");
  return {
    label: BRON_LABELS[taak.bron],
    wie,
    tekst: taak.bericht ?? "",
    url: taak.url,
  };
}

type Props = { taken: Taak[]; weergave: Weergave; sortering: Sortering };

export function Todos({ taken, weergave: start, sortering: kiesStart }: Props) {
  const [weergave, setWeergave] = useState(start);
  const [sortering, setSortering] = useState(kiesStart);
  const [zoek, setZoek] = useState("");
  const [nieuw, setNieuw] = useState<Status | null>(null);
  const [bewerk, setBewerk] = useState<Taak | null>(null);
  const { toon, element: melding } = useToast();
  const [sleepId, setSleepId] = useState<number | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  /** Waar de lijn staat in Eigen volgorde: voor kaart `voor`, of onderaan bij null. */
  const [lijn, setLijn] = useState<{ status: Status; voor: number | null }>();
  const [, startTransition] = useTransition();
  const [optimistisch, pasToe] = useOptimistic(
    taken,
    (huidig: Taak[], patches: Patch | Patch[]) =>
      huidig
        .map((taak) => ({
          ...taak,
          ...[patches].flat().find((patch) => patch.id === taak.id),
        }))
        .filter((taak) => taak.lijst === "todo"),
  );
  const nieuwVeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nieuw) nieuwVeld.current?.focus();
  }, [nieuw]);

  const zichtbaar = optimistisch.filter((taak) =>
    taak.titel.toLowerCase().includes(zoek.trim().toLowerCase()),
  );

  function wijzig(patch: Patch | Patch[], actie: () => Promise<void>) {
    startTransition(async () => {
      pasToe(patch);
      await actie();
    });
  }

  function zetStatus(taak: Taak, status: Status) {
    if (status === taak.status) return;
    if (status === "klaar") {
      const vorige = taak.status;
      toon("Afgerond, te vinden onder Klaar in de lijst", {
        ongedaan: () =>
          wijzig({ id: taak.id, status: vorige }, () =>
            zetStatusAction(taak.id, vorige),
          ),
      });
    }
    wijzig({ id: taak.id, status }, () => zetStatusAction(taak.id, status));
  }

  /** Zet de kaart in de kolom: bovenaan, of in Eigen volgorde voor kaart `voor`. */
  function zetInKolom(taak: Taak, status: Status, voor: number | null) {
    const ids = optimistisch
      .filter((t) => t.status === status && t.id !== taak.id)
      .sort(SORTEERDERS.eigen)
      .map((t) => t.id);
    const plek = sortering === "eigen" ? ids.indexOf(voor ?? -1) : 0;
    ids.splice(plek < 0 ? ids.length : plek, 0, taak.id);
    wijzig(
      ids.map((id, positie) => ({ id, status, positie })),
      () => zetVolgordeAction(status, ids),
    );
  }

  function zetPrio(taak: Taak, prio: Prio) {
    wijzig({ id: taak.id, prio }, () => zetPrioAction(taak.id, prio));
  }

  function zetGezien(taak: Taak) {
    const reactie = taak.reactie;
    wijzig({ id: taak.id, reactie: null }, () =>
      zetGezienAction(taak.id, true),
    );
    toon("Gezien", {
      ongedaan: () =>
        wijzig({ id: taak.id, reactie }, () => zetGezienAction(taak.id, false)),
    });
  }

  const reactie = (taak: Taak) =>
    taak.reactie !== null &&
    taak.status !== "klaar" && (
      <div className={styles.reactie}>
        <span className={styles.reactieLabel}>
          Nieuwe reactie{taak.auteur && ` van ${taak.auteur}`}
        </span>
        {taak.bericht && (
          <span className={styles.reactieTekst}>{taak.bericht}</span>
        )}
        <button
          type="button"
          className={styles.gezien}
          onClick={() => zetGezien(taak)}
        >
          Gezien<span className="visually-hidden">: {taak.titel}</span>
        </button>
      </div>
    );

  function hernoem(taak: Taak, titel: string) {
    setBewerk(null);
    wijzig({ id: taak.id, titel }, () => hernoemTaakAction(taak.id, titel));
    toon("Titel aangepast");
  }

  function kiesWeergave(nieuweWeergave: Weergave) {
    setWeergave(nieuweWeergave);
    setPreferenceCookie(TODOS_COOKIE, nieuweWeergave);
  }

  function kiesSortering(nieuweSortering: Sortering) {
    setSortering(nieuweSortering);
    setPreferenceCookie(SORTERING_COOKIE, nieuweSortering);
  }

  function voegToe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const titel = nieuwVeld.current?.value.trim();
    if (!titel || !nieuw) return;
    const status = nieuw;
    startTransition(() => nieuweTaakAction(titel, status));
    e.currentTarget.reset();
  }

  function statusItems(taak: Taak, scheiding = false): MenuItem[] {
    return STATUSSEN.map((status, nummer) => ({
      label: STATUS_LABELS[status],
      scheiding: nummer === 0 ? scheiding : undefined,
      stip: statusKlasse(status),
      gekozen: status === taak.status,
      kies: () => zetStatus(taak, status),
    }));
  }

  function prioItems(taak: Taak): MenuItem[] {
    return PRIOS.map((prio) => ({
      label: prioLabel(prio),
      stip: prioKlasse(prio),
      gekozen: prio === taak.prio,
      kies: () => zetPrio(taak, prio),
    }));
  }

  function actieItems(taak: Taak): MenuItem[] {
    const items = [
      { label: "Titel bewerken", kies: () => setBewerk(taak) },
      ...statusItems(taak, true),
    ];
    if (!parseInboxBron(taak.bron)) return items;
    return [
      ...items,
      {
        label: "Terug naar de inbox",
        scheiding: true,
        kies: () =>
          wijzig({ id: taak.id, lijst: "inbox" }, () =>
            verplaatsTaakAction(taak.id, "inbox"),
          ),
      },
    ];
  }

  const prioKnop = (taak: Taak) => (
    <TodosMenu
      knopClass={`${styles.chip} ${styles.chipKnop} ${prioKlasse(taak.prio)}`}
      ariaLabel={`${prioLabel(taak.prio)}, prioriteit wijzigen: ${taak.titel}`}
      items={prioItems(taak)}
    >
      {prioLabel(taak.prio)}
    </TodosMenu>
  );

  // Een feedmelding linkt naar Orbit, Jira of een pagina in het dashboard; noem waar de link heen gaat.
  const openTekst = (taak: Taak) => {
    if (taak.bron !== "feed") return `Openen in ${BRON_LABELS[taak.bron]}`;
    if (/teamleader\.eu/.test(taak.url ?? "")) return "Openen in Orbit";
    if (/atlassian\.net/.test(taak.url ?? "")) return "Openen in Jira";
    return "Openen";
  };

  const bronLink = (taak: Taak, klasse: string, inhoud: React.ReactNode) => {
    if (!taak.url) return null;
    const extern = /^https?:/.test(taak.url);
    const label = `${openTekst(taak)}: ${berichtTekst(taak)}${extern ? " (opent in nieuw tabblad)" : ""}`;
    return extern ? (
      <a
        href={taak.url}
        className={klasse}
        aria-label={label}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inhoud}
      </a>
    ) : (
      <NextLink href={taak.url} className={klasse} aria-label={label}>
        {inhoud}
      </NextLink>
    );
  };

  const bron = (taak: Taak) => {
    if (taak.bron === "eigen") return null;
    const naam = BRON_LABELS[taak.bron];
    return (
      bronLink(
        taak,
        `${styles.chip} ${styles.slack} ${styles.chipLink}`,
        <>
          {naam}
          <ExternalIcon aria-hidden="true" />
        </>,
      ) ?? <span className={`${styles.chip} ${styles.slack}`}>{naam}</span>
    );
  };

  const context = (taak: Taak) => {
    const tekst = (
      taak.bron === "feed" ? [taak.plek] : [taak.auteur, taak.plek]
    )
      .filter(Boolean)
      .join(" · ");
    if (taak.bron === "eigen" || !tekst) return null;
    return <span className={styles.context}>{tekst}</span>;
  };

  const meer = (taak: Taak) => (
    <TodosMenu
      knopClass={styles.rondeKnop}
      ariaLabel={`Acties: ${taak.titel}`}
      items={actieItems(taak)}
    >
      <MoreIcon />
    </TodosMenu>
  );

  const kaartReactie = (taak: Taak) =>
    taak.reactie !== null &&
    taak.status !== "klaar" && (
      <div className={styles.reactieBlok}>
        <span className={styles.blokLabel}>
          Nieuwe reactie{taak.auteur && ` van ${taak.auteur}`}
        </span>
        {taak.bericht && (
          <span className={styles.blokTekst}>{taak.bericht}</span>
        )}
      </div>
    );

  function kaartActies(taak: Taak) {
    const gezien = taak.reactie !== null && taak.status !== "klaar";
    const link =
      taak.bron !== "eigen" &&
      bronLink(
        taak,
        styles.regel,
        <>
          <ExternalIcon aria-hidden="true" />
          {openTekst(taak)}
        </>,
      );
    const terug = parseInboxBron(taak.bron) !== null;
    if (!gezien && !link && !terug) return null;
    return (
      <div className={styles.acties}>
        {gezien && (
          <button
            type="button"
            className={`${styles.regel} ${styles.hoofd}`}
            onClick={() => zetGezien(taak)}
          >
            <CheckIcon aria-hidden="true" />
            Gezien<span className="visually-hidden">: {taak.titel}</span>
          </button>
        )}
        {link}
        {terug && (
          <button
            type="button"
            className={styles.regel}
            onClick={() =>
              wijzig({ id: taak.id, lijst: "inbox" }, () =>
                verplaatsTaakAction(taak.id, "inbox"),
              )
            }
          >
            <InboxIcon aria-hidden="true" />
            Terug naar de inbox
            <span className="visually-hidden">: {taak.titel}</span>
          </button>
        )}
      </div>
    );
  }

  function kaart(taak: Taak) {
    return (
      <li
        key={taak.id}
        className={`${styles.kaart} ${sleepId === taak.id ? styles.sleept : ""} ${taak.reactie !== null && taak.status !== "klaar" ? styles.heeftReactie : ""}`}
        data-kaart={taak.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(taak.id));
          setSleepId(taak.id);
        }}
        onDragEnd={() => {
          setSleepId(null);
          setOver(null);
          setLijn(undefined);
        }}
      >
        <div className={styles.kop}>
          <span className={styles.titel}>
            {taak.titel}
            <button
              type="button"
              className={styles.potlood}
              aria-label={`Titel bewerken: ${taak.titel}`}
              onClick={() => setBewerk(taak)}
            >
              <PencilIcon aria-hidden="true" />
            </button>
          </span>
          {prioKnop(taak)}
        </div>
        {context(taak)}
        {kaartReactie(taak)}
        {kaartActies(taak)}
      </li>
    );
  }

  function kolom(status: Status) {
    const klaar = status === "klaar";
    const rijen = zichtbaar
      .filter((taak) => taak.status === status)
      .sort(SORTEERDERS[sortering]);
    const eigenKolom =
      optimistisch.find((t) => t.id === sleepId)?.status === status;
    return (
      <section
        key={status}
        aria-label={STATUS_LABELS[status]}
        className={`${styles.kolom} ${klaar ? styles.klaarZone : ""} ${over === status ? styles.over : ""}`}
        onDragOver={(e) => {
          if (sleepId === null) return;
          e.preventDefault();
          if (klaar || sortering !== "eigen")
            return setOver(eigenKolom ? null : status);
          // Eigen volgorde: een lijn tussen de kaarten in plaats van een omlijnde kolom.
          const voor = [
            ...e.currentTarget.querySelectorAll<HTMLElement>("[data-kaart]"),
          ]
            .filter((el) => Number(el.dataset.kaart) !== sleepId)
            .find((el) => {
              const vak = el.getBoundingClientRect();
              return e.clientY < vak.top + vak.height / 2;
            });
          const voorId = voor ? Number(voor.dataset.kaart) : null;
          setLijn((huidig) =>
            huidig?.status === status && huidig.voor === voorId
              ? huidig
              : { status, voor: voorId },
          );
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOver(null);
          setLijn(undefined);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const taak = optimistisch.find((t) => t.id === sleepId);
          if (taak && klaar) zetStatus(taak, status);
          else if (taak && (!eigenKolom || sortering === "eigen"))
            zetInKolom(taak, status, lijn?.voor ?? null);
          setSleepId(null);
          setOver(null);
          setLijn(undefined);
        }}
      >
        <div className={`${styles.kolomKop} ${statusKlasse(status)}`}>
          <h2 className={styles.kolomNaam}>{STATUS_LABELS[status]}</h2>
          <span className={styles.aantal}>{rijen.length}</span>
          {!klaar && (
            <button
              type="button"
              className={styles.plus}
              aria-label={`Taak toevoegen in ${STATUS_LABELS[status]}`}
              onClick={() => setNieuw(status)}
            >
              <PlusIcon />
            </button>
          )}
        </div>
        {klaar ? (
          <p className={styles.leeg}>
            Sleep een kaart hierheen om af te ronden. Afgeronde taken staan in
            de lijstweergave.
          </p>
        ) : (
          <ul className={styles.kaarten}>
            {rijen.map((taak) => (
              <Fragment key={taak.id}>
                {lijn?.status === status && lijn.voor === taak.id && (
                  <li className={styles.lijn} aria-hidden="true" />
                )}
                {kaart(taak)}
              </Fragment>
            ))}
            {lijn?.status === status && lijn.voor === null && (
              <li className={styles.lijn} aria-hidden="true" />
            )}
            {rijen.length === 0 && (
              <li className={styles.leeg}>Niets in deze kolom.</li>
            )}
          </ul>
        )}
      </section>
    );
  }

  function rij(taak: Taak) {
    const klaar = taak.status === "klaar";
    return (
      <li
        key={taak.id}
        className={`${styles.rij} ${klaar ? styles.isKlaar : ""}`}
      >
        <button
          type="button"
          className={styles.vink}
          aria-pressed={klaar}
          aria-label={`${klaar ? "Weer openzetten" : "Afvinken"}: ${taak.titel}`}
          onClick={() => zetStatus(taak, klaar ? "niet-gestart" : "klaar")}
        >
          <CheckIcon />
        </button>
        <span className={styles.titelBlok}>
          <span className={styles.titel}>{taak.titel}</span>
          {context(taak)}
          {reactie(taak)}
        </span>
        <TodosMenu
          knopClass={`${styles.chip} ${styles.chipKnop} ${statusKlasse(taak.status)}`}
          ariaLabel={`${STATUS_LABELS[taak.status]}, status wijzigen: ${taak.titel}`}
          items={statusItems(taak)}
        >
          {STATUS_LABELS[taak.status]}
          <ChevronIcon className={styles.chipPijl} />
        </TodosMenu>
        <span>{prioKnop(taak)}</span>
        <span>{bron(taak) ?? <span className={styles.stil}>Eigen</span>}</span>
        {meer(taak)}
      </li>
    );
  }

  function lijst() {
    const open = zichtbaar
      .filter((taak) => taak.status !== "klaar")
      .sort((a, b) => a.prio - b.prio);
    const klaar = zichtbaar.filter((taak) => taak.status === "klaar");
    return (
      <>
        <div className={`${styles.rij} ${styles.rijKop}`} aria-hidden="true">
          <span />
          <span>Taak</span>
          <span>Status</span>
          <span>Prioriteit</span>
          <span>Bron</span>
          <span />
        </div>
        <ul className={styles.rijen}>
          {open.map(rij)}
          {open.length === 0 && <li className={styles.leeg}>Niets open.</li>}
        </ul>
        <details className={styles.klaarBlok}>
          <summary>
            <ChevronIcon className={styles.klaarPijl} />
            Klaar ({klaar.length})
          </summary>
          <ul className={styles.rijen}>
            {klaar.map(rij)}
            {klaar.length === 0 && (
              <li className={styles.leeg}>Nog niets afgerond.</li>
            )}
          </ul>
        </details>
      </>
    );
  }

  return (
    <>
      <div className={styles.balk}>
        <div className={styles.wissel} role="group" aria-label="Weergave">
          <button
            type="button"
            className={styles.tab}
            aria-pressed={weergave === "lijst"}
            onClick={() => kiesWeergave("lijst")}
          >
            <MenuIcon />
            Lijst
          </button>
          <button
            type="button"
            className={styles.tab}
            aria-pressed={weergave === "kanban"}
            onClick={() => kiesWeergave("kanban")}
          >
            <BoardIcon />
            Kanban
          </button>
        </div>
        {weergave === "kanban" && (
          <div className={styles.sorteer}>
            <span className={styles.sorteerLabel} id="todos-sorteren">
              Sorteren
            </span>
            <div
              className={styles.wissel}
              role="group"
              aria-labelledby="todos-sorteren"
            >
              {(Object.keys(SORTERING_LABELS) as Sortering[]).map((optie) => (
                <button
                  key={optie}
                  type="button"
                  className={styles.tab}
                  aria-pressed={sortering === optie}
                  onClick={() => kiesSortering(optie)}
                >
                  {SORTERING_LABELS[optie]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={styles.zoek}>
          <SearchIcon />
          <label className="visually-hidden" htmlFor="todos-zoek">
            Zoek in to-do&apos;s
          </label>
          <input
            id="todos-zoek"
            type="search"
            placeholder="Zoeken"
            autoComplete="off"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.knop}
          aria-expanded={nieuw !== null}
          onClick={() => setNieuw(nieuw ? null : "niet-gestart")}
        >
          <PlusIcon />
          Taak toevoegen
        </button>
      </div>

      {nieuw && (
        <form className={styles.nieuw} onSubmit={voegToe}>
          <label className="visually-hidden" htmlFor="todos-nieuw">
            Nieuwe taak
          </label>
          <input
            ref={nieuwVeld}
            id="todos-nieuw"
            required
            placeholder={
              nieuw === "niet-gestart"
                ? "Wat moet er gebeuren?"
                : `Nieuwe taak in ${STATUS_LABELS[nieuw]}`
            }
            autoComplete="off"
          />
          <button type="submit" className={styles.knop}>
            Toevoegen
          </button>
        </form>
      )}

      {zoek && zichtbaar.length === 0 ? (
        <p className={styles.leeg}>Niets gevonden.</p>
      ) : weergave === "kanban" ? (
        <div
          className={styles.kanban}
          onDragOver={(e) => {
            // Slepen scrolt het bord niet vanzelf; bij de rand schuiven we mee.
            const bord = e.currentTarget.getBoundingClientRect();
            if (e.clientX > bord.right - 80) e.currentTarget.scrollLeft += 24;
            if (e.clientX < bord.left + 80) e.currentTarget.scrollLeft -= 24;
          }}
        >
          {[...KOLOMMEN, "klaar" as const].map(kolom)}
        </div>
      ) : (
        lijst()
      )}

      {bewerk && (
        <TodoDialoog
          modus="bewerk"
          titel={bewerk.titel}
          bron={dialoogBron(bewerk)}
          onSluit={() => setBewerk(null)}
          onBevestig={(titel) => hernoem(bewerk, titel)}
        />
      )}
      {melding}
    </>
  );
}
