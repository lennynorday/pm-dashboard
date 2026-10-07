import NextLink from "next/link";
import type { Signaal, SignaalType } from "@/lib/signals";
import { ExternalLink } from "./ExternalLink";
import { AlertIcon, ClockIcon, LinkIcon, MessageIcon } from "./icons";
import styles from "./AttentionBand.module.css";

type Props = { signalen: Signaal[] };

const SOORT: Record<SignaalType, { label: string; Icon: typeof ClockIcon }> = {
  koppelen: { label: "Koppelen", Icon: LinkIcon },
  "sprint-verlopen": { label: "Sprint verlopen", Icon: ClockIcon },
  "support-wacht": { label: "Support wacht", Icon: MessageIcon },
  "bron-fout": { label: "Ophalen mislukt", Icon: AlertIcon },
};

/** Lila kaart met wat nu aandacht vraagt; zonder signalen staat er niets. */
export function AttentionBand({ signalen }: Props) {
  if (signalen.length === 0) return null;

  return (
    <section className={styles.band} aria-labelledby="aandacht">
      <h2 id="aandacht" className={styles.kop}>
        Vraagt nu aandacht{" "}
        <span className={styles.aantal}>{signalen.length}</span>
      </h2>
      <ul className={styles.lijst}>
        {signalen.map((signaal) => {
          const { label, Icon } = SOORT[signaal.type];
          return (
            <li key={signaal.titel} className={styles.signaal}>
              <span className={styles.soort}>
                <Icon className={styles.icoon} />
                {label}
              </span>
              {signaal.url.startsWith("/") ? (
                <NextLink href={signaal.url} className={styles.titel}>
                  {signaal.titel}
                </NextLink>
              ) : (
                <ExternalLink href={signaal.url} className={styles.titel}>
                  {signaal.titel}
                </ExternalLink>
              )}
              <span className={styles.detail}>{signaal.detail}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
