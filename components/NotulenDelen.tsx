"use client";

import NextLink from "next/link";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  deelInSlackAction,
  type DeelUitkomst,
  nietDelenAction,
  stuurDeelMailAction,
  zetDeelOnderdeelAction,
} from "@/app/actions";
import type { Meeting } from "@/lib/meetings";
import {
  type DeelInfo,
  type MailInfo,
  type Onderdeel,
  type SlackInfo,
  isEmail,
  voegToe,
} from "@/lib/notulen-delen";
import type { NotulenStatus } from "@/lib/notulen-stand";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon, CheckIcon } from "./icons";
import { VerbindLink } from "./VerbindLink";
import styles from "./NotulenStappen.module.css";
import delenStyles from "./NotulenDelen.module.css";

type PaneelProps = {
  meeting: Meeting;
  status: NotulenStatus;
  onOpen: () => void;
};

function samenvatting(delen: DeelInfo): string {
  const slack =
    delen.slack.soort === "slack" ? `Slack in ${delen.slack.naam}` : null;
  return [delen.mail ? "Mail aan de klant" : null, slack]
    .filter(Boolean)
    .join(" en ");
}

/** De stap Delen in het paneel: de overlay openen, niet delen of al elders gedeeld. */
export function Delen({ meeting, status, onOpen }: PaneelProps) {
  const [bezig, startTransition] = useTransition();
  const delen = status.delen;
  if (!delen) return null;
  const kies = (soort: "niet" | "elders") =>
    startTransition(() => nietDelenAction(meeting.id, soort));
  const alleenGeenKanaal = !delen.mail && delen.slack.soort === "geen-kanaal";
  const wachtOpClaude = !status.slackTekst && status.slack.stand === "open";

  return (
    <>
      {delen.slack.soort === "geen-kanaal" && !delen.mail && (
        <p className={styles.regel}>
          {delen.slack.melding}{" "}
          <NextLink href={delen.slack.href}>{delen.slack.linkTekst}</NextLink>
        </p>
      )}
      {wachtOpClaude && (
        <p className={`nd-meta ${styles.regel}`}>
          Claude schrijft het Slack-bericht, 1 tot 3 minuten.
        </p>
      )}
      {!alleenGeenKanaal && !wachtOpClaude && (
        <>
          <p className={`nd-meta ${styles.regel}`}>{samenvatting(delen)}</p>
          <div className={styles.knoppen}>
            <button
              type="button"
              className="nd-button nd-button--small"
              onClick={onOpen}
            >
              Delen
            </button>
          </div>
        </>
      )}
      <div className={delenStyles.acties}>
        <button
          type="button"
          className={styles.linkKnop}
          disabled={bezig}
          onClick={() => kies("niet")}
        >
          Niet delen
        </button>
        <button
          type="button"
          className={styles.linkKnop}
          disabled={bezig}
          onClick={() => kies("elders")}
        >
          Al gedeeld
        </button>
      </div>
    </>
  );
}

export function SlackVerbinden() {
  return (
    <p className={styles.regel}>
      Het dashboard mag nog geen berichten in Slack plaatsen. Verbind opnieuw en
      geef toestemming.{" "}
      <VerbindLink href="/api/slack/login">
        Opnieuw verbinden met Slack
      </VerbindLink>
    </p>
  );
}

function Uitkomst({ uitkomst }: { uitkomst: DeelUitkomst | null }) {
  if (uitkomst?.uitkomst === "fout") {
    return (
      <p className="nd-error" role="alert">
        {uitkomst.fout}
      </p>
    );
  }
  return null;
}

type Onderdelen = "mail" | "slack";

type KaderProps = {
  kop: string;
  klaar?: boolean;
  actie: ReactNode;
  children: ReactNode;
};

/** Eén onderdeel van de overlay, met zijn kop en rechtsboven een actie (Overslaan, Openen of Toch versturen). */
function Kader({ kop, klaar, actie, children }: KaderProps) {
  const id = useId();
  return (
    <section
      className={delenStyles.onderdeel}
      aria-labelledby={id}
      data-klaar={klaar ? "" : undefined}
    >
      <div className={delenStyles.kop}>
        <h3 className={delenStyles.titel} id={id}>
          {kop}
        </h3>
        {actie}
      </div>
      {children}
    </section>
  );
}

type KlaarProps = {
  meeting: Meeting;
  onderdeel: Onderdeel;
  welk: Onderdelen;
  kop: string;
  regel: string;
  openen: string;
};

/** Een verstuurd onderdeel (vinkje, regel en link) of een overgeslagen onderdeel (met Toch versturen). */
function Klaar({ meeting, onderdeel, welk, kop, regel, openen }: KlaarProps) {
  const [bezig, startTransition] = useTransition();
  const verstuurd = onderdeel.stand === "verstuurd";
  const link = onderdeel.url && (
    <ExternalLink href={onderdeel.url} className={styles.linkKnop}>
      {openen}
    </ExternalLink>
  );
  const terug = (
    <button
      type="button"
      className={styles.linkKnop}
      disabled={bezig}
      onClick={() =>
        startTransition(() => zetDeelOnderdeelAction(meeting.id, welk, false))
      }
    >
      Toch versturen
    </button>
  );
  return (
    <Kader kop={kop} klaar actie={verstuurd ? link : terug}>
      <p className={delenStyles.klaarRegel}>
        {verstuurd && <CheckIcon className={delenStyles.vink} />}
        {verstuurd ? regel : "Overgeslagen"}
      </p>
    </Kader>
  );
}

function Overslaan({ meeting, welk }: { meeting: Meeting; welk: Onderdelen }) {
  const [bezig, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={styles.linkKnop}
      disabled={bezig}
      onClick={() =>
        startTransition(() => zetDeelOnderdeelAction(meeting.id, welk, true))
      }
    >
      Overslaan
    </button>
  );
}

type MailProps = { meeting: Meeting; info: MailInfo; onderdeel: Onderdeel };

function MailOnderdeel({ meeting, info, onderdeel }: MailProps) {
  const id = useId();
  const [ontvangers, setOntvangers] = useState(info.ontvangers);
  const [invoer, setInvoer] = useState("");
  const [invoerFout, setInvoerFout] = useState<string | null>(null);
  const [onderwerp, setOnderwerp] = useState(info.onderwerp);
  const [tekst, setTekst] = useState(info.tekst);
  const [uitkomst, setUitkomst] = useState<DeelUitkomst | null>(null);
  const [bezig, startTransition] = useTransition();
  const kop = "Mail aan de klant";

  if (onderdeel.stand !== "open") {
    return (
      <Klaar
        meeting={meeting}
        onderdeel={onderdeel}
        welk="mail"
        kop={kop}
        regel="Verstuurd onder jouw naam"
        openen="Openen in Gmail"
      />
    );
  }

  /** De ontvangers inclusief wat nog in het invoerveld staat; null bij een ongeldig adres. */
  function metInvoer(): string[] | null {
    const adres = invoer.trim();
    if (!adres) return ontvangers;
    if (!isEmail(adres)) {
      setInvoerFout(`"${adres}" is geen geldig e-mailadres`);
      return null;
    }
    return voegToe(ontvangers, [adres]);
  }

  function voeg() {
    const lijst = metInvoer();
    if (!lijst) return;
    setOntvangers(lijst);
    setInvoer("");
    setInvoerFout(null);
  }

  function verstuur() {
    const aan = metInvoer();
    if (!aan) return;
    if (aan.length === 0) {
      setInvoerFout("Voeg eerst een ontvanger toe");
      return;
    }
    startTransition(async () => {
      setUitkomst(
        await stuurDeelMailAction(meeting.id, { aan, onderwerp, tekst }),
      );
    });
  }

  return (
    <Kader kop={kop} actie={<Overslaan meeting={meeting} welk="mail" />}>
      <div>
        <label className="nd-label" htmlFor={`${id}-aan`}>
          Aan
        </label>
        <div
          className={styles.ontvangers}
          data-fout={invoerFout ? "" : undefined}
        >
          {ontvangers.map((adres) => (
            <span key={adres} className={styles.ontvanger}>
              {adres}
              <button
                type="button"
                className={styles.weg}
                aria-label={`Verwijder ${adres}`}
                onClick={() =>
                  setOntvangers(ontvangers.filter((a) => a !== adres))
                }
              >
                <CloseIcon className={styles.wegIcoon} />
              </button>
            </span>
          ))}
          <input
            id={`${id}-aan`}
            className={styles.invoer}
            type="email"
            autoComplete="off"
            placeholder="E-mailadres, Enter"
            value={invoer}
            aria-invalid={invoerFout ? true : undefined}
            aria-describedby={invoerFout ? `${id}-fout` : undefined}
            onChange={(event) => setInvoer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              voeg();
            }}
          />
        </div>
        {invoerFout && (
          <p id={`${id}-fout`} className="nd-error" role="alert">
            {invoerFout}
          </p>
        )}
        {info.genodigden.length > 0 && (
          <button
            type="button"
            className={styles.linkKnop}
            onClick={() => setOntvangers(voegToe(ontvangers, info.genodigden))}
          >
            Aan alle genodigden
          </button>
        )}
      </div>
      <div>
        <label className="nd-label" htmlFor={`${id}-onderwerp`}>
          Onderwerp
        </label>
        <input
          id={`${id}-onderwerp`}
          className="nd-field"
          value={onderwerp}
          onChange={(event) => setOnderwerp(event.target.value)}
        />
      </div>
      <div>
        <label className="nd-label" htmlFor={`${id}-bericht`}>
          Bericht
        </label>
        <textarea
          id={`${id}-bericht`}
          className={`nd-field ${delenStyles.tekst}`}
          value={tekst}
          onChange={(event) => setTekst(event.target.value)}
        />
      </div>
      {uitkomst?.uitkomst === "verbinden" && (
        <p className={styles.regel}>
          Het dashboard mag nog geen mail versturen. Verbind opnieuw met Google
          en geef toestemming.{" "}
          <VerbindLink href="/api/google/login">
            Opnieuw verbinden met Google
          </VerbindLink>
        </p>
      )}
      <Uitkomst uitkomst={uitkomst} />
      <div className={delenStyles.acties}>
        <button
          type="button"
          className="nd-button nd-button--small"
          aria-busy={bezig}
          disabled={bezig || !onderwerp.trim() || !tekst.trim()}
          onClick={verstuur}
        >
          Verstuur mail
        </button>
      </div>
    </Kader>
  );
}

type SlackProps = {
  meeting: Meeting;
  info: SlackInfo;
  tekst: string | null;
  onderdeel: Onderdeel;
};

function SlackOnderdeel({ meeting, info, tekst, onderdeel }: SlackProps) {
  const kop = info.soort === "slack" ? `Slack in ${info.naam}` : "Slack";
  if (onderdeel.stand !== "open") {
    return (
      <Klaar
        meeting={meeting}
        onderdeel={onderdeel}
        welk="slack"
        kop={kop}
        regel="Geplaatst onder jouw naam"
        openen="Openen in Slack"
      />
    );
  }
  const actie = <Overslaan meeting={meeting} welk="slack" />;
  if (info.soort === "geen-kanaal") {
    return (
      <Kader kop={kop} actie={actie}>
        <p className={styles.regel}>
          {info.melding} <NextLink href={info.href}>{info.linkTekst}</NextLink>
        </p>
      </Kader>
    );
  }
  if (!info.magSchrijven) {
    return (
      <Kader kop={kop} actie={actie}>
        <SlackVerbinden />
      </Kader>
    );
  }
  if (tekst === null) {
    return (
      <Kader kop={kop} actie={actie}>
        <p className={`nd-meta ${styles.regel}`}>
          Claude schrijft het Slack-bericht, 1 tot 3 minuten.
        </p>
      </Kader>
    );
  }
  return (
    <Kader kop={kop} actie={actie}>
      <SlackFormulier meeting={meeting} naam={info.naam} tekst={tekst} />
    </Kader>
  );
}

type FormulierProps = { meeting: Meeting; naam: string; tekst: string };

function SlackFormulier({ meeting, naam, tekst }: FormulierProps) {
  const id = useId();
  const [bericht, setBericht] = useState(tekst);
  const [uitkomst, setUitkomst] = useState<DeelUitkomst | null>(null);
  const [bezig, startTransition] = useTransition();

  if (uitkomst?.uitkomst === "verbinden") return <SlackVerbinden />;

  return (
    <>
      <div>
        <label className="nd-label" htmlFor={`${id}-bericht`}>
          Bericht (geschreven door Claude, pas aan wat je wilt)
        </label>
        <textarea
          id={`${id}-bericht`}
          className={`nd-field ${delenStyles.tekst}`}
          value={bericht}
          onChange={(event) => setBericht(event.target.value)}
        />
      </div>
      <Uitkomst uitkomst={uitkomst} />
      <div className={delenStyles.acties}>
        <button
          type="button"
          className="nd-button nd-button--small"
          aria-busy={bezig}
          disabled={bezig || !bericht.trim()}
          onClick={() =>
            startTransition(async () => {
              setUitkomst(await deelInSlackAction(meeting.id, bericht));
            })
          }
        >
          Verstuur naar {naam}
        </button>
      </div>
    </>
  );
}

const dagFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

type DialoogProps = {
  meeting: Meeting;
  status: NotulenStatus;
  onSluit: () => void;
};

/** De overlay om te delen: extern de mail en Slack naast elkaar, intern en Team alleen Slack. */
export function DelenDialoog({ meeting, status, onSluit }: DialoogProps) {
  const id = useId();
  const dialoog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialoog.current?.showModal();
  }, []);
  const delen = status.delen;
  if (!delen) return null;

  return (
    <dialog
      ref={dialoog}
      className={`nd-dialog ${delenStyles.dialoog}`}
      data-twee={delen.mail ? "" : undefined}
      aria-labelledby={`${id}-kop`}
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
        <h2 className="nd-title" id={`${id}-kop`}>
          Notulen delen · {meeting.titel}
        </h2>
        <div className={delenStyles.onderdelen}>
          {delen.mail && (
            <MailOnderdeel
              meeting={meeting}
              info={delen.mail}
              onderdeel={status.mail}
            />
          )}
          <SlackOnderdeel
            meeting={meeting}
            info={delen.slack}
            tekst={status.slackTekst}
            onderdeel={status.slack}
          />
        </div>
        <div className="nd-dialog__foot">
          {status.paginaUrl && (
            <ExternalLink
              href={status.paginaUrl}
              className="nd-button nd-button--quiet"
            >
              Notulen in Superhuman
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
