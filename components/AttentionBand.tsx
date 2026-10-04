import NextLink from "next/link";
import type { Signaal, SignaalType } from "@/lib/signals";
import { ExternalLink } from "./ExternalLink";
import { AlertIcon, CheckIcon, ClockIcon, MessageIcon } from "./icons";
import styles from "./AttentionBand.module.css";

type Props = {
  signalen: Signaal[];
  /** Op de accountpagina is de accountnaam overbodig. */
  toonAccount?: boolean;
};

const SOORT: Record<SignaalType, { label: string; Icon: typeof ClockIcon }> = {
  "sprint-verlopen": { label: "Sprint verlopen", Icon: ClockIcon },
  "support-wacht": { label: "Support wacht", Icon: MessageIcon },
  "bron-fout": { label: "Ophalen mislukt", Icon: AlertIcon },
};

/** Vol lila veld met wat nu aandacht vraagt; zonder signalen één rustige regel. */
export function AttentionBand({ signalen, toonAccount = true }: Props) {
  if (signalen.length === 0) {
    return (
      <section className={styles.rustig} aria-labelledby="aandacht">
        <h2 id="aandacht" className="visually-hidden">
          Vraagt nu aandacht
        </h2>
        <CheckIcon className={styles.rustigIcoon} />
        <p className={styles.rustigTekst}>
          Geen verlopen sprints en geen supporttickets die op ons wachten.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.band} ${toonAccount ? "" : styles.zonderAccount}`}
      aria-labelledby="aandacht"
    >
      <h2 id="aandacht" className={styles.kop}>
        Vraagt nu aandacht{" "}
        <span className={styles.aantal}>{signalen.length}</span>
      </h2>
      <ul className={styles.lijst}>
        {signalen.map((signaal) => {
          const { label, Icon } = SOORT[signaal.type];
          const intern = signaal.url.startsWith("/");
          return (
            <li
              key={`${signaal.accountSlug}-${signaal.titel}`}
              className={styles.signaal}
            >
              <span className={styles.soort}>
                <Icon className={styles.icoon} />
                {label}
              </span>
              {toonAccount && (
                <NextLink
                  href={`/accounts/${signaal.accountSlug}`}
                  className={styles.account}
                >
                  {signaal.accountNaam}
                </NextLink>
              )}
              <span className={styles.wat}>
                {intern ? (
                  <NextLink href={signaal.url} className={styles.titel}>
                    {signaal.titel}
                  </NextLink>
                ) : (
                  <ExternalLink href={signaal.url} className={styles.titel}>
                    {signaal.titel}
                  </ExternalLink>
                )}
                <span className={styles.detail}>{signaal.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
