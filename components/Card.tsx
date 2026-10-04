import styles from "./Card.module.css";

type Props = {
  title: React.ReactNode;
  headingLevel?: "h2" | "h3";
  children: React.ReactNode;
};

export function Card({ title, headingLevel = "h2", children }: Props) {
  const Heading = headingLevel;
  return (
    <section className={styles.card}>
      <Heading className={styles.title}>{title}</Heading>
      {children}
    </section>
  );
}
