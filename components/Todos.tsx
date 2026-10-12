"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  nieuweTaakAction,
  verplaatsTaakAction,
  zetPrioAction,
  zetStatusAction,
} from "@/app/actions";
import {
  PRIO_LABELS,
  PRIOS,
  STATUS_LABELS,
  STATUSSEN,
  type Prio,
  type Status,
  type Taak,
} from "@/lib/taak";
import { setPreferenceCookie } from "./Sidebar/cookies";
import { BoardIcon, CheckIcon, ChevronIcon, MenuIcon, PlusIcon } from "./icons";
import styles from "./Todos.module.css";
import { TodosMenu, type MenuItem } from "./TodosMenu";
import { TODOS_COOKIE, type Weergave } from "./TodosWeergave";

type Patch = Pick<Taak, "id"> &
  Partial<Pick<Taak, "status" | "prio" | "lijst">>;

/** Klaar is geen kolom maar een afrondzone. */
const KOLOMMEN = STATUSSEN.filter((status) => status !== "klaar");
const MELDING_DUUR = 6000;

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

function MoreIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </svg>
  );
}

type Props = { taken: Taak[]; weergave: Weergave };

export function Todos({ taken, weergave: start }: Props) {
  const [weergave, setWeergave] = useState(start);
  const [zoek, setZoek] = useState("");
  const [nieuw, setNieuw] = useState<Status | null>(null);
  const [afgerond, setAfgerond] = useState<{
    id: number;
    vorige: Status;
  } | null>(null);
  const [sleepId, setSleepId] = useState<number | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [, startTransition] = useTransition();
  const [optimistisch, pasToe] = useOptimistic(
    taken,
    (huidig: Taak[], patch: Patch) =>
      huidig
        .map((taak) => (taak.id === patch.id ? { ...taak, ...patch } : taak))
        .filter((taak) => taak.lijst === "todo"),
  );
  const nieuwVeld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!afgerond) return;
    const timer = setTimeout(() => setAfgerond(null), MELDING_DUUR);
    return () => clearTimeout(timer);
  }, [afgerond]);

  useEffect(() => {
    if (nieuw) nieuwVeld.current?.focus();
  }, [nieuw]);

  const zichtbaar = optimistisch.filter((taak) =>
    taak.titel.toLowerCase().includes(zoek.trim().toLowerCase()),
  );

  function wijzig(patch: Patch, actie: () => Promise<void>) {
    startTransition(async () => {
      pasToe(patch);
      await actie();
    });
  }

  function zetStatus(taak: Taak, status: Status) {
    if (status === taak.status) return;
    if (status === "klaar") setAfgerond({ id: taak.id, vorige: taak.status });
    wijzig({ id: taak.id, status }, () => zetStatusAction(taak.id, status));
  }

  function zetPrio(taak: Taak, prio: Prio) {
    wijzig({ id: taak.id, prio }, () => zetPrioAction(taak.id, prio));
  }

  function ongedaan() {
    if (!afgerond) return;
    wijzig({ id: afgerond.id, status: afgerond.vorige }, () =>
      zetStatusAction(afgerond.id, afgerond.vorige),
    );
    setAfgerond(null);
  }

  function kiesWeergave(nieuweWeergave: Weergave) {
    setWeergave(nieuweWeergave);
    setPreferenceCookie(TODOS_COOKIE, nieuweWeergave);
  }

  function voegToe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const titel = nieuwVeld.current?.value.trim();
    if (!titel || !nieuw) return;
    const status = nieuw;
    startTransition(() => nieuweTaakAction(titel, status));
    e.currentTarget.reset();
  }

  function statusItems(taak: Taak): MenuItem[] {
    return STATUSSEN.map((status) => ({
      label: STATUS_LABELS[status],
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
    const items = statusItems(taak);
    if (taak.bron !== "slack") return items;
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

  const bron = (taak: Taak) =>
    taak.bron === "slack" ? (
      <span className={`${styles.chip} ${styles.slack}`}>Slack</span>
    ) : null;

  const meer = (taak: Taak) => (
    <TodosMenu
      knopClass={styles.rondeKnop}
      ariaLabel={`Acties: ${taak.titel}`}
      items={actieItems(taak)}
    >
      <MoreIcon />
    </TodosMenu>
  );

  function kaart(taak: Taak) {
    return (
      <li
        key={taak.id}
        className={`${styles.kaart} ${sleepId === taak.id ? styles.sleept : ""}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(taak.id));
          setSleepId(taak.id);
        }}
        onDragEnd={() => {
          setSleepId(null);
          setOver(null);
        }}
      >
        <span className={styles.titel}>{taak.titel}</span>
        <div className={styles.voet}>
          {prioKnop(taak)}
          {bron(taak)}
          <span className={styles.rechts}>{meer(taak)}</span>
        </div>
      </li>
    );
  }

  function kolom(status: Status) {
    const klaar = status === "klaar";
    const rijen = zichtbaar.filter((taak) => taak.status === status);
    return (
      <section
        key={status}
        aria-label={STATUS_LABELS[status]}
        className={`${styles.kolom} ${klaar ? styles.klaarZone : ""} ${over === status ? styles.over : ""}`}
        onDragOver={(e) => {
          if (sleepId === null) return;
          e.preventDefault();
          setOver(status);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const taak = optimistisch.find((t) => t.id === sleepId);
          if (taak) zetStatus(taak, status);
          setSleepId(null);
          setOver(null);
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
            {rijen.map(kaart)}
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
        <span className={styles.titel}>{taak.titel}</span>
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
        <div className={styles.kanban}>
          {[...KOLOMMEN, "klaar" as const].map(kolom)}
        </div>
      ) : (
        lijst()
      )}

      <div role="status" className={styles.meldingRuimte}>
        {afgerond && (
          <p className={styles.melding}>
            Afgerond, te vinden onder Klaar in de lijst
            <button
              type="button"
              className={styles.ongedaan}
              onClick={ongedaan}
            >
              Ongedaan maken
            </button>
          </p>
        )}
      </div>
    </>
  );
}
