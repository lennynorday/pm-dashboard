import NextLink from "next/link";
import type { Project } from "@/lib/dashboard";
import { formatDate, PROJECT_STATE_LABELS } from "@/lib/format";
import { VisibilityButton } from "./VisibilityButton";
import styles from "./ProjectList.module.css";

type Props = { projecten: Project[] };

export function ProjectList({ projecten }: Props) {
  return (
    <ul className={styles.list}>
      {projecten.map((project) => (
        <li key={project.number} className={styles.item}>
          <div className={styles.main}>
            <NextLink
              href={`/projecten/${project.number}`}
              className={styles.name}
            >
              {project.naam}
            </NextLink>
            <p className={styles.meta}>
              <span>#{project.number}</span>
              <span>{PROJECT_STATE_LABELS[project.status]}</span>
              {project.einddatum && (
                <span>Eind {formatDate(project.einddatum)}</span>
              )}
              {project.jiraKeys.length > 0 && (
                <span>Jira {project.jiraKeys.join(", ")}</span>
              )}
            </p>
          </div>
          <VisibilityButton project={project} />
        </li>
      ))}
    </ul>
  );
}
