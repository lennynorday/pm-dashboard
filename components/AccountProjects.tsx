import type { Project } from "@/lib/dashboard";
import { orbitProjectUrl } from "@/lib/dashboard";
import { formatDate, PROJECT_STATE_LABELS } from "@/lib/format";
import { ExternalLink } from "./ExternalLink";
import { VisibilityButton } from "./VisibilityButton";
import styles from "./AccountProjects.module.css";

type Props = { projecten: Project[] };

/** Projecten van een account, elk als regel met een anker voor het zijmenu. */
export function AccountProjects({ projecten }: Props) {
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
            <VisibilityButton project={project} />
          </div>
          <p className={styles.meta}>
            <span>#{project.number}</span>
            <span>{PROJECT_STATE_LABELS[project.status]}</span>
            {project.einddatum && (
              <span>Eind {formatDate(project.einddatum)}</span>
            )}
          </p>
          <ul className={styles.links}>
            <li>
              <ExternalLink href={orbitProjectUrl(project.number)}>
                Openen in Orbit
              </ExternalLink>
            </li>
            {project.links.map((link) => (
              <li key={link.url}>
                <ExternalLink href={link.url}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
