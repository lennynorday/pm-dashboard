import NextLink from "next/link";
import styles from "./PageHeading.module.css";

type Crumb = { label: string; href: string };

type Props = {
  title: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
};

export function PageHeading({ title, crumbs = [], children }: Props) {
  return (
    <div className={styles.heading}>
      {crumbs.length > 0 && (
        <nav aria-label="Kruimelpad">
          <ol className={styles.crumbs}>
            {crumbs.map((crumb) => (
              <li key={crumb.href}>
                <NextLink href={crumb.href}>{crumb.label}</NextLink>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1 className={styles.title}>{title}</h1>
      {children}
    </div>
  );
}
