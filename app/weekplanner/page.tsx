import styles from "./page.module.css";

/**
 * De weekplanner is een losse pagina zonder build (public/weekplanner/index.html).
 * Hier staat hij binnen het dashboard, zodat het menu blijft staan.
 * De planning zelf staat in de browser en in bestanden, niet in de database.
 */
export default function WeekplannerPage() {
  return (
    <iframe
      src="/weekplanner/index.html"
      title="Weekplanner"
      className={styles.frame}
      allow="clipboard-write"
    />
  );
}
