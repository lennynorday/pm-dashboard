"use client";

import { type ReactNode, useId, useState } from "react";
import { ChevronIcon } from "./icons";
import styles from "./Uitklapper.module.css";

/**
 * Een rij die uitklapt. Anders dan details/summary mag `onder` links bevatten:
 * de knop zit alleen om de titel en strekt zich met een overlay over de rij uit.
 * Zonder `children` is de rij niet uit te klappen.
 */
export function Uitklapper({
  titel,
  onder,
  rechts,
  children,
}: {
  titel: ReactNode;
  onder?: ReactNode;
  rechts: ReactNode;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={styles.rij} data-open={open}>
      <div className={styles.kop}>
        {children === undefined ? (
          <span className={`${styles.knop} ${styles.vast}`}>{titel}</span>
        ) : (
          <button
            type="button"
            className={styles.knop}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            <ChevronIcon className={styles.chevron} />
            {titel}
          </button>
        )}
        {onder && <div className={styles.onder}>{onder}</div>}
        <div className={styles.rechts}>{rechts}</div>
      </div>
      {children !== undefined && (
        <div id={id} hidden={!open}>
          {children}
        </div>
      )}
    </div>
  );
}
