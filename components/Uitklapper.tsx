"use client";

import NextLink from "next/link";
import { type ReactNode, useId, useState } from "react";
import { ChevronIcon } from "./icons";
import styles from "./Uitklapper.module.css";

/**
 * Een projectrij in drie kolommen: project, status en het budgetvlak.
 * De naam linkt naar het project; de chevron klapt uit en strekt zich met een
 * overlay over de rij uit, zodat ook een klik naast de naam uitklapt.
 * Zonder `children` is de rij niet uit te klappen.
 */
export function Uitklapper({
  titel,
  href,
  onder,
  status,
  rechts,
  children,
}: {
  titel: string;
  href: string;
  onder?: ReactNode;
  status?: ReactNode;
  rechts: ReactNode;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={styles.rij} data-open={open}>
      <div className={styles.kop}>
        <div className={styles.links}>
          {children !== undefined && (
            <button
              type="button"
              className={styles.knop}
              aria-expanded={open}
              aria-controls={id}
              aria-label={`Details van ${titel}`}
              onClick={() => setOpen(!open)}
            >
              <ChevronIcon className={styles.chevron} />
            </button>
          )}
          <NextLink href={href} className={styles.naam}>
            {titel}
          </NextLink>
          {onder && <div className={styles.onder}>{onder}</div>}
        </div>
        <div className={styles.status}>{status}</div>
        <div className={styles.vlak}>{rechts}</div>
      </div>
      {children !== undefined && (
        <div id={id} className={styles.uitklap} hidden={!open}>
          {children}
        </div>
      )}
    </div>
  );
}
