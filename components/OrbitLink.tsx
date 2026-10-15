import type { Project } from "@/lib/dashboard";
import { orbitProjectUrl } from "@/lib/dashboard";
import { ExternalIcon } from "./icons";
import styles from "./Sectie.module.css";

/** Voetlink van een uitklap naar het project in Teamleader Orbit. */
export function OrbitLink({ project }: { project: Project }) {
  return (
    <a
      href={orbitProjectUrl(project.number)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalIcon className={styles.voetIcoon} />
      Meer in Teamleader Orbit
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}
