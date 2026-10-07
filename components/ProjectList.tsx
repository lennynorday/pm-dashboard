import NextLink from "next/link";
import type { Project } from "@/lib/dashboard";
import { formatDate, PROJECT_STATE_LABELS } from "@/lib/format";
import { projectHref } from "@/lib/navigation";
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
              href={projectHref(project.platformSlug, project.number)}
              className={styles.name}
            >
              {project.naam}
            </NextLink>
            <p className={styles.meta}>
              <span>Projectnummer {project.number}</span>
              <span>
                Status {PROJECT_STATE_LABELS[project.status].toLowerCase()}
              </span>
              {project.einddatum && (
                <span>Loopt tot {formatDate(project.einddatum)}</span>
              )}
              {project.jiraKeys.length > 0 && (
                <span>Jira-project {project.jiraKeys.join(", ")}</span>
              )}
            </p>
          </div>
          <VisibilityButton project={project} />
        </li>
      ))}
    </ul>
  );
}
