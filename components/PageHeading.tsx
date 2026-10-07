import NextLink from "next/link";
import styles from "./PageHeading.module.css";

type Crumb = { label: string; href: string };

type Props = {
  title: string;
  crumbs?: Crumb[];
  /** Direct achter de titel, zoals een knop om te bewerken. */
  titelActie?: React.ReactNode;
  /** Rechts naast de titel, zoals de versheid van de data. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeading({
  title,
  crumbs = [],
  titelActie,
  aside,
  children,
}: Props) {
  return (
    <header className={styles.heading}>
      {crumbs.length > 0 && (
        <nav aria-label="Kruimelpad" className={styles.nav}>
          <ol className={styles.crumbs}>
            {crumbs.map((crumb) => (
              <li key={crumb.href}>
                <NextLink href={crumb.href}>{crumb.label}</NextLink>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {titelActie ? (
        <div className={styles.titelRij}>
          <h1 className={styles.title}>{title}</h1>
          {titelActie}
        </div>
      ) : (
        <h1 className={styles.title}>{title}</h1>
      )}
      {aside && <div className={styles.aside}>{aside}</div>}
      {children && <div className={styles.extra}>{children}</div>}
    </header>
  );
}
