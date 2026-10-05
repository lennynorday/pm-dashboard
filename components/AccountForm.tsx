"use client";

import NextLink from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { FormState, FormWaarden } from "@/lib/account-form";
import { LINK_TYPE_LABELS, LINK_TYPES } from "@/lib/links";
import styles from "./AccountForm.module.css";

type Props = {
  action: (vorige: FormState, formData: FormData) => Promise<FormState>;
  /** Startwaarden, al met lege rijen om iets toe te voegen. */
  waarden: FormWaarden;
  orbitNaam: string;
  terugHref: string;
};

type VeldProps = {
  name: string;
  label: string;
  defaultValue: string;
  fout?: string;
  hint?: string;
  type?: "text" | "email" | "url";
  autoComplete?: string;
};

/** Eén invoerveld met label, hint en foutmelding die schermlezers voorlezen. */
function Veld({
  name,
  label,
  defaultValue,
  fout,
  hint,
  type = "text",
  autoComplete = "off",
}: VeldProps) {
  const beschrijving = [hint && `${name}-hint`, fout && `${name}-fout`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.veld}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={fout ? true : undefined}
        aria-describedby={beschrijving || undefined}
        className={styles.input}
      />
      {fout && (
        <p id={`${name}-fout`} className={styles.fout}>
          {fout}
        </p>
      )}
    </div>
  );
}

/** Formulier voor de accountgegevens die Orbit niet weet. */
export function AccountForm({ action, waarden, orbitNaam, terugHref }: Props) {
  const [state, formAction, bezig] = useActionState(action, null);
  const samenvatting = useRef<HTMLDivElement>(null);
  const huidig = state?.waarden ?? waarden;
  const fouten = state?.fouten ?? {};
  const foutLijst = Object.entries(fouten);

  // Na een mislukte poging gaat de focus naar het overzicht van de fouten.
  useEffect(() => {
    if (state) samenvatting.current?.focus();
  }, [state]);

  return (
    // De key zorgt dat de velden na een fout de ingevulde waarden houden.
    <form
      key={JSON.stringify(huidig)}
      action={formAction}
      className={styles.form}
      noValidate
    >
      {foutLijst.length > 0 && (
        <div
          ref={samenvatting}
          tabIndex={-1}
          role="alert"
          className={styles.samenvatting}
        >
          <h2 className={styles.samenvattingTitel}>
            Nog niet opgeslagen: controleer{" "}
            {foutLijst.length === 1 ? "dit veld" : "deze velden"}
          </h2>
          <ul>
            {foutLijst.map(([name, fout]) => (
              <li key={name}>
                <a href={`#${name}`}>{fout}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className={styles.groep}>
        <legend className={styles.legend}>Algemeen</legend>
        <Veld
          name="naam"
          label="Kortere naam"
          hint={`Laat leeg voor de naam uit Orbit: ${orbitNaam}`}
          defaultValue={huidig.naam}
          fout={fouten.naam}
        />
        <Veld
          name="am"
          label="Accountmanager"
          defaultValue={huidig.am}
          fout={fouten.am}
        />
      </fieldset>

      <fieldset className={styles.groep}>
        <legend className={styles.legend}>Jira en support</legend>
        <Veld
          name="jiraKeys"
          label="Jira-projecten"
          hint="Keys gescheiden door komma's, bijvoorbeeld CMU, CMU2"
          defaultValue={huidig.jiraKeys}
          fout={fouten.jiraKeys}
        />
        <Veld
          name="supportOrganizations"
          label="Organisaties in Beheer & Support"
          hint="Zoals in het veld Organizations in SUPP, gescheiden door komma's"
          defaultValue={huidig.supportOrganizations}
          fout={fouten.supportOrganizations}
        />
      </fieldset>

      <fieldset className={styles.groep}>
        <legend className={styles.legend}>Contactpersonen</legend>
        <p className={styles.hint}>
          Maak een rij leeg om een contactpersoon te verwijderen. Meer nodig?
          Sla op en open het formulier opnieuw.
        </p>
        <input
          type="hidden"
          name="contact-aantal"
          value={huidig.contactpersonen.length}
        />
        {huidig.contactpersonen.map((rij, index) => (
          <fieldset key={index} className={styles.rij}>
            <legend className={styles.rijLegend}>
              Contactpersoon {index + 1}
            </legend>
            <Veld
              name={`contact-${index}-naam`}
              label="Naam"
              defaultValue={rij.naam}
              fout={fouten[`contact-${index}-naam`]}
            />
            <Veld
              name={`contact-${index}-rol`}
              label="Rol"
              defaultValue={rij.rol}
              fout={fouten[`contact-${index}-rol`]}
            />
            <Veld
              name={`contact-${index}-email`}
              label="E-mail"
              type="email"
              defaultValue={rij.email}
              fout={fouten[`contact-${index}-email`]}
            />
          </fieldset>
        ))}
      </fieldset>

      <fieldset className={styles.groep}>
        <legend className={styles.legend}>Links</legend>
        <p className={styles.hint}>
          Maak een rij leeg om een link te verwijderen. Bij type Automatisch
          herkent het dashboard Slack, Superhuman, Jira en Drive aan de link.
        </p>
        <input type="hidden" name="link-aantal" value={huidig.links.length} />
        {huidig.links.map((rij, index) => (
          <fieldset key={index} className={styles.rij}>
            <legend className={styles.rijLegend}>Link {index + 1}</legend>
            <Veld
              name={`link-${index}-label`}
              label="Titel"
              defaultValue={rij.label}
              fout={fouten[`link-${index}-label`]}
            />
            <Veld
              name={`link-${index}-url`}
              label="Adres"
              type="url"
              defaultValue={rij.url}
              fout={fouten[`link-${index}-url`]}
            />
            <div className={styles.veld}>
              <label htmlFor={`link-${index}-type`} className={styles.label}>
                Type
              </label>
              <select
                id={`link-${index}-type`}
                name={`link-${index}-type`}
                defaultValue={rij.type}
                className={styles.input}
              >
                <option value="">Automatisch</option>
                {LINK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LINK_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        ))}
      </fieldset>

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
