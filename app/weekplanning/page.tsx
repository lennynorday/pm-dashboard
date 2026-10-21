import styles from "./page.module.css";

/**
 * De weekplanning is een losse pagina zonder build (public/weekplanning/index.html).
 * Hier staat hij binnen het dashboard, zodat het menu blijft staan.
 * De planning zelf staat in de browser en in bestanden, niet in de database.
 */
export default function WeekplanningPage() {
  return (
    <iframe
      src="/weekplanning/index.html"
      title="Weekplanning"
      className={styles.frame}
      allow="clipboard-write"
    />
  );
}
