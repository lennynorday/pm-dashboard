import NextLink from "next/link";
import type { Signaal, SignaalType } from "@/lib/signals";
import { ExternalLink } from "./ExternalLink";
import { AlertIcon, ClockIcon, LinkIcon, MessageIcon } from "./icons";
import styles from "./AttentionBand.module.css";

type Props = { signalen: Signaal[] };

/** Per soort het icoon en de knop; een mislukte bron heeft geen actie. */
const SOORT: Record<SignaalType, { actie?: string; Icon: typeof ClockIcon }> = {
  koppelen: { actie: "Koppelen", Icon: LinkIcon },
  "sprint-verlopen": { actie: "Openen", Icon: ClockIcon },
  "support-wacht": { actie: "Openen", Icon: MessageIcon },
  "bron-fout": { Icon: AlertIcon },
};

/** Gele meldingen met wat nu aandacht vraagt; zonder signalen staat er niets. */
export function AttentionBand({ signalen }: Props) {
  if (signalen.length === 0) return null;

  return (
    <section className={styles.band} aria-labelledby="aandacht">
      <h2 id="aandacht" className="nd-visually-hidden">
        Vraagt nu aandacht
      </h2>
      <ul className={styles.lijst}>
        {signalen.map((signaal) => {
          const { actie, Icon } = SOORT[signaal.type];
          return (
            <li key={signaal.titel} className="nd-alert">
              <span className="nd-alert__icon">
                <Icon />
              </span>
              <p className="nd-alert__text">
                <strong className={styles.titel}>{signaal.titel}</strong>
                {signaal.detail}
              </p>
              {actie &&
                (signaal.url.startsWith("/") ? (
                  <NextLink
                    href={signaal.url}
                    className="nd-button nd-button--small"
                  >
                    {actie}
                    <span className="visually-hidden">: {signaal.titel}</span>
                  </NextLink>
                ) : (
                  <ExternalLink
                    href={signaal.url}
                    className="nd-button nd-button--small"
                  >
                    {actie}
                    <span className="visually-hidden">: {signaal.titel}</span>
                  </ExternalLink>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
