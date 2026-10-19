"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  akkoordAction,
  hernoemTaakAction,
  nieuweTaakAction,
  opnieuwUitzettenAction,
  verplaatsTaakAction,
  wijsAfAction,
  zetGezienAction,
  zetPrioAction,
  zetStatusAction,
  zetUitAction,
  zetVolgordeAction,
} from "@/app/actions";
import { type Opdracht, type OpdrachtStatus } from "@/lib/claude/voorstel";
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
  AlertIcon,
  CheckIcon,
  ChevronIcon,
  ExternalIcon,
  InboxIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  SparkleIcon,
} from "./icons";
import styles from "./Todos.module.css";
import { TodoDialoog, type DialoogBron } from "./TodoDialoog";
import { UitzetDialoog } from "./UitzetDialoog";
import { VoorstelDialoog } from "./VoorstelDialoog";
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

/** Kleur van de chip (data-tint van de toolkit); zonder tint is de chip neutraal. */
const STATUS_TINT: Record<Status, string | undefined> = {
  "niet-gestart": undefined,
  bezig: "lilac",
  wacht: "yellow",
  klaar: "dark",
  geblokkeerd: "pink",
};
const PRIO_TINT: Record<Prio, string | undefined> = {
  1: "pink-strong",
  2: "pink",
  3: "yellow-soft",
  4: undefined,
};
/** Dezelfde keuzes als stip in het menu. */
const STATUS_STIP: Record<Status, string | null> = {
  "niet-gestart": null,
  bezig: "lilac",
  wacht: "yellow",
  klaar: null,
  geblokkeerd: "pink-soft",
};
const PRIO_STIP: Record<Prio, string | null> = {
  1: "pink",
  2: "pink-soft",
  3: "yellow",
  4: null,
};
const prioLabel = (prio: Prio) => `${prio} | ${PRIO_LABELS[prio]}`;

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

/** Hoe vaak de pagina ververst zolang Claude bezig is. */
const POLL_MS = 3000;

type Props = {
  taken: Taak[];
  opdrachten: Opdracht[];
  weergave: Weergave;
  sortering: Sortering;
};

export function Todos({
  taken,
  opdrachten,
  weergave: start,
  sortering: kiesStart,
}: Props) {
  const router = useRouter();
  const [weergave, setWeergave] = useState(start);
  const [sortering, setSortering] = useState(kiesStart);
  const [zoek, setZoek] = useState("");
  const [nieuw, setNieuw] = useState<Status | null>(null);
  const [bewerk, setBewerk] = useState<Taak | null>(null);
  const [uitzet, setUitzet] = useState<Taak | null>(null);
  const [bekijk, setBekijk] = useState<number | null>(null);
  const vorigeStand = useRef(new Map<number, OpdrachtStatus>());
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

  // Zolang Claude bezig is, verversen we de pagina; de run zelf draait op de server.
  const claudeBezig = opdrachten.some((o) => o.status === "bezig");
  useEffect(() => {
    if (!claudeBezig) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [claudeBezig, router]);

  // Een melding zodra een voorstel van bezig naar klaar gaat.
  useEffect(() => {
    for (const opdracht of opdrachten) {
      const vorige = vorigeStand.current.get(opdracht.id);
      vorigeStand.current.set(opdracht.id, opdracht.status);
      if (vorige !== "bezig") continue;
      const titel = taken.find((t) => t.id === opdracht.taakId)?.titel ?? "";
      if (opdracht.status === "voorstel") {
        toon(`Voorstel klaar: ${titel}`, {
          knop: { label: "Bekijken", kies: () => setBekijk(opdracht.id) },
        });
      } else if (opdracht.status === "mislukt") {
        toon(`Claude kon geen voorstel maken: ${titel}`);
      }
    }
  }, [opdrachten, taken, toon]);

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
          <span className="nd-dot" data-tint="pink" aria-hidden="true" />
          Nieuwe reactie{taak.auteur && ` van ${taak.auteur}`}
        </span>
        {taak.bericht && (
          <span className={`nd-meta ${styles.reactieTekst}`}>
            {taak.bericht}
          </span>
        )}
        <button
          type="button"
          className="nd-button nd-button--small"
          onClick={() => zetGezien(taak)}
        >
          Gezien<span className="visually-hidden">: {taak.titel}</span>
        </button>
      </div>
    );

  const opdrachtVan = (taak: Taak) =>
    opdrachten.find((o) => o.taakId === taak.id);

  /** Op Klaar en met een open opdracht (bezig, voorstel, mislukt) staat geen knop. */
  const kanUitzetten = (taak: Taak) =>
    taak.status !== "klaar" &&
    (opdrachtVan(taak)?.status ?? "akkoord") === "akkoord";

  /** Na een dialoog staat de focus op de kaart, want de knop waar hij vandaan kwam kan weg zijn. */
  function focusKaart(taakId: number) {
    setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(`[data-kaart="${taakId}"]`)
          ?.focus(),
      0,
    );
  }

  function zetUit(taak: Taak, instructie: string) {
    setUitzet(null);
    startTransition(() => zetUitAction(taak.id, instructie));
    toon("Uitgezet bij Claude");
    focusKaart(taak.id);
  }

  /** Een voorstel kun je terughalen; een mislukte opdracht gewoon weghalen. */
  function wijsAf(opdracht: Opdracht) {
    const voorstel = opdracht.status === "voorstel";
    startTransition(() => wijsAfAction(opdracht.id, true));
    focusKaart(opdracht.taakId);
    toon(
      voorstel ? "Voorstel afgewezen" : "Opdracht weggehaald",
      voorstel
        ? {
            ongedaan: () =>
              startTransition(() => wijsAfAction(opdracht.id, false)),
          }
        : {},
    );
  }

  function akkoord(opdracht: Opdracht) {
    startTransition(() => akkoordAction(opdracht.id));
    focusKaart(opdracht.taakId);
    toon("Akkoord gegeven");
  }

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
      stip: STATUS_STIP[status],
      gekozen: status === taak.status,
      kies: () => zetStatus(taak, status),
    }));
  }

  function prioItems(taak: Taak): MenuItem[] {
    return PRIOS.map((prio) => ({
      label: prioLabel(prio),
      stip: PRIO_STIP[prio],
      gekozen: prio === taak.prio,
      kies: () => zetPrio(taak, prio),
    }));
  }

  function actieItems(taak: Taak): MenuItem[] {
    const items = [
      ...(kanUitzetten(taak)
        ? [{ label: "Uitzetten bij Claude", kies: () => setUitzet(taak) }]
        : []),
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
      knopClass={`nd-chip ${styles.chipKnop}`}
      tint={PRIO_TINT[taak.prio]}
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

  const bronLink = (
    taak: Taak,
    klasse: string,
    inhoud: React.ReactNode,
    tint?: string,
  ) => {
    if (!taak.url) return null;
    const extern = /^https?:/.test(taak.url);
    const label = `${openTekst(taak)}: ${berichtTekst(taak)}${extern ? " (opent in nieuw tabblad)" : ""}`;
    return extern ? (
      <a
        href={taak.url}
        className={klasse}
        data-tint={tint}
        aria-label={label}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inhoud}
      </a>
    ) : (
      <NextLink
        href={taak.url}
        className={klasse}
        data-tint={tint}
        aria-label={label}
      >
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
        `nd-chip ${styles.chipLink}`,
        <>
          {naam}
          <ExternalIcon aria-hidden="true" />
        </>,
        "lilac-soft",
      ) ?? (
        <span className="nd-chip" data-tint="lilac-soft">
          {naam}
        </span>
      )
    );
  };

  const context = (taak: Taak) => {
    const tekst = (
      taak.bron === "feed" ? [taak.plek] : [taak.auteur, taak.plek]
    )
      .filter(Boolean)
      .join(" · ");
    if (taak.bron === "eigen" || !tekst) return null;
    return <span className={`nd-meta ${styles.context}`}>{tekst}</span>;
  };

  const meer = (taak: Taak) => (
    <TodosMenu
      knopClass="nd-icon-button nd-icon-button--small"
      ariaLabel={`Acties: ${taak.titel}`}
      items={actieItems(taak)}
    >
      <MoreIcon />
    </TodosMenu>
  );

  /** Rond knopje met de ster; alleen op een open to-do zonder opdracht. */
  const claudeKnop = (taak: Taak) =>
    kanUitzetten(taak) && (
      <button
        type="button"
        className={`nd-icon-button nd-icon-button--small ${styles.claudeKnop}`}
        aria-label={`Uitzetten bij Claude: ${taak.titel}`}
        title="Uitzetten bij Claude"
        onClick={() => setUitzet(taak)}
      >
        <SparkleIcon />
      </button>
    );

  /** Op de kaart en in de lijst alleen de stand; het voorstel zelf staat in de dialoog. */
  const claudeStand = (taak: Taak) => {
    const opdracht = opdrachtVan(taak);
    if (!opdracht) return null;
    if (opdracht.status === "bezig") {
      return (
        <p
          className={`nd-status ${styles.stand} ${styles.bezig}`}
          data-status="open"
        >
          <SparkleIcon />
          Claude is bezig…
        </p>
      );
    }
    if (opdracht.status === "voorstel") {
      return (
        <div className={styles.stand}>
          <span className="nd-status" data-status="open">
            <SparkleIcon />
            Voorstel klaar
          </span>
          <button
            type="button"
            className="nd-button nd-button--small"
            onClick={() => setBekijk(opdracht.id)}
          >
            Bekijken<span className="visually-hidden">: {taak.titel}</span>
          </button>
        </div>
      );
    }
    if (opdracht.status === "mislukt") {
      return (
        <div className={styles.stand}>
          <span className="nd-status" data-status="warn">
            <AlertIcon />
            Mislukt: {opdracht.fout ?? "onbekende fout"}
          </span>
          <button
            type="button"
            className="nd-button nd-button--small nd-button--quiet"
            onClick={() =>
              startTransition(() => opnieuwUitzettenAction(opdracht.id))
            }
          >
            Opnieuw proberen
            <span className="visually-hidden">: {taak.titel}</span>
          </button>
          <button
            type="button"
            className="nd-button nd-button--small nd-button--quiet"
            onClick={() => wijsAf(opdracht)}
          >
            Weghalen<span className="visually-hidden">: {taak.titel}</span>
          </button>
        </div>
      );
    }
    return (
      <span className={`nd-status ${styles.stand}`} data-status="ok">
        <CheckIcon />
        Akkoord gegeven
      </span>
    );
  };

  const kaartReactie = (taak: Taak) =>
    taak.reactie !== null &&
    taak.status !== "klaar" && (
      <div className={styles.reactieBlok}>
        <span className={styles.reactieLabel}>
          <span className="nd-dot" data-tint="pink" aria-hidden="true" />
          Nieuwe reactie{taak.auteur && ` van ${taak.auteur}`}
        </span>
        {taak.bericht && (
          <span className={`nd-meta ${styles.reactieTekst}`}>
            {taak.bericht}
          </span>
        )}
      </div>
    );

  function kaartActies(taak: Taak) {
    const gezien = taak.reactie !== null && taak.status !== "klaar";
    const link =
      taak.bron !== "eigen" &&
      bronLink(
        taak,
        "nd-action",
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
            className="nd-action nd-action--main"
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
            className="nd-action"
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
        className={`nd-row ${styles.kaart} ${sleepId === taak.id ? styles.sleept : ""} ${taak.reactie !== null && taak.status !== "klaar" ? "nd-row--accent" : ""}`}
        data-kaart={taak.id}
        tabIndex={-1}
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
          <div className={styles.kopRij}>
            {prioKnop(taak)}
            <span className={styles.knoppen}>{claudeKnop(taak)}</span>
          </div>
          <span className="nd-row__title">
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
        </div>
        {context(taak)}
        {claudeStand(taak)}
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
        className={`nd-column ${styles.kolom} ${klaar ? styles.klaarZone : ""} ${over === status ? styles.over : ""}`}
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
        <div className={styles.kolomKop}>
          <h2 className={styles.kolomNaam}>{STATUS_LABELS[status]}</h2>
          <span className="nd-badge">{rijen.length}</span>
          {!klaar && (
            <button
              type="button"
              className="nd-icon-button nd-icon-button--small"
              aria-label={`Taak toevoegen in ${STATUS_LABELS[status]}`}
              onClick={() => setNieuw(status)}
            >
              <PlusIcon />
            </button>
          )}
        </div>
        {klaar ? (
          <p className="nd-empty">
            Sleep een kaart hierheen om af te ronden. Afgeronde taken staan in
            de lijstweergave.
          </p>
        ) : (
          <ul className={`nd-rows ${styles.kaarten}`}>
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
              <li className="nd-empty">Niets in deze kolom.</li>
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
        className={`nd-row ${styles.rij} ${klaar ? styles.isKlaar : ""}`}
        data-kaart={taak.id}
        tabIndex={-1}
      >
        <button
          type="button"
          className={`nd-icon-button nd-icon-button--small ${styles.vink}`}
          aria-pressed={klaar}
          aria-label={`${klaar ? "Weer openzetten" : "Afvinken"}: ${taak.titel}`}
          onClick={() => zetStatus(taak, klaar ? "niet-gestart" : "klaar")}
        >
          <CheckIcon />
        </button>
        <span className={styles.titelBlok}>
          <span className={`nd-row__title ${styles.titel}`}>{taak.titel}</span>
          {context(taak)}
          {reactie(taak)}
          {claudeStand(taak)}
        </span>
        <TodosMenu
          knopClass={`nd-chip ${styles.chipKnop}`}
          tint={STATUS_TINT[taak.status]}
          ariaLabel={`${STATUS_LABELS[taak.status]}, status wijzigen: ${taak.titel}`}
          items={statusItems(taak)}
        >
          {STATUS_LABELS[taak.status]}
          <ChevronIcon aria-hidden="true" />
        </TodosMenu>
        <span>{prioKnop(taak)}</span>
        <span>{bron(taak) ?? <span className="nd-meta">Eigen</span>}</span>
        <span className={styles.knoppen}>
          {claudeKnop(taak)}
          {meer(taak)}
        </span>
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
        <div
          className={`nd-eyebrow ${styles.rij} ${styles.rijKop}`}
          aria-hidden="true"
        >
          <span />
          <span>Taak</span>
          <span>Status</span>
          <span>Prioriteit</span>
          <span>Bron</span>
          <span />
        </div>
        <ul className="nd-rows">
          {open.map(rij)}
          {open.length === 0 && <li className="nd-empty">Niets open.</li>}
        </ul>
        <details className={`nd-disclosure ${styles.klaarBlok}`}>
          <summary>
            <ChevronIcon aria-hidden="true" />
            Klaar ({klaar.length})
          </summary>
          <ul className={`nd-rows ${styles.rijen}`}>
            {klaar.map(rij)}
            {klaar.length === 0 && (
              <li className="nd-empty">Nog niets afgerond.</li>
            )}
          </ul>
        </details>
      </>
    );
  }

  const bekijkOpdracht = opdrachten.find((o) => o.id === bekijk);
  const bekijkTaak = taken.find((t) => t.id === bekijkOpdracht?.taakId);

  return (
    <>
      <div className={styles.balk}>
        <div className="nd-filters" role="group" aria-label="Weergave">
          <button
            type="button"
            className="nd-filter"
            aria-pressed={weergave === "lijst"}
            onClick={() => kiesWeergave("lijst")}
          >
            Lijst
          </button>
          <button
            type="button"
            className="nd-filter"
            aria-pressed={weergave === "kanban"}
            onClick={() => kiesWeergave("kanban")}
          >
            Kanban
          </button>
        </div>
        {weergave === "kanban" && (
          <div className={styles.sorteer}>
            <span className="nd-meta" id="todos-sorteren">
              Sorteren
            </span>
            <div
              className="nd-filters"
              role="group"
              aria-labelledby="todos-sorteren"
            >
              {(Object.keys(SORTERING_LABELS) as Sortering[]).map((optie) => (
                <button
                  key={optie}
                  type="button"
                  className="nd-filter"
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
          <label className="visually-hidden" htmlFor="todos-zoek">
            Zoek in to-do&apos;s
          </label>
          <input
            id="todos-zoek"
            type="search"
            className="nd-field nd-field--search"
            placeholder="Zoeken"
            autoComplete="off"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="nd-button"
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
            className="nd-field"
            required
            placeholder={
              nieuw === "niet-gestart"
                ? "Wat moet er gebeuren?"
                : `Nieuwe taak in ${STATUS_LABELS[nieuw]}`
            }
            autoComplete="off"
          />
          <button type="submit" className="nd-button">
            Toevoegen
          </button>
        </form>
      )}

      {zoek && zichtbaar.length === 0 ? (
        <p className="nd-empty">Niets gevonden.</p>
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
      {uitzet && (
        <UitzetDialoog
          titel={uitzet.titel}
          wie={dialoogBron(uitzet)?.wie ?? ""}
          onSluit={() => setUitzet(null)}
          onBevestig={(instructie) => zetUit(uitzet, instructie)}
        />
      )}
      {bekijkOpdracht?.status === "voorstel" && bekijkTaak && (
        <VoorstelDialoog
          titel={bekijkTaak.titel}
          opdracht={bekijkOpdracht}
          bron={dialoogBron(bekijkTaak)}
          onSluit={() => setBekijk(null)}
          onAkkoord={() => akkoord(bekijkOpdracht)}
          onWijsAf={() => wijsAf(bekijkOpdracht)}
        />
      )}
      {melding}
    </>
  );
}
