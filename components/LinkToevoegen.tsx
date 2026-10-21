"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { LinkState } from "@/app/actions";
import { PlusIcon } from "./icons";
import styles from "./LinkGroepen.module.css";

type Props = {
  action: (vorige: LinkState, formData: FormData) => Promise<LinkState>;
  /** Een vast linktype, zoals Figma: dan alleen een adres. Zonder: een eigen link met naam. */
  linktype?: string;
};

/** Knop die een klein formulier opent voor een link: adres, en bij een eigen link ook een naam. */
export function LinkToevoegen({ action, linktype }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, bezig] = useActionState(
    async (vorige: LinkState, formData: FormData) => {
      const uitkomst = await action(vorige, formData);
      // Gelukt: de link staat nu in de lijst, dus het formulier kan dicht.
      if (uitkomst === null) setOpen(false);
      return uitkomst;
    },
    null,
  );
  const eerste = useRef<HTMLInputElement>(null);
  const id = useId();
  const knop = useRef<HTMLButtonElement>(null);
  const fouten = state?.fouten ?? {};

  useEffect(() => {
    if (open) eerste.current?.focus();
  }, [open, state]);

  function sluit() {
    setOpen(false);
    knop.current?.focus();
  }

  if (!open) {
    return (
      <button
        ref={knop}
        type="button"
        className="nd-chip"
        aria-expanded="false"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className={styles.plus} />
        {linktype ?? "Link toevoegen"}
        {linktype && <span className="visually-hidden"> toevoegen</span>}
      </button>
    );
  }

  return (
    // De key zet de velden na een fout terug op wat er was ingevuld.
    <form
      key={JSON.stringify(state)}
      action={formAction}
      className={styles.formulier}
      aria-label={linktype ? `${linktype} toevoegen` : "Eigen link toevoegen"}
      noValidate
    >
      {fouten.opslaan && (
        <p role="alert" className="nd-error">
          {fouten.opslaan}
        </p>
      )}
      {!linktype && (
        <>
          <label className="nd-label">
            Naam
            <input
              ref={eerste}
              name="naam"
              autoComplete="off"
              placeholder="Bijvoorbeeld Statuspagina"
              defaultValue={state?.waarden.naam}
              aria-invalid={fouten.naam ? true : undefined}
              aria-describedby={fouten.naam ? `${id}-naam-fout` : undefined}
              className={`nd-field ${styles.input}`}
            />
          </label>
          {fouten.naam && (
            <p id={`${id}-naam-fout`} className="nd-error">
              {fouten.naam}
            </p>
          )}
        </>
      )}
      <label className="nd-label">
        Adres
        <input
          ref={linktype ? eerste : undefined}
          name="url"
          type="url"
          autoComplete="off"
          placeholder="https://"
          defaultValue={state?.waarden.url}
          aria-invalid={fouten.url ? true : undefined}
          aria-describedby={fouten.url ? `${id}-url-fout` : undefined}
          className={`nd-field ${styles.input}`}
        />
      </label>
      {fouten.url && (
        <p id={`${id}-url-fout`} className="nd-error">
          {fouten.url}
        </p>
      )}
      <div className={styles.knoppen}>
        <button
          type="submit"
          className="nd-button nd-button--small"
          disabled={bezig}
        >
          {bezig ? "Bezig met opslaan" : "Opslaan"}
        </button>
        <button
          type="button"
          className="nd-button nd-button--quiet nd-button--small"
          onClick={sluit}
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
