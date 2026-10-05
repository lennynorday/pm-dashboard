import type { LoginMelding } from "@/lib/session";
import { Melding } from "./Melding";
import styles from "./LoginScherm.module.css";

type Props = { melding: LoginMelding | null };

const MELDINGEN: Record<LoginMelding, { titel: string; uitleg: string }> = {
  "geen-norday-account": {
    titel: "Dit is geen Norday-account",
    uitleg: "Log in met je account op norday.nl.",
  },
  mislukt: {
    titel: "Inloggen is mislukt",
    uitleg: "Probeer het opnieuw.",
  },
};

/** Wat je ziet zolang je niet bent ingelogd. */
export function LoginScherm({ melding }: Props) {
  return (
    <main id="inhoud" className={styles.scherm}>
      <div className={styles.kaart}>
        <h1 className={styles.titel}>PM-dashboard</h1>
        <p className={styles.tekst}>
          Log in met je Norday Google-account om je accounts en projecten te
          zien.
        </p>
        {melding && (
          <Melding titel={MELDINGEN[melding].titel} role="alert">
            {MELDINGEN[melding].uitleg}
          </Melding>
        )}
        <a className={styles.knop} href="/api/google/login">
          Inloggen met Google
        </a>
      </div>
    </main>
  );
}
