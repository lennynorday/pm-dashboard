import { hideProjectAction, showProjectAction } from "@/app/actions";
import type { Project } from "@/lib/dashboard";

type Props = { project: Project };

/** Knop om een project te verbergen of terug te zetten. */
export function VisibilityButton({ project }: Props) {
  const hidden = project.zichtbaarheid === "verborgen";
  return (
    <form action={hidden ? showProjectAction : hideProjectAction}>
      <input type="hidden" name="projectnummer" value={project.number} />
      <button
        type="submit"
        className="nd-button nd-button--quiet nd-button--small"
      >
        {hidden ? "Weer tonen" : "Verbergen"}
        <span className="nd-visually-hidden">: {project.naam}</span>
      </button>
    </form>
  );
}
