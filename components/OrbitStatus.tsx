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
          titel="Niet ingelogd bij Teamleader Orbit"
          actie={<a href="/api/orbit/login">Inloggen bij Orbit</a>}
        >
          Zonder Orbit kan het dashboard je projecten niet ophalen.
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
        Projecten uit Orbit opgehaald om{" "}
        <time dateTime={dashboard.fetchedAt.toISOString()}>
          {formatTime(dashboard.fetchedAt)}
        </time>
      </p>
      <form action={refreshData}>
        <button className={styles.button} type="submit">
          Alles opnieuw ophalen
        </button>
      </form>
    </div>
  );
}
