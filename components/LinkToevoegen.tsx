"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { LinkState } from "@/app/actions";
import { PlusIcon } from "./icons";
import styles from "./LinkGroepen.module.css";

type Props = {
  action: (vorige: LinkState, formData: FormData) => Promise<LinkState>;
};

/** Knop die een klein formulier opent voor een eigen link: naam en adres. */
export function LinkToevoegen({ action }: Props) {
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
  const naam = useRef<HTMLInputElement>(null);
  const knop = useRef<HTMLButtonElement>(null);
  const fouten = state?.fouten ?? {};

  useEffect(() => {
    if (open) naam.current?.focus();
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
        className={styles.toevoegen}
        aria-expanded="false"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className={styles.plus} />
        Link toevoegen
      </button>
    );
  }

  return (
    // De key zet de velden na een fout terug op wat er was ingevuld.
    <form
      key={JSON.stringify(state)}
      action={formAction}
      className={styles.formulier}
      aria-label="Eigen link toevoegen"
      noValidate
    >
      {fouten.opslaan && (
        <p role="alert" className={styles.fout}>
          {fouten.opslaan}
        </p>
      )}
      <label className={styles.label}>
        Naam
        <input
          ref={naam}
          name="naam"
          autoComplete="off"
          placeholder="Bijvoorbeeld Statuspagina"
          defaultValue={state?.waarden.naam}
          aria-invalid={fouten.naam ? true : undefined}
          aria-describedby={fouten.naam ? "eigen-naam-fout" : undefined}
          className={styles.input}
        />
      </label>
      {fouten.naam && (
        <p id="eigen-naam-fout" className={styles.fout}>
          {fouten.naam}
        </p>
      )}
      <label className={styles.label}>
        Adres
        <input
          name="url"
          type="url"
          autoComplete="off"
          placeholder="https://"
          defaultValue={state?.waarden.url}
          aria-invalid={fouten.url ? true : undefined}
          aria-describedby={fouten.url ? "eigen-url-fout" : undefined}
          className={styles.input}
        />
      </label>
      {fouten.url && (
        <p id="eigen-url-fout" className={styles.fout}>
          {fouten.url}
        </p>
      )}
      <div className={styles.knoppen}>
        <button type="submit" className={styles.opslaan} disabled={bezig}>
          {bezig ? "Bezig met opslaan" : "Opslaan"}
        </button>
        <button type="button" className={styles.annuleren} onClick={sluit}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
