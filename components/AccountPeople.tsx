import type { Contactpersoon } from "@/lib/accountgegevens";
import styles from "./AccountPeople.module.css";

type Props = {
  am: string | null;
  contactpersonen: Contactpersoon[];
};

/** AM en contactpersonen, compact onder de naam van het account. */
export function AccountPeople({ am, contactpersonen }: Props) {
  return (
    <dl className={styles.people}>
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
