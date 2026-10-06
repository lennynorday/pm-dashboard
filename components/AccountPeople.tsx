import type { Contactpersoon } from "@/lib/accountgegevens";
import styles from "./AccountPeople.module.css";

type Props = {
  klant: string;
  pms: string[];
  am: string | null;
  contactpersonen: Contactpersoon[];
};

/** Klant, PM, AM en contactpersonen, compact onder de naam van het platform. */
export function AccountPeople({ klant, pms, am, contactpersonen }: Props) {
  return (
    <dl className={styles.people}>
      <div>
        <dt>Klant</dt>
        <dd>{klant}</dd>
      </div>
      <div>
        <dt>{pms.length > 1 ? "PM's" : "PM"}</dt>
        <dd>{pms.length > 0 ? pms.join(", ") : "Geen open projecten"}</dd>
      </div>
      <div>
        <dt>Accountmanager</dt>
        <dd>{am ?? "Nog niet ingevuld"}</dd>
      </div>
      <div>
        <dt>Contactpersonen</dt>
        <dd>
          {contactpersonen.length === 0 && "Nog niet ingevuld"}
          {contactpersonen.map((persoon, index) => (
            <span key={persoon.naam}>
              {index > 0 && ", "}
              {persoon.email ? (
                <a href={`mailto:${persoon.email}`}>{persoon.naam}</a>
              ) : (
                persoon.naam
              )}
              {persoon.rol && ` (${persoon.rol})`}
            </span>
          ))}
        </dd>
      </div>
    </dl>
  );
}
