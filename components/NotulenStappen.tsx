"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import {
  kiesOpnameAction,
  nietDelenAction,
  opnameKeuzesAction,
  opnieuwNotulenAction,
  verversMeetingAction,
} from "@/app/actions";
import type { Meeting } from "@/lib/meetings";
import { PRIVE } from "@/lib/meetings";
import {
  type NotulenStatus,
  type OpnameInfo,
  type OpnameKeuzes,
  plaudWebUrl,
  type Stand,
  STAPPEN,
} from "@/lib/notulen-stand";
import { ActiepuntenDialoog } from "./Actiepunten";
import { ExternalLink } from "./ExternalLink";
import { Delen, DelenDialoog } from "./NotulenDelen";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  PersoonIcon,
  SparkleIcon,
} from "./icons";
import styles from "./NotulenStappen.module.css";

type DotProps = { stand: Stand; stap: number; className?: string };

/** Het icoon bij een status, zodat die nooit alleen aan de kleur te zien is. */
export function StatusIcoon({ stand, stap, className }: DotProps) {
  if (stand === "ok") return <CheckIcon className={className} />;
  if (stand === "jij") return <PersoonIcon className={className} />;
  if (stand === "warn") return <AlertIcon className={className} />;
  if (stand === "muted") return <CloseIcon className={className} />;
  if (stap === 3) return <SparkleIcon className={className} />;
  return <ClockIcon className={className} />;
}

/** De gekleurde dot met icoon; de tekst staat ernaast of in een verborgen label. */
export function Dot({ stand, stap, className }: DotProps) {
  return (
    <span
      className={`${styles.dot} ${className ?? ""}`}
      data-stand={stand}
      aria-hidden="true"
    >
      <StatusIcoon stand={stand} stap={stap} className={styles.dotIcoon} />
    </span>
  );
}

const LEGENDA: [Stand, string][] = [
  ["ok", "Klaar"],
  ["jij", "Wacht op jou"],
  ["open", "Dashboard bezig"],
  ["warn", "Vastgelopen of mislukt"],
  ["muted", "Geen notulen"],
];

export function Legenda() {
  return (
    <ul className={styles.legenda} aria-label="Legenda">
      {LEGENDA.map(([stand, tekst]) => (
        <li key={stand} className={styles.legendaItem}>
          <Dot stand={stand} stap={0} className={styles.klein} />
          {tekst}
        </li>
      ))}
    </ul>
  );
}

type Stap = "klaar" | "nu" | "vast" | "open" | "nvt";

type ChecklistProps = { meeting: Meeting; status: NotulenStatus };

/** De zeven stappen van een meeting; de huidige stap uitgelicht met uitleg en knop. */
export function Checklist({ meeting, status }: ChecklistProps) {
  const [notulenOpen, setNotulenOpen] = useState(false);
  const [actiesOpen, setActiesOpen] = useState(false);
  const [delenOpen, setDelenOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();
  const huidig = huidigeStap(status, meeting.hoort === PRIVE);
  const standVan = (index: number): Stap => {
    if (index === 5 && meeting.hoort === PRIVE) return "nvt";
    if (index < status.stap) return "klaar";
    if (index !== huidig) return "open";
    return status.stand === "warn" ? "vast" : "nu";
  };

  function inhoud(index: number) {
    if (status.fout) {
      return (
        <>
          <p className={styles.regel} role="alert">
            {status.fout}
          </p>
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              aria-busy={bezig}
              disabled={bezig}
              onClick={() =>
                startTransition(async () =>
                  setMelding(await opnieuwNotulenAction(meeting.id)),
                )
              }
            >
              Opnieuw proberen
            </button>
          </div>
          {melding && (
            <p className={`nd-meta ${styles.regel}`} role="status">
              {melding}
            </p>
          )}
        </>
      );
    }
    if (index === 1 && status.geenOpname) {
      return (
        <p className={`nd-meta ${styles.regel}`}>
          Geen opname: het dashboard zoekt er niet zelf een.
        </p>
      );
    }
    if (index === 1 && status.vast) {
      return (
        <p className={styles.regel}>
          Geen Plaud-opname gevonden tussen {meeting.van} en {meeting.tot}.
          Stond Plaud Desktop aan?
        </p>
      );
    }
    if (index === 1) {
      return (
        <p className={`nd-meta ${styles.regel}`}>
          Het dashboard zoekt elke 5 minuten naar de opname in Plaud.
        </p>
      );
    }
    if (index === 2) {
      return (
        <>
          <p className={styles.regel}>
            De opname staat in Plaud, zonder transcript. Klik daar op
            Auto-generate.
          </p>
          {status.opnameId && (
            <div className={styles.knoppen}>
              <ExternalLink
                href={plaudWebUrl(status.opnameId)}
                className="nd-button nd-button--small"
              >
                Open in Plaud web
              </ExternalLink>
            </div>
          )}
        </>
      );
    }
    if (index === 3) {
      return (
        <p className={`nd-meta ${styles.regel}`}>
          Claude maakt de notulen, 1 tot 3 minuten.
        </p>
      );
    }
    if (index === 5) {
      return (
        <Delen
          meeting={meeting}
          status={status}
          onOpen={() => setDelenOpen(true)}
        />
      );
    }
    if (index === 6) {
      return (
        <p className={`nd-meta ${styles.regel}`}>
          Het dashboard haalt de actiepunten uit de notulen.
        </p>
      );
    }
    return (
      <p className={`nd-meta ${styles.regel}`}>
        Het dashboard zet de notulen in Superhuman.
      </p>
    );
  }

  function openen(index: number) {
    if (index === 3 && status.notulen) {
      return (
        <button
          type="button"
          className={styles.openen}
          onClick={() => setNotulenOpen(true)}
        >
          Openen<span className="nd-visually-hidden">: notulen</span>
        </button>
      );
    }
    if (index === 4 && status.paginaUrl) {
      return (
        <ExternalLink href={status.paginaUrl} className={styles.openen}>
          Openen<span className="nd-visually-hidden"> in Superhuman</span>
        </ExternalLink>
      );
    }
    if (index === 6 && status.acties?.length) {
      return (
        <button
          type="button"
          className={styles.openen}
          onClick={() => setActiesOpen(true)}
        >
          Openen<span className="nd-visually-hidden">: actiepunten</span>
        </button>
      );
    }
    if (index === 5 && (status.nietGedeeld || status.elders)) {
      return (
        <button
          type="button"
          className={styles.openen}
          disabled={bezig}
          onClick={() =>
            startTransition(() => nietDelenAction(meeting.id, "terug"))
          }
        >
          Ongedaan maken
        </button>
      );
    }
    const verstuurd =
      status.mail.stand === "verstuurd" || status.slack.stand === "verstuurd";
    if (index === 5 && status.delen && verstuurd) {
      return (
        <button
          type="button"
          className={styles.openen}
          onClick={() => setDelenOpen(true)}
        >
          Openen<span className="nd-visually-hidden">: delen</span>
        </button>
      );
    }
    return null;
  }

  return (
    <>
      <p className={`nd-meta ${styles.teller}`}>
        {status.stap} van {STAPPEN.length} stappen klaar
      </p>
      <ol className={styles.stappen}>
        {STAPPEN.map((naam, index) => {
          const stap = standVan(index);
          return (
            <li key={naam} className={styles.stap} data-stand={stap}>
              <span className={styles.naam} data-stand={stap}>
                {index === 5 ? delenNaam(status) : naam}
                {index === 6 && status.acties && ` · ${status.acties.length}`}
                {stap === "nvt" && " · niet nodig"}
                {stap === "klaar" && openen(index)}
                <span className="nd-visually-hidden">
                  {stap === "klaar" && ", klaar"}
                  {stap === "nu" && `, nu: ${status.tekst}`}
                  {stap === "vast" && `, ${status.tekst}`}
                </span>
              </span>
              <StapIcoon stap={stap} status={status} />
              {(stap === "nu" || stap === "vast") && (
                <div className={styles.inhoud}>{inhoud(index)}</div>
              )}
              {index === 1 &&
                (status.stand !== "muted" || status.geenOpname) && (
                  <Opname meeting={meeting} status={status} />
                )}
            </li>
          );
        })}
      </ol>
      {notulenOpen && status.notulen && (
        <NotulenDialoog
          meeting={meeting}
          tekst={status.notulen}
          paginaUrl={status.paginaUrl}
          onSluit={() => setNotulenOpen(false)}
        />
      )}
      {delenOpen && (
        <DelenDialoog
          meeting={meeting}
          status={status}
          onSluit={() => setDelenOpen(false)}
        />
      )}
      {actiesOpen && status.acties && (
        <ActiepuntenDialoog
          meta={`${meeting.titel} · ${dagFormat.format(Date.parse(meeting.start))} · ${meeting.van}–${meeting.tot}`}
          acties={status.acties}
          onSluit={() => setActiesOpen(false)}
        />
      )}
    </>
  );
}

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const opnameTekst = (opname: OpnameInfo) =>
  `${tijdFormat.format(opname.start)}, ${Math.round(opname.duurMs / 60_000)} min · ${opname.naam}`;

/** De gekoppelde Plaud-opname, met links om hem te wisselen, los te koppelen of te verversen. */
function Opname({ meeting, status }: ChecklistProps) {
  const [keuzes, setKeuzes] = useState<OpnameKeuzes | null>(null);
  const [kiezen, setKiezen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();

  useEffect(() => {
    let actueel = true;
    opnameKeuzesAction(meeting.id).then((uit) => {
      if (actueel) setKeuzes(uit);
    });
    return () => {
      actueel = false;
    };
  }, [meeting.id, status.opnameId, status.geenOpname]);

  function kies(opnameId: string | null) {
    startTransition(async () => {
      setMelding(await kiesOpnameAction(meeting.id, opnameId));
      setKiezen(false);
    });
  }

  const info = keuzes && "gekoppeld" in keuzes ? keuzes : null;
  return (
    <div className={styles.inhoud}>
      {status.opnameId && info?.gekoppeld && (
        <p className={`nd-meta ${styles.regel}`}>
          Plaud: {opnameTekst(info.gekoppeld)}
        </p>
      )}
      {keuzes && "fout" in keuzes && (
        <p className={`nd-meta ${styles.regel}`}>{keuzes.fout}</p>
      )}
      <div className={styles.links}>
        <button
          type="button"
          className={styles.opnameLink}
          aria-expanded={kiezen}
          disabled={bezig}
          onClick={() => setKiezen(!kiezen)}
        >
          Andere opname kiezen
        </button>
        {!status.geenOpname && (
          <button
            type="button"
            className={styles.opnameLink}
            disabled={bezig}
            onClick={() => kies(null)}
          >
            Geen opname
          </button>
        )}
        {status.stap <= 3 && !status.geenOpname && (
          <button
            type="button"
            className={styles.opnameLink}
            aria-busy={bezig}
            disabled={bezig}
            onClick={() =>
              startTransition(async () =>
                setMelding(await verversMeetingAction(meeting.id)),
              )
            }
          >
            Verversen
          </button>
        )}
      </div>
      {melding && (
        <p className={`nd-meta ${styles.regel}`} role="status">
          {melding}
        </p>
      )}
      {kiezen && (
        <ul className={styles.opnames} aria-label="Opnames rond deze dag">
          {info?.opties.length === 0 && (
            <li className="nd-meta">Geen opnames gevonden rond deze dag.</li>
          )}
          {!keuzes && <li className="nd-meta">Opnames ophalen…</li>}
          {info?.opties.map((opname) => (
            <li key={opname.id}>
              <button
                type="button"
                className={styles.opnameKeuze}
                aria-current={opname.id === status.opnameId}
                disabled={bezig}
                onClick={() => kies(opname.id)}
              >
                {opnameTekst(opname)}
                {opname.bezetDoor && (
                  <span className="nd-meta">
                    {" "}
                    · hoort nu bij {opname.bezetDoor}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** De naam van de stap Gedeeld, ook als er niets via het dashboard ging. */
function delenNaam(status: NotulenStatus): string {
  if (status.nietGedeeld) return "Niet gedeeld";
  if (status.elders) return "Gedeeld (elders)";
  return "Gedeeld";
}

/** De stap die nu uitgelicht is; -1 als de meeting klaar of overgeslagen is. Privé slaat Gedeeld over. */
function huidigeStap(status: NotulenStatus, prive: boolean): number {
  if (status.stand === "ok") return -1;
  if (status.stap <= 4 || (status.stap === 5 && !prive)) return status.stap;
  return status.stand === "muted" ? -1 : 6;
}

function StapIcoon({ stap, status }: { stap: Stap; status: NotulenStatus }) {
  if (stap === "klaar") {
    return (
      <span className={styles.mini} data-stand="klaar" aria-hidden="true">
        <CheckIcon className={styles.vink} />
      </span>
    );
  }
  if (stap === "nu" || stap === "vast") {
    return (
      <Dot stand={status.stand} stap={status.stap} className={styles.mini} />
    );
  }
  if (stap === "nvt") {
    return (
      <span className={styles.mini} data-stand="nvt" aria-hidden="true">
        –
      </span>
    );
  }
  return <span className={styles.mini} data-stand="leeg" aria-hidden="true" />;
}

/** Vetgedrukte stukken als **Actie Naam:** worden <strong>. */
function opmaak(regel: string) {
  return regel
    .split(/(\*\*[^*]+\*\*)/)
    .map((deel, index) =>
      deel.startsWith("**") && deel.endsWith("**") ? (
        <strong key={index}>{deel.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{deel}</Fragment>
      ),
    );
}

type Blok =
  | { soort: "kop"; tekst: string }
  | { soort: "lijst"; items: string[] }
  | { soort: "alinea"; regels: string[] };

/** Leest het vaste notulenformat: alinea's, "## N. Onderwerp" en bullets. */
function blokken(tekst: string): Blok[] {
  const uit: Blok[] = [];
  for (const regel of tekst.split("\n")) {
    const schoon = regel.trim();
    const vorige = uit.at(-1);
    if (!schoon) {
      uit.push({ soort: "alinea", regels: [] });
      continue;
    }
    if (schoon.startsWith("#")) {
      uit.push({ soort: "kop", tekst: schoon.replace(/^#+\s*/, "") });
      continue;
    }
    if (/^[-*•]\s/.test(schoon)) {
      const item = schoon.replace(/^[-*•]\s+/, "");
      if (vorige?.soort === "lijst") vorige.items.push(item);
      else uit.push({ soort: "lijst", items: [item] });
      continue;
    }
    if (vorige?.soort === "alinea") vorige.regels.push(schoon);
    else uit.push({ soort: "alinea", regels: [schoon] });
  }
  return uit.filter((blok) => blok.soort !== "alinea" || blok.regels.length);
}

const dagFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

type DialoogProps = {
  meeting: Meeting;
  tekst: string;
  paginaUrl: string | null;
  onSluit: () => void;
};

function NotulenDialoog({ meeting, tekst, paginaUrl, onSluit }: DialoogProps) {
  const dialoog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialoog}
      className={`nd-dialog ${styles.dialoog}`}
      aria-labelledby="notulen-kop"
      onClose={onSluit}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <div className="nd-dialog__body">
        <p className={`nd-meta ${styles.regel}`}>
          {dagFormat.format(Date.parse(meeting.start))} · {meeting.van}–
          {meeting.tot} · {meeting.label}
        </p>
        <h2 className="nd-title" id="notulen-kop">
          {meeting.titel}
        </h2>
        <div className={styles.notulen}>
          {blokken(tekst).map((blok, index) => {
            if (blok.soort === "kop") {
              return (
                <h3 key={index} className={styles.notulenKop}>
                  {opmaak(blok.tekst)}
                </h3>
              );
            }
            if (blok.soort === "lijst") {
              return (
                <ul key={index} className={styles.notulenLijst}>
                  {blok.items.map((item, i) => (
                    <li key={i}>{opmaak(item)}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={index} className={styles.alinea}>
                {blok.regels.map((regel, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {opmaak(regel)}
                  </Fragment>
                ))}
              </p>
            );
          })}
        </div>
        <div className="nd-dialog__foot">
          {paginaUrl && (
            <ExternalLink
              href={paginaUrl}
              className="nd-button nd-button--quiet"
            >
              Open in Superhuman
            </ExternalLink>
          )}
          <button
            type="button"
            className="nd-button"
            onClick={() => dialoog.current?.close()}
          >
            Sluiten
          </button>
        </div>
      </div>
    </dialog>
  );
}
