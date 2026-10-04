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
  "sprint-verlopen": { label: "Verlopen", Icon: ClockIcon },
  "support-wacht": { label: "Wacht op ons", Icon: MessageIcon },
  "bron-fout": { label: "Niet opgehaald", Icon: AlertIcon },
};

/** Vol lila veld met wat nu aandacht vraagt; zonder signalen één rustige regel. */
export function AttentionBand({ signalen, toonAccount = true }: Props) {
  if (signalen.length === 0) {
    return (
      <section className={styles.rustig} aria-labelledby="aandacht">
        <h2 id="aandacht" className="visually-hidden">
          Aandacht
        </h2>
        <CheckIcon className={styles.rustigIcoon} />
        <p className={styles.rustigTekst}>Niets dat nu aandacht vraagt.</p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.band} ${toonAccount ? "" : styles.zonderAccount}`}
      aria-labelledby="aandacht"
    >
      <h2 id="aandacht" className={styles.kop}>
        Aandacht <span className={styles.aantal}>{signalen.length}</span>
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
