import type { ReactNode } from "react";
import type { Signaal } from "@/lib/budgetsignaal";
import { formatUren } from "@/lib/format";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  PlusIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "./icons";
import styles from "./Budgetregel.module.css";

const ICONEN = {
  check: CheckIcon,
  plus: PlusIcon,
  alert: AlertIcon,
  up: TrendUpIcon,
  down: TrendDownIcon,
  clock: ClockIcon,
} satisfies Record<Signaal["icoon"], typeof CheckIcon>;

/** Geschreven vol, gepland gestreept, wat boven het budget uitkomt roze met een streep op de grens. */
function Balk({
  budget,
  geschreven,
  gepland,
}: {
  budget: number;
  geschreven: number;
  gepland: number;
}) {
  const schaal = Math.max(budget, geschreven + gepland, 1);
  const breedte = (minuten: number) => `${(minuten / schaal) * 100}%`;
  const vol = Math.min(geschreven, budget);
  const gestreept = Math.max(0, Math.min(gepland, budget - vol));
  const over = Math.max(0, geschreven + gepland - budget);
  return (
    <span className={styles.balk} aria-hidden="true">
      <span className={styles.vol} style={{ width: breedte(vol) }} />
      <span
        className={styles.gestreept}
        style={{ width: breedte(gestreept) }}
      />
      <span className={styles.over} style={{ width: breedte(over) }} />
      {over > 0 && (
        <span
          className={styles.grens}
          style={{ left: `calc(${breedte(budget)} - 1px)` }}
        />
      )}
    </span>
  );
}

/**
 * Het geschreven aantal uren groot, de balk eronder en rechtsonder één noot.
 * Met `tijdProcent` komt er een tweede balk bij op dezelfde schaal (uren
 * tegen tijd, voor een SLA). `links` staat links onder de balk.
 */
export function Budgetregel({
  budget,
  geschreven,
  gepland,
  noot,
  links,
  tijdProcent,
}: {
  budget: number;
  geschreven: number;
  gepland: number;
  noot: Signaal;
  links?: ReactNode;
  tijdProcent?: number;
}) {
  const NootIcoon = ICONEN[noot.icoon];
  const urenProcent =
    budget === 0 ? 0 : Math.round((geschreven / budget) * 100);
  const balk = (
    <Balk budget={budget} geschreven={geschreven} gepland={gepland} />
  );
  return (
    <div className={styles.meter}>
      <div className={styles.cijfers}>
        <b>{formatUren(geschreven)}</b>
        <span>/ {formatUren(budget)}u</span>
        {gepland > 0 && (
          <em className={styles.gepland}>+{formatUren(gepland)}u gepland</em>
        )}
      </div>
      {tijdProcent === undefined ? (
        balk
      ) : (
        <div
          className={styles.duo}
          role="img"
          aria-label={`${urenProcent}% van de uren, ${tijdProcent}% van de tijd`}
        >
          {balk}
          <span>
            <b>{urenProcent}%</b> uren
          </span>
          <span className={styles.tijd}>
            <span style={{ width: `${tijdProcent}%` }} />
          </span>
          <span>
            <b>{tijdProcent}%</b> tijd
          </span>
        </div>
      )}
      <div className={styles.nootRij}>
        {links && <span className={styles.links}>{links}</span>}
        <p className={styles.noot} data-soort={noot.soort}>
          <NootIcoon className={styles.nootIcoon} />
          {noot.tekst}
        </p>
      </div>
    </div>
  );
}
