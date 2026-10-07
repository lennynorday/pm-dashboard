import { refreshData } from "@/app/actions";
import type { Dashboard } from "@/lib/dashboard";
import { formatTime } from "@/lib/format";
import { Melding } from "./Melding";
import styles from "./OrbitStatus.module.css";
import { VerversKnop } from "./VerversKnop";

type Props = { dashboard: Dashboard };

/** Toont wanneer de data is opgehaald, of waarom dat niet lukte; Verversen haalt alles opnieuw op. */
export function OrbitStatus({ dashboard }: Props) {
  if (dashboard.status === "niet-verbonden") {
    return (
      <div className={styles.melding}>
        <Melding
          titel="Niet verbonden met Teamleader Orbit"
          actie={<a href="/api/orbit/login">Verbinden met Orbit</a>}
        >
          Zonder Orbit kan het dashboard je projecten niet ophalen. Was je al
          verbonden, dan is de koppeling verlopen of ingetrokken.
        </Melding>
      </div>
    );
  }

  if (dashboard.status === "fout") {
    return (
      <div className={styles.melding}>
        <Melding
          titel="Ophalen uit Orbit is mislukt"
          role="alert"
          actie={
            <form action={refreshData}>
              <button type="submit">Opnieuw proberen</button>
            </form>
          }
        >
          {dashboard.message}
        </Melding>
      </div>
    );
  }

  const tijd = formatTime(dashboard.fetchedAt);
  const zin = `Projecten uit Orbit opgehaald om ${tijd}. Verversen haalt Orbit, Jira en Superhuman opnieuw op.`;
  return (
    <div className={styles.sync}>
      <p className={styles.tijd} title={zin}>
        <span className={styles.punt} aria-hidden="true" />
        <span aria-hidden="true">Bijgewerkt {tijd}</span>
        <span className="visually-hidden">
          Projecten uit Orbit opgehaald om{" "}
          <time dateTime={dashboard.fetchedAt.toISOString()}>{tijd}</time>
        </span>
      </p>
      <form action={refreshData}>
        <VerversKnop opgehaald={dashboard.fetchedAt.toISOString()} />
      </form>
    </div>
  );
}
