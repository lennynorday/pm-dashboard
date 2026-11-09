"use client";

import NextLink from "next/link";
import { useId, useState, useTransition } from "react";
import {
  deelInSlackAction,
  type DeelUitkomst,
  zetDeelConceptAction,
} from "@/app/actions";
import type { Meeting } from "@/lib/meetings";
import { type DeelInfo, isEmail, voegToe } from "@/lib/notulen-delen";
import type { NotulenStatus } from "@/lib/notulen-stand";
import { ExternalLink } from "./ExternalLink";
import { CloseIcon } from "./icons";
import { VerbindLink } from "./VerbindLink";
import styles from "./NotulenStappen.module.css";

type Props = { meeting: Meeting; status: NotulenStatus };

/** De stap Gedeeld: extern een Gmail-concept, intern en Team een Slack-bericht. Er gaat niets weg zonder klik. */
export function Delen({ meeting, status }: Props) {
  const delen = status.delen;
  if (!delen) return null;
  if (delen.soort === "geen-kanaal") {
    return (
      <p className={styles.regel}>
        {delen.melding} <NextLink href={delen.href}>{delen.linkTekst}</NextLink>
      </p>
    );
  }
  if (delen.soort === "gmail") {
    return <GmailDelen meeting={meeting} status={status} delen={delen} />;
  }
  if (!delen.magSchrijven) return <SlackVerbinden />;
  if (!status.slackTekst) {
    return (
      <p className={`nd-meta ${styles.regel}`}>
        Claude schrijft het Slack-bericht, 1 tot 3 minuten.
      </p>
    );
  }
  return (
    <SlackDelen
      key={meeting.id}
      meeting={meeting}
      tekst={status.slackTekst}
      naam={delen.naam}
    />
  );
}

function SlackVerbinden() {
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

type GmailProps = Props & { delen: Extract<DeelInfo, { soort: "gmail" }> };

function GmailDelen({ meeting, status, delen }: GmailProps) {
  const id = useId();
  const [ontvangers, setOntvangers] = useState(delen.ontvangers);
  const [invoer, setInvoer] = useState("");
  const [invoerFout, setInvoerFout] = useState<string | null>(null);
  const [uitkomst, setUitkomst] = useState<DeelUitkomst | null>(null);
  const [bezig, startTransition] = useTransition();

  if (status.conceptUrl) {
    return (
      <>
        <p className={styles.regel}>
          Het concept staat in Gmail. Verstuur het daar; het dashboard ziet
          binnen 5 minuten dat het verstuurd is.
        </p>
        <div className={styles.knoppen}>
          <ExternalLink
            href={status.conceptUrl}
            className="nd-button nd-button--small"
          >
            Open concept in Gmail
          </ExternalLink>
        </div>
      </>
    );
  }
  if (uitkomst?.uitkomst === "verbinden") {
    return (
      <p className={styles.regel}>
        Het dashboard mag nog geen concepten in Gmail maken. Verbind opnieuw met
        Google en geef toestemming.{" "}
        <VerbindLink href="/api/google/login">
          Opnieuw verbinden met Google
        </VerbindLink>
      </p>
    );
  }

  function voeg() {
    const adres = invoer.trim();
    if (!adres) return;
    if (!isEmail(adres)) {
      setInvoerFout(`"${adres}" is geen geldig e-mailadres`);
      return;
    }
    setOntvangers(voegToe(ontvangers, [adres]));
    setInvoer("");
    setInvoerFout(null);
  }

  function zetKlaar() {
    if (ontvangers.length === 0) {
      setInvoerFout("Voeg eerst een ontvanger toe");
      return;
    }
    startTransition(async () => {
      setUitkomst(await zetDeelConceptAction(meeting.id, ontvangers));
    });
  }

  return (
    <>
      <p className={styles.regel}>
        Kies de ontvangers, dan zet het dashboard een Gmail-concept met de link
        naar de notulen klaar. Versturen doe je zelf in Gmail.
      </p>
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
      </div>
      <div className={styles.knoppen}>
        <button
          type="button"
          className="nd-button nd-button--small"
          aria-busy={bezig}
          disabled={bezig}
          onClick={zetKlaar}
        >
          Zet concept klaar in Gmail
        </button>
        {delen.genodigden.length > 0 && (
          <button
            type="button"
            className="nd-button nd-button--small nd-button--quiet"
            onClick={() => setOntvangers(voegToe(ontvangers, delen.genodigden))}
          >
            Aan alle genodigden
          </button>
        )}
      </div>
      <Uitkomst uitkomst={uitkomst} />
    </>
  );
}

type SlackProps = { meeting: Meeting; tekst: string; naam: string };

function SlackDelen({ meeting, tekst, naam }: SlackProps) {
  const id = useId();
  const [bericht, setBericht] = useState(tekst);
  const [uitkomst, setUitkomst] = useState<DeelUitkomst | null>(null);
  const [bezig, startTransition] = useTransition();

  if (uitkomst?.uitkomst === "verbinden") return <SlackVerbinden />;

  return (
    <>
      <div>
        <label className="nd-label" htmlFor={`${id}-bericht`}>
          Bericht voor {naam} (geschreven door Claude, pas aan wat je wilt)
        </label>
        <textarea
          id={`${id}-bericht`}
          className={`nd-field ${styles.bericht}`}
          value={bericht}
          onChange={(event) => setBericht(event.target.value)}
        />
      </div>
      <div className={styles.knoppen}>
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
      <Uitkomst uitkomst={uitkomst} />
    </>
  );
}
