"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import {
  kiesOpnameAction,
  meetingAfgelopenAction,
  nietDelenAction,
  plaudOpgeruimdAction,
  opnameKeuzesAction,
  opnieuwNotulenAction,
  verversMeetingAction,
  zetWeggelatenTerugAction,
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
  stappenKlaar,
} from "@/lib/notulen-stand";
import { ActiepuntenDialoog } from "./Actiepunten";
import { ExternalLink } from "./ExternalLink";
import { NotulenAkkoord } from "./NotulenAkkoord";
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

/** De acht stappen van een meeting; de huidige stap uitgelicht met uitleg en knop. */
export function Checklist({ meeting, status }: ChecklistProps) {
  const [notulenOpen, setNotulenOpen] = useState(false);
  const [actiesOpen, setActiesOpen] = useState(false);
  const [delenOpen, setDelenOpen] = useState(false);
  const [wegOpen, setWegOpen] = useState(false);
  const [akkoordOpen, setAkkoordOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();
  const klaar = stappenKlaar(status);
  const huidig = huidigeStap(status, meeting.hoort === PRIVE);
  const standVan = (index: number): Stap => {
    if (index === 6 && meeting.hoort === PRIVE) return "nvt";
    if (index < klaar) return "klaar";
    // De actiepunten komen uit de notulen, dus ze kunnen klaar zijn terwijl Superhuman of Gedeeld nog loopt.
    if (index === 7 && status.actiesUit) return "klaar";
    if (index !== huidig) return "open";
    return status.stand === "warn" ? "vast" : "nu";
  };

  const afgelopen = (klaar: boolean) =>
    startTransition(() =>
      meetingAfgelopenAction(
        {
          id: meeting.id,
          serieId: meeting.serieId,
          titel: meeting.titel,
          start: meeting.start,
        },
        klaar,
      ),
    );

  function inhoud(index: number) {
    if (status.lopend) {
      return (
        <>
          <p className={styles.regel}>
            Loopt nog tot {meeting.tot}. Daarna zoekt het dashboard de opname in
            Plaud.
          </p>
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              aria-busy={bezig}
              disabled={bezig}
              onClick={() => afgelopen(true)}
            >
              Meeting al afgelopen
            </button>
          </div>
        </>
      );
    }
    if (status.fout) {
      // Mislukte het Slack-bericht, dan kan de mail nog wel: Delen blijft erbij staan.
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
          {index === 6 && (
            <Delen
              meeting={meeting}
              status={status}
              onOpen={() => setDelenOpen(true)}
            />
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
    if (index === 2) return <Transcript meeting={meeting} status={status} />;
    if (index === 3) {
      return (
        <p className={`nd-meta ${styles.regel}`}>
          Claude maakt de notulen, 1 tot 15 minuten: hoe langer de meeting, hoe
          langer het duurt.
        </p>
      );
    }
    if (index === 4) {
      return (
        <>
          <p className={`nd-meta ${styles.regel}`}>
            {status.bewerkt
              ? `Concept opgeslagen om ${tijdFormat.format(status.bewerkt)}, nog geen akkoord.`
              : "Lees de notulen, pas aan wat nodig is en geef akkoord. Pas daarna gaan ze naar Superhuman."}
          </p>
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              onClick={() => setAkkoordOpen(true)}
            >
              {status.bewerkt ? "Verder aanpassen" : "Lezen en akkoord geven"}
            </button>
          </div>
        </>
      );
    }
    if (index === 6) {
      return (
        <Delen
          meeting={meeting}
          status={status}
          onOpen={() => setDelenOpen(true)}
        />
      );
    }
    if (index === 7) {
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
    if (index === 0 && status.vroegKlaar && status.stap <= 1) {
      return (
        <button
          type="button"
          className={styles.openen}
          disabled={bezig}
          onClick={() => afgelopen(false)}
        >
          Toch nog bezig
        </button>
      );
    }
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
    if (index === 5 && status.paginaUrl) {
      return (
        <ExternalLink href={status.paginaUrl} className={styles.openen}>
          Openen<span className="nd-visually-hidden"> in Superhuman</span>
        </ExternalLink>
      );
    }
    if (index === 7 && status.acties?.length) {
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
    if (index === 6 && (status.nietGedeeld || status.elders)) {
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
    if (index === 6 && status.delen && verstuurd) {
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
        {klaar + (status.actiesUit && klaar < STAPPEN.length ? 1 : 0)} van{" "}
        {STAPPEN.length} stappen klaar
      </p>
      <ol className={styles.stappen}>
        {STAPPEN.map((naam, index) => {
          const stap = standVan(index);
          return (
            <li key={naam} className={styles.stap} data-stand={stap}>
              <span className={styles.naam} data-stand={stap}>
                {index === 6 ? delenNaam(status) : naam}
                {index === 7 && status.acties && ` · ${status.acties.length}`}
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
              {index === 3 &&
                stap === "klaar" &&
                status.weggelaten.length > 0 && (
                  <p className={`nd-meta ${styles.sub}`}>
                    {status.weggelaten.length}{" "}
                    {status.weggelaten.length === 1 ? "passage" : "passages"}{" "}
                    weggelaten
                    <button
                      type="button"
                      className={styles.openen}
                      onClick={() => setWegOpen(true)}
                    >
                      Bekijken
                    </button>
                  </p>
                )}
              {index === 1 &&
                !status.lopend &&
                (status.stand !== "muted" || status.geenOpname) && (
                  <Opname meeting={meeting} status={status} />
                )}
            </li>
          );
        })}
      </ol>
      {status.plaudOpruimen && status.opnameId && (
        <div className={styles.melding} role="status">
          <p className={styles.regel}>
            <strong>Ruim de opname in Plaud op</strong>
          </p>
          <p className={`nd-meta ${styles.regel}`}>
            Het transcript bevat opmerkingen over personen. Die staan niet in de
            notulen, maar wel in Plaud, en dat account is gedeeld. Pas de opname
            daar aan of verwijder hem.
          </p>
          <div className={styles.knoppen}>
            <ExternalLink
              href={plaudWebUrl(status.opnameId)}
              className="nd-button nd-button--small"
            >
              Open in Plaud web
            </ExternalLink>
            <button
              type="button"
              className="nd-button nd-button--small nd-button--quiet"
              disabled={bezig}
              onClick={() =>
                startTransition(() => plaudOpgeruimdAction(meeting.id))
              }
            >
              Gedaan
            </button>
            {/* Negeer verbergt de melding net als Gedaan; aparte opslag is niet nodig. */}
            <button
              type="button"
              className="nd-button nd-button--small nd-button--quiet"
              disabled={bezig}
              onClick={() =>
                startTransition(() => plaudOpgeruimdAction(meeting.id))
              }
            >
              Negeer
            </button>
          </div>
        </div>
      )}
      {akkoordOpen && status.notulen && (
        <NotulenAkkoord
          meeting={meeting}
          notulen={status.notulen}
          bewerkt={status.bewerkt}
          onSluit={() => setAkkoordOpen(false)}
        />
      )}
      {wegOpen && (
        <WeggelatenDialoog
          meeting={meeting}
          status={status}
          onSluit={() => setWegOpen(false)}
        />
      )}
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
        {status.opnameId && (
          <ExternalLink
            href={plaudWebUrl(status.opnameId)}
            className={styles.opnameLink}
          >
            Openen
          </ExternalLink>
        )}
        <button
          type="button"
          className={styles.opnameLink}
          aria-expanded={kiezen}
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

/**
 * Wacht op het transcript. Kijkt bij openen eerst zelf in Plaud: de achtergrondronde
 * loopt maar elke 5 minuten, dus anders staat hier "zonder transcript" terwijl het er al is.
 */
function Transcript({ meeting, status }: ChecklistProps) {
  const [gecontroleerd, setGecontroleerd] = useState(false);

  useEffect(() => {
    let actueel = true;
    verversMeetingAction(meeting.id).finally(() => {
      if (actueel) setGecontroleerd(true);
    });
    return () => {
      actueel = false;
    };
  }, [meeting.id]);

  if (!gecontroleerd) {
    return (
      <p className={`nd-meta ${styles.regel}`} role="status">
        Transcript controleren in Plaud…
      </p>
    );
  }
  return (
    <>
      <p className={styles.regel}>
        De opname staat in Plaud, zonder transcript. Klik daar op Auto-generate.
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

/** De naam van de stap Gedeeld, ook als er niets via het dashboard ging. */
function delenNaam(status: NotulenStatus): string {
  if (status.nietGedeeld) return "Niet gedeeld";
  if (status.elders) return "Gedeeld (elders)";
  return "Gedeeld";
}

/** De stap die nu uitgelicht is; -1 als de meeting klaar of overgeslagen is. Privé slaat Gedeeld over. */
function huidigeStap(status: NotulenStatus, prive: boolean): number {
  if (status.stand === "ok") return -1;
  const klaar = stappenKlaar(status);
  if (klaar <= 5 || (klaar === 6 && !prive)) return klaar;
  return status.stand === "muted" ? -1 : 7;
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

/** De passages die Claude uit de notulen liet, met per passage Terugzetten. */
function WeggelatenDialoog({
  meeting,
  status,
  onSluit,
}: ChecklistProps & { onSluit: () => void }) {
  const dialoog = useRef<HTMLDialogElement>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();
  useEffect(() => {
    dialoog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialoog}
      className={`nd-dialog ${styles.dialoog}`}
      aria-labelledby="weggelaten-kop"
      onClose={onSluit}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialoog.current?.close();
      }}
    >
      <div className="nd-dialog__body">
        <h2 className="nd-title" id="weggelaten-kop">
          Weggelaten passages
        </h2>
        <p className={`nd-meta ${styles.regel}`}>
          Claude liet deze stukken uit de notulen. Zet terug wat er wel in moet.
        </p>
        {status.weggelaten.length === 0 && (
          <p className={styles.regel}>Alles is teruggezet.</p>
        )}
        <ul className={styles.passages}>
          {status.weggelaten.map((passage, index) => (
            <li key={`${index}-${passage.tekst}`} className={styles.passage}>
              {passage.onderwerp !== null && (
                <span className="nd-meta">Onderwerp {passage.onderwerp}</span>
              )}
              <blockquote className={styles.regel}>{passage.tekst}</blockquote>
              <div className={styles.knoppen}>
                <button
                  type="button"
                  className="nd-button nd-button--small nd-button--quiet"
                  disabled={bezig}
                  onClick={() =>
                    startTransition(async () =>
                      setMelding(
                        await zetWeggelatenTerugAction(meeting.id, index),
                      ),
                    )
                  }
                >
                  Terugzetten
                </button>
              </div>
            </li>
          ))}
        </ul>
        {melding && (
          <p className={`nd-meta ${styles.regel}`} role="status">
            {melding}
          </p>
        )}
        <div className="nd-dialog__foot">
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
