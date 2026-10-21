import type { Contactpersoon } from "@/lib/accountgegevens";
import { initialen } from "@/lib/navigation";
import styles from "./AccountPeople.module.css";

type Props = {
  klant: string;
  pms: string[];
  am: string | null;
  contactpersonen: Contactpersoon[];
};

function Persoon({
  naam,
  rol,
  email,
  klant,
}: {
  naam: string;
  rol?: string;
  email?: string;
  klant?: boolean;
}) {
  return (
    <li className={styles.persoon}>
      <span
        className="nd-avatar"
        data-tint={klant ? "yellow" : undefined}
        aria-hidden="true"
      >
        {initialen(naam)}
      </span>
      <span>
        <span className="nd-row__title">
          {email ? <a href={`mailto:${email}`}>{naam}</a> : naam}
        </span>
        {rol && <span className={`nd-meta ${styles.rol}`}>{rol}</span>}
      </span>
    </li>
  );
}

/** PM, AM en de contactpersonen van de klant, in de zijkolom van de platformpagina. */
export function AccountPeople({ klant, pms, am, contactpersonen }: Props) {
  return (
    <section className="nd-card" aria-labelledby="mensen">
      <div className="nd-card__head">
        <h2 id="mensen" className="nd-title">
          Mensen
        </h2>
      </div>
      <div className="nd-rows">
        <div className={`nd-row ${styles.groep}`}>
          <h3 className="nd-eyebrow">Norday</h3>
          <ul className={styles.lijst}>
            {pms.length === 0 && (
              <li className="nd-meta">Geen PM: geen open projecten</li>
            )}
            {pms.map((pm) => (
              <Persoon key={pm} naam={pm} rol="PM" />
            ))}
            {am ? (
              <Persoon naam={am} rol="Accountmanager" />
            ) : (
              <li className="nd-meta">Accountmanager nog niet ingevuld</li>
            )}
          </ul>
        </div>
        <div className={`nd-row ${styles.groep}`}>
          <h3 className="nd-eyebrow">{klant}</h3>
          <ul className={styles.lijst}>
            {contactpersonen.length === 0 && (
              <li className="nd-meta">Contactpersonen nog niet ingevuld</li>
            )}
            {contactpersonen.map((persoon) => (
              <Persoon
                key={persoon.naam}
                naam={persoon.naam}
                rol={persoon.rol}
                email={persoon.email}
                klant
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
