import { ExternalIcon } from "./icons";
import styles from "./ExternalLink.module.css";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Link die in een nieuw tabblad opent en dat ook zegt tegen screenreaders. */
export function ExternalLink({ href, className, children }: Props) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalIcon className={styles.icoon} />
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}
