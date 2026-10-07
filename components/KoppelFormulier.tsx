"use client";

import NextLink from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { KoppelState } from "@/app/actions";
import type { KlantProject } from "@/lib/dashboard";
import { CheckIcon } from "./icons";
import styles from "./AccountForm.module.css";
import eigen from "./KoppelFormulier.module.css";

type Props = {
  action: (vorige: KoppelState, formData: FormData) => Promise<KoppelState>;
  projecten: KlantProject[];
  /** De namen van de platforms van de klant. */
  platforms: string[];
  terugHref: string;
};

function huidigeWaarde(project: KlantProject): string | undefined {
  if (project.zonderPlatform) return "geen";
  return project.platform === null ? undefined : `platform:${project.platform}`;
}

/** Per project van de klant: bij welk platform het hoort, of bij geen. */
export function KoppelFormulier({
  action,
  projecten,
  platforms,
  terugHref,
}: Props) {
  const [state, formAction, bezig] = useActionState(action, null);
  const melding = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state) melding.current?.focus();
  }, [state]);

  const keuzes = [
    ...platforms.map((naam) => ({ waarde: `platform:${naam}`, label: naam })),
    { waarde: "geen", label: "Geen platform" },
  ];

  return (
    <form action={formAction} className={`${styles.form} ${eigen.formulier}`}>
      {state && (
        <div
          ref={melding}
          tabIndex={-1}
          role="alert"
          className={styles.samenvatting}
        >
          <h2 className={styles.samenvattingTitel}>Nog niet opgeslagen</h2>
          <p>{state.fout}</p>
        </div>
      )}

      {projecten.map((project) => {
        const huidig = huidigeWaarde(project);
        return (
          <fieldset key={project.number} className={eigen.groep}>
            <legend className="visually-hidden">{project.naam}</legend>
            <div className={eigen.project}>
              <div>
                <p className={eigen.naam} aria-hidden="true">
                  {project.naam}
                </p>
                <p className={eigen.meta}>
                  {project.number}
                  {project.eigenaar && ` · ${project.eigenaar}`}
                  {huidig === undefined && (
                    <span className={eigen.los}> · hoort nog nergens bij</span>
                  )}
                </p>
              </div>
              <div className={eigen.segmenten}>
                {keuzes.map(({ waarde, label }) => (
                  <label key={waarde} className={eigen.segment}>
                    <input
                      type="radio"
                      name={`project-${project.number}`}
                      value={waarde}
                      defaultChecked={huidig === waarde}
                      className={eigen.radio}
                    />
                    <CheckIcon className={eigen.vinkje} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        );
      })}

      <div className={styles.acties}>
        <button type="submit" className={styles.opslaan} disabled={bezig}>
          {bezig ? "Bezig met opslaan" : "Opslaan"}
        </button>
        <NextLink href={terugHref} className={styles.annuleren}>
          Annuleren
        </NextLink>
      </div>
    </form>
  );
}
