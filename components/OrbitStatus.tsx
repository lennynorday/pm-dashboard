import { refreshData } from "@/app/actions";
import type { Dashboard } from "@/lib/dashboard";
import { formatTime } from "@/lib/format";
import styles from "./OrbitStatus.module.css";

type Props = { dashboard: Dashboard };

/** Toont wanneer de Orbit-data is opgehaald, of waarom dat niet lukte. */
export function OrbitStatus({ dashboard }: Props) {
  if (dashboard.status === "niet-verbonden") {
    return (
      <div className={styles.message} role="status">
        <p className={styles.text}>
          <span aria-hidden="true">⚠ </span>
          De app is niet verbonden met Teamleader Orbit. De links uit je config
          werken wel.
        </p>
        <a className={styles.button} href="/api/orbit/login">
          Inloggen bij Orbit
        </a>
      </div>
    );
  }

  if (dashboard.status === "fout") {
    return (
      <div className={styles.message} role="alert">
        <p className={styles.text}>
          <span aria-hidden="true">⚠ </span>
          Ophalen uit Orbit is mislukt: {dashboard.message}
        </p>
        <form action={refreshData}>
          <button className={styles.button} type="submit">
            Opnieuw proberen
          </button>
        </form>
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
