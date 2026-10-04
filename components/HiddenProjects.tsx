import type { Project } from "@/lib/dashboard";
import { ProjectList } from "./ProjectList";
import styles from "./HiddenProjects.module.css";

type Props = { projecten: Project[] };

export function HiddenProjects({ projecten }: Props) {
  if (projecten.length === 0) return null;
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        Verborgen projecten ({projecten.length})
      </summary>
      <ProjectList projecten={projecten} />
    </details>
  );
}
