"use client";

import NextLink from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  actieNaarTodoAction,
  actieStatusAction,
  type DeelUitkomst,
  type HerinnerUitkomst,
  herinnerAction,
  herinnerVoorstelAction,
} from "@/app/actions";
import {
  ACTIE_STATUS_LABELS,
  type Actiepunt,
  type ActieStatus,
  delenVan,
  inFeed,
} from "@/lib/actiepunt";
import type { Prio } from "@/lib/taak";
import { ExternalLink } from "./ExternalLink";
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CloseIcon,
  PlusIcon,
  TodoIcon,
} from "./icons";
import { SlackVerbinden } from "./NotulenDelen";
import { TodoDialoog } from "./TodoDialoog";
import { TodosMenu } from "./TodosMenu";
import { useToast } from "./Toast";
import inbox from "./Inbox.module.css";
import styles from "./Actiepunten.module.css";

export type Wie = "mij" | "collega" | "extern" | "alles";

const WIE: [Wie, string][] = [
  ["mij", "Van mij"],
  ["collega", "Van collega's"],
  ["extern", "Van externen"],
  ["alles", "Alles"],
];

const datumFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

const herinnerdOp = (ms: number) => `herinnerd ${datumFormat.format(ms)}`;

const bronVan = (actie: Actiepunt) => ({
  label: "Notulen",
  wie: [actie.label, actie.meeting, actie.onderwerp]
    .filter(Boolean)
    .join(" · "),
  tekst: actie.wat,
  url: actie.paginaUrl,
});

/** Chip met "Van mij" of de naam van de collega. */
function Eigenaar({ actie }: { actie: Actiepunt }) {
  return (
    <span className="nd-chip" data-tint={actie.vanMij ? "yellow" : "lilac"}>
      {actie.vanMij ? "Van mij" : actie.eigenaar}
    </span>
  );
}

/**
 * Wat de feed en de overlay delen: lokaal bijgehouden status (zodat een rij
 * meteen verdwijnt), de to-do-popup en de toast met ongedaan maken.
 */
function useActies() {
  const [status, setStatus] = useState<ReadonlyMap<number, ActieStatus>>(
    new Map(),
  );
  const [kiezen, setKiezen] = useState<Actiepunt | null>(null);
  const { toon, element } = useToast();

  function zet(id: number, nieuw: ActieStatus | null) {
    setStatus((huidig) => {
      const kopie = new Map(huidig);
      if (nieuw) kopie.set(id, nieuw);
      else kopie.delete(id);
      return kopie;
    });
  }

  function terug(actie: Actiepunt) {
    zet(actie.id, null);
    void actieStatusAction(actie.id, "terug");
  }

  function afhandelen(actie: Actiepunt, nieuw: "gedaan" | "genegeerd") {
    zet(actie.id, nieuw);
    void actieStatusAction(actie.id, nieuw);
    toon(nieuw === "gedaan" ? "Gedaan" : "Genegeerd", {
      ongedaan: () => terug(actie),
    });
  }

  function bevestig(actie: Actiepunt, titel: string, prio: Prio) {
    setKiezen(null);
    zet(actie.id, "todo");
    void actieNaarTodoAction(actie.id, titel, prio);
    toon("Toegevoegd aan je to-do's", {
      link: { label: "Bekijken", href: "/todos" },
      ongedaan: () => terug(actie),
    });
  }

  const dialoog = kiezen && (
    <TodoDialoog
      modus="nieuw"
      titel={kiezen.wat}
      bron={bronVan(kiezen)}
      onSluit={() => setKiezen(null)}
      onBevestig={(titel, prio) => bevestig(kiezen, titel, prio)}
    />
  );
  const statusVan = (actie: Actiepunt) => status.get(actie.id) ?? actie.status;
  return { statusVan, zet, afhandelen, setKiezen, dialoog, toon, element };
}

export type Filters = {
  wie: Wie;
  /** De eigenaar of het platform (label); null is iedereen of alle platforms. */
  persoon: string | null;
  platform: string | null;
};

type Props = {
  acties: Actiepunt[];
  filters: Filters;
  herinner: number | null;
};

const uniek = (waarden: string[]) =>
  [...new Set(waarden)].sort((a, b) => a.localeCompare(b, "nl"));

/** De feed: open acties uit de notulen, zoals de inbox. */
export function Actiepunten({ acties, filters: begin, herinner }: Props) {
  const [filters, setFilters] = useState<Filters>(begin);
  const [open, setOpen] = useState<number | null>(herinner);
  const { statusVan, zet, afhandelen, setKiezen, dialoog, toon, element } =
    useActies();
  const { wie, persoon, platform } = filters;
  const personen = uniek(acties.map((actie) => actie.eigenaar));
  const platforms = uniek(acties.map((actie) => actie.label));

  // De keuze staat in de URL, zodat terugkomen of een link dezelfde lijst geeft.
  function filter(nieuw: Partial<Filters>) {
    const volgende = { ...filters, ...nieuw };
    setFilters(volgende);
    const url = new URL(window.location.href);
    for (const [sleutel, waarde] of Object.entries(volgende)) {
      if (waarde) url.searchParams.set(sleutel, waarde);
      else url.searchParams.delete(sleutel);
    }
    window.history.replaceState(null, "", url);
  }

  const getoond = acties.filter((actie) => {
    if (persoon && actie.eigenaar !== persoon) return false;
    if (platform && actie.label !== platform) return false;
    if (wie === "mij") return actie.vanMij;
    if (wie === "collega") return !actie.vanMij && !actie.extern;
    if (wie === "extern") return actie.extern;
    return true;
  });

  function herinnerd(actie: Actiepunt) {
    setOpen(null);
    zet(actie.id, "herinnerd");
    toon(`Slack-bericht aan ${actie.eigenaar} verstuurd`);
  }

  return (
    <>
      <div className={styles.balk}>
        <div className="nd-filters" role="group" aria-label="Van wie">
          {WIE.map(([waarde, label]) => (
            <button
              key={waarde}
              type="button"
              className="nd-filter"
              aria-pressed={wie === waarde}
              onClick={() => filter({ wie: waarde })}
            >
              {label}
            </button>
          ))}
        </div>
        <TodosMenu
          knopClass={`nd-button nd-button--small nd-button--quiet ${persoon ? styles.filterActief : ""}`}
          ariaLabel={`Persoon: ${persoon ?? "Iedereen"}`}
          items={[
            {
              label: "Iedereen",
              gekozen: persoon === null,
              kies: () => filter({ persoon: null }),
            },
            ...personen.map((naam) => ({
              label: naam,
              gekozen: persoon === naam,
              kies: () => filter({ persoon: naam }),
            })),
          ]}
        >
          {persoon ?? "Iedereen"}
          <ChevronIcon className={styles.filterPijl} />
        </TodosMenu>
        <TodosMenu
          knopClass={`nd-button nd-button--small nd-button--quiet ${platform ? styles.filterActief : ""}`}
          ariaLabel={`Platform: ${platform ?? "Alle platforms"}`}
          items={[
            {
              label: "Alle platforms",
              gekozen: platform === null,
              kies: () => filter({ platform: null }),
            },
            ...platforms.map((naam) => ({
              label: naam,
              gekozen: platform === naam,
              kies: () => filter({ platform: naam }),
            })),
          ]}
        >
          {platform ?? "Alle platforms"}
          <ChevronIcon className={styles.filterPijl} />
        </TodosMenu>
      </div>

      <section className={inbox.paneel} aria-label="Actiepunten">
        {getoond.every((actie) => !inFeed(statusVan(actie))) && (
          <p className="nd-empty">Geen open actiepunten.</p>
        )}
        <ul className={inbox.lijst}>
          {getoond.map((actie) => {
            const status = statusVan(actie);
            const weg = !inFeed(status);
            return (
              <li
                key={actie.id}
                className={inbox.rij}
                data-weg={weg || undefined}
                inert={weg}
              >
                <div className={inbox.klap}>
                  <div className={`nd-row ${inbox.item}`}>
                    <div className={inbox.body}>
                      <p className={`nd-meta ${inbox.meta}`}>
                        <Eigenaar actie={actie} />
                        <span>{actie.label}</span>
                        <span>{actie.meeting}</span>
                        {actie.onderwerp && <span>{actie.onderwerp}</span>}
                        {status === "herinnerd" && (
                          <span>
                            {actie.herinnerd
                              ? herinnerdOp(actie.herinnerd)
                              : "zojuist herinnerd"}
                          </span>
                        )}
                      </p>
                      <p className={inbox.titel}>{actie.wat}</p>
                    </div>
                    <div className={`nd-actions ${inbox.acties}`}>
                      <div className={inbox.kolom}>
                        {actie.paginaUrl && (
                          <ExternalLink
                            href={actie.paginaUrl}
                            className="nd-action"
                          >
                            Open notulen
                          </ExternalLink>
                        )}
                        {actie.vanMij ? (
                          <button
                            type="button"
                            className="nd-action nd-action--main"
                            onClick={() => setKiezen(actie)}
                          >
                            <PlusIcon className={inbox.icoon} />
                            Maak to-do aan
                            <span className="nd-visually-hidden">
                              : {actie.wat}
                            </span>
                          </button>
                        ) : (
                          actie.teHerinneren && (
                            <button
                              type="button"
                              className="nd-action nd-action--main"
                              aria-expanded={open === actie.id}
                              aria-controls={`herinner-${actie.id}`}
                              onClick={() =>
                                setOpen(open === actie.id ? null : actie.id)
                              }
                            >
                              <BellIcon className={inbox.icoon} />
                              Herinner {actie.eigenaar}
                              <span className="nd-visually-hidden">
                                : {actie.wat}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                      <div className={inbox.kolom}>
                        <button
                          type="button"
                          className={`nd-action ${inbox.gedaan}`}
                          onClick={() => afhandelen(actie, "gedaan")}
                        >
                          <CheckIcon className={inbox.icoon} />
                          Gedaan
                          <span className="nd-visually-hidden">
                            : {actie.wat}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="nd-action"
                          onClick={() => afhandelen(actie, "genegeerd")}
                        >
                          <CloseIcon className={inbox.icoon} />
                          Negeer
                          <span className="nd-visually-hidden">
                            : {actie.wat}
                          </span>
                        </button>
                      </div>
                    </div>
                    {open === actie.id && (
                      <Herinner
                        actie={actie}
                        onVerstuurd={() => herinnerd(actie)}
                        onSluit={() => setOpen(null)}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {dialoog}
      {element}
    </>
  );
}

type HerinnerProps = {
  actie: Actiepunt;
  onVerstuurd: () => void;
  onSluit: () => void;
};

/** Onder de rij: eerst de persoon kiezen als dat nodig is, dan het bericht van Claude aanpassen en versturen. */
function Herinner({ actie, onVerstuurd, onSluit }: HerinnerProps) {
  const id = useId();
  const [voorstel, setVoorstel] = useState<HerinnerUitkomst | null>(null);
  const [gekozen, setGekozen] = useState("");
  const [anders, setAnders] = useState(false);
  const [bericht, setBericht] = useState("");
  const [uitkomst, setUitkomst] = useState<DeelUitkomst | null>(null);
  const [bezig, startTransition] = useTransition();
  const gestart = useRef(false);

  function vraag(persoon: string | null) {
    startTransition(async () => {
      const nieuw = await herinnerVoorstelAction(actie.id, persoon);
      setVoorstel(nieuw);
      setAnders(false);
      if (nieuw.soort === "bericht") setBericht(nieuw.tekst);
    });
  }

  useEffect(() => {
    // Eén keer bij het openklappen; Strict Mode draait effecten dubbel en Claude is traag.
    if (gestart.current) return;
    gestart.current = true;
    startTransition(async () => {
      const nieuw = await herinnerVoorstelAction(actie.id, null);
      setVoorstel(nieuw);
      if (nieuw.soort === "bericht") setBericht(nieuw.tekst);
    });
  }, [actie.id]);

  function verstuur() {
    startTransition(async () => {
      const nieuw = await herinnerAction(actie.id, bericht);
      setUitkomst(nieuw);
      if (nieuw.uitkomst === "gelukt") onVerstuurd();
    });
  }

  if (voorstel?.soort === "verbinden" || uitkomst?.uitkomst === "verbinden") {
    return (
      <div id={`herinner-${actie.id}`} className={styles.herinner}>
        <SlackVerbinden />
      </div>
    );
  }

  return (
    <div
      id={`herinner-${actie.id}`}
      className={styles.herinner}
      aria-busy={bezig}
    >
      {!voorstel && (
        <p className={`nd-meta ${styles.regel}`} role="status">
          Claude schrijft het bericht aan {actie.eigenaar}, even geduld.
        </p>
      )}
      {voorstel?.soort === "fout" && (
        <p className="nd-error" role="alert">
          {voorstel.fout}
        </p>
      )}
      {(voorstel?.soort === "kiezen" ||
        (voorstel?.soort === "bericht" && anders)) && (
        <>
          <label className="nd-label" htmlFor={`${id}-wie`}>
            {delenVan(actie.eigenaar).length > 1
              ? `Wie van ${actie.eigenaar} wil je herinneren?`
              : `Wie is ${actie.eigenaar} in Slack?`}{" "}
            Het dashboard onthoudt je keuze.
          </label>
          <select
            id={`${id}-wie`}
            className="nd-field"
            value={gekozen}
            onChange={(event) => setGekozen(event.target.value)}
          >
            <option value="">Kies een persoon</option>
            {voorstel.personen.map((persoon) => (
              <option key={persoon.id} value={persoon.id}>
                {persoon.naam}
              </option>
            ))}
          </select>
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              aria-busy={bezig}
              disabled={bezig || !gekozen}
              onClick={() => vraag(gekozen)}
            >
              Kies en schrijf het bericht
            </button>
            <button
              type="button"
              className="nd-button nd-button--small nd-button--quiet"
              onClick={anders ? () => setAnders(false) : onSluit}
            >
              Annuleren
            </button>
          </div>
        </>
      )}
      {voorstel?.soort === "bericht" && !anders && (
        <>
          <label className="nd-label" htmlFor={`${id}-bericht`}>
            Slack-bericht aan {voorstel.persoon.naam} (geschreven door Claude,
            pas aan wat je wilt)
          </label>
          <textarea
            id={`${id}-bericht`}
            className={`nd-field ${styles.bericht}`}
            value={bericht}
            onChange={(event) => setBericht(event.target.value)}
          />
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              aria-busy={bezig}
              disabled={bezig || !bericht.trim()}
              onClick={verstuur}
            >
              Verstuur aan {actie.eigenaar}
            </button>
            <button
              type="button"
              className="nd-button nd-button--small nd-button--quiet"
              onClick={() => setAnders(true)}
            >
              Andere persoon
            </button>
            <button
              type="button"
              className="nd-button nd-button--small nd-button--quiet"
              onClick={onSluit}
            >
              Annuleren
            </button>
          </div>
          {uitkomst?.uitkomst === "fout" && (
            <p className="nd-error" role="alert">
              {uitkomst.fout}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_WEERGAVE: Record<
  ActieStatus,
  { kleur: "open" | "ok" | "muted"; Icoon: typeof CheckIcon }
> = {
  open: { kleur: "open", Icoon: ClockIcon },
  herinnerd: { kleur: "open", Icoon: BellIcon },
  todo: { kleur: "ok", Icoon: TodoIcon },
  gedaan: { kleur: "ok", Icoon: CheckIcon },
  genegeerd: { kleur: "muted", Icoon: CloseIcon },
};

type DialoogProps = {
  /** Bijvoorbeeld "WO2 | Theo x Lenny · di 3 nov · 10:00–11:00". */
  meta: string;
  acties: Actiepunt[];
  onSluit: () => void;
};

/** De overlay vanuit het paneel: alleen de acties van deze meeting, met hun status. */
export function ActiepuntenDialoog({ meta, acties, onSluit }: DialoogProps) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const {
    statusVan,
    afhandelen,
    setKiezen,
    dialoog: todo,
    element,
  } = useActies();
  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  // De to-do-popup staat naast de overlay: een close-event erin zou anders ook de overlay sluiten.
  return (
    <>
      <dialog
        ref={dialoog}
        className={`nd-dialog ${styles.dialoog}`}
        aria-labelledby="actiepunten-kop"
        onClose={onSluit}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialoog.current?.close();
        }}
      >
        <div className="nd-dialog__body">
          <p className={`nd-meta ${styles.regel}`}>{meta}</p>
          <h2 className="nd-title" id="actiepunten-kop">
            Actiepunten
          </h2>
          <ul className={styles.overlayLijst}>
            {acties.map((actie) => {
              const status = statusVan(actie);
              const { kleur, Icoon } = STATUS_WEERGAVE[status];
              const label =
                status === "herinnerd" && actie.herinnerd
                  ? `Herinnerd ${datumFormat.format(actie.herinnerd)}`
                  : ACTIE_STATUS_LABELS[status];
              return (
                <li key={actie.id} className={`nd-row ${styles.overlayRij}`}>
                  <div>
                    <p className={`nd-meta ${inbox.meta}`}>
                      <Eigenaar actie={actie} />
                      <span className="nd-status" data-status={kleur}>
                        <Icoon />
                        {label}
                      </span>
                    </p>
                    <p
                      className="nd-row__title"
                      data-afgehandeld={!inFeed(status) || undefined}
                    >
                      {actie.wat}
                    </p>
                  </div>
                  {inFeed(status) && (
                    <div className={styles.knoppen}>
                      {actie.vanMij ? (
                        <button
                          type="button"
                          className="nd-button nd-button--small nd-button--quiet"
                          onClick={() => setKiezen(actie)}
                        >
                          <PlusIcon className={inbox.icoon} />
                          To-do
                          <span className="nd-visually-hidden">
                            : {actie.wat}
                          </span>
                        </button>
                      ) : (
                        actie.teHerinneren && (
                          <NextLink
                            href={`/actiepunten?wie=collega&herinner=${actie.id}`}
                            className="nd-button nd-button--small nd-button--quiet"
                          >
                            <BellIcon className={inbox.icoon} />
                            Herinner
                            <span className="nd-visually-hidden">
                              {" "}
                              {actie.eigenaar}: {actie.wat}
                            </span>
                          </NextLink>
                        )
                      )}
                      <button
                        type="button"
                        className="nd-button nd-button--small nd-button--quiet"
                        onClick={() => afhandelen(actie, "gedaan")}
                      >
                        <CheckIcon className={inbox.icoon} />
                        Gedaan
                        <span className="nd-visually-hidden">
                          : {actie.wat}
                        </span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="nd-dialog__foot">
            <NextLink
              href="/actiepunten"
              className="nd-button nd-button--quiet"
            >
              Alle actiepunten
            </NextLink>
            <button
              type="button"
              className="nd-button"
              onClick={() => dialoog.current?.close()}
            >
              Sluiten
            </button>
          </div>
        </div>
        {element}
      </dialog>
      {todo}
    </>
  );
}
