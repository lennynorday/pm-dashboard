import type { Project } from "@/lib/dashboard";
import { orbitProjectUrl } from "@/lib/dashboard";
import { formatDate, formatUren, PROJECT_STATE_LABELS } from "@/lib/format";
import { plafond, type ProjectBudgetResult } from "@/lib/orbit/budget";
import { ExternalLink } from "./ExternalLink";
import { VisibilityButton } from "./VisibilityButton";
import styles from "./AccountProjects.module.css";
import knop from "./VisibilityButton.module.css";

type Props = {
  projecten: Project[];
  /** Per projectnummer; zonder budget staat er geen urenregel. */
  budgetten?: Record<string, ProjectBudgetResult>;
  /** Alleen bij een klant met meer platforms: haalt een project van dit platform af. */
  ontkoppel?: (formData: FormData) => Promise<void>;
};

function Budget({ budget }: { budget: ProjectBudgetResult | undefined }) {
  if (budget?.status !== "ok") return null;
  const { minuten, soort } = plafond(budget.data);
  if (minuten === 0) return null;
  const geschreven = budget.data.geschreven;
  return (
    <span>
      {formatUren(geschreven)} van {formatUren(minuten)} uur {soort} (
      {Math.round((geschreven / minuten) * 100)}%)
    </span>
  );
}

/** Projecten van een platform, elk als regel met een anker voor het zijmenu. */
export function AccountProjects({
  projecten,
  budgetten = {},
  ontkoppel,
}: Props) {
  return (
    <ul className={styles.list}>
      {projecten.map((project) => (
        <li
          key={project.number}
          id={`project-${project.number}`}
          className={styles.project}
        >
          <div className={styles.header}>
            <h3 className={styles.name}>{project.naam}</h3>
            <div className={styles.knoppen}>
              {ontkoppel && (
                <form action={ontkoppel}>
                  <input
                    type="hidden"
                    name="projectnummer"
                    value={project.number}
                  />
                  <button type="submit" className={knop.button}>
                    Ontkoppelen
                    <span className="visually-hidden">: {project.naam}</span>
                  </button>
                </form>
              )}
              <VisibilityButton project={project} />
            </div>
          </div>
          <p className={styles.meta}>
            <span>Projectnummer {project.number}</span>
            <span>
              Status {PROJECT_STATE_LABELS[project.status].toLowerCase()}
            </span>
            {project.einddatum && (
              <span>Loopt tot {formatDate(project.einddatum)}</span>
            )}
            <Budget budget={budgetten[project.number]} />
          </p>
          <ul className={styles.links}>
            <li>
              <ExternalLink href={orbitProjectUrl(project.number)}>
                Project in Orbit
              </ExternalLink>
            </li>
          </ul>
        </li>
      ))}
    </ul>
  );
}
