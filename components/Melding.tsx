import { AlertIcon } from "./icons";
import styles from "./Melding.module.css";

type Props = {
  titel: string;
  children?: React.ReactNode;
  /** Een knop of link om de melding op te lossen. */
  actie?: React.ReactNode;
  /** "alert" voor fouten die direct aandacht vragen, anders "status". */
  role?: "status" | "alert";
};

/** Melding die aandacht vraagt, in Norday-geel met icoon en titel. */
export function Melding({ titel, children, actie, role = "status" }: Props) {
  return (
    <div className={styles.melding} role={role}>
      <span className={styles.icoon}>
        <AlertIcon />
      </span>
      <div className={styles.tekst}>
        <p className={styles.titel}>{titel}</p>
        {children && <p className={styles.uitleg}>{children}</p>}
      </div>
      {actie && <div className={styles.actie}>{actie}</div>}
    </div>
  );
}
