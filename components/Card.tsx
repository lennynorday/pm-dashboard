import styles from "./Card.module.css";

type Props = {
  title: React.ReactNode;
  headingLevel?: "h2" | "h3";
  accent?: boolean;
  children: React.ReactNode;
};

export function Card({
  title,
  headingLevel = "h2",
  accent = false,
  children,
}: Props) {
  const Heading = headingLevel;
  return (
    <section
      className={accent ? `${styles.card} ${styles.accent}` : styles.card}
    >
      <Heading className={styles.title}>{title}</Heading>
      {children}
    </section>
  );
}
