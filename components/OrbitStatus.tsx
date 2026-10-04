import { refreshData } from "@/app/actions";
import type { Dashboard } from "@/lib/dashboard";
import { formatTime } from "@/lib/format";
import { Melding } from "./Melding";
import styles from "./OrbitStatus.module.css";

type Props = { dashboard: Dashboard };

/** Toont wanneer de Orbit-data is opgehaald, of waarom dat niet lukte. */
export function OrbitStatus({ dashboard }: Props) {
  if (dashboard.status === "niet-verbonden") {
    return (
      <div className={styles.melding}>
        <Melding
          titel="Niet verbonden met Teamleader Orbit"
          actie={<a href="/api/orbit/login">Inloggen bij Orbit</a>}
        >
          De links uit je config werken wel.
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

  return (
    <div className={styles.status}>
      <p className={styles.text}>
        Orbit opgehaald om{" "}
        <time dateTime={dashboard.fetchedAt.toISOString()}>
          {formatTime(dashboard.fetchedAt)}
        </time>
      </p>
      <form action={refreshData}>
        <button className={styles.button} type="submit">
          Verversen
        </button>
      </form>
    </div>
  );
}
