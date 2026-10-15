import NextLink from "next/link";
import type { Platform } from "@/lib/dashboard";
import type { JiraResult, SupportOverzicht } from "@/lib/jira/overview";
import { ExternalIcon } from "./icons";
import styles from "./SupportKnop.module.css";
import { VerbindLink } from "./VerbindLink";

/** Lila knop naar de open supporttickets, of waarom die er niet is. */
export function SupportKnop({
  platform,
  support,
}: {
  platform: Platform;
  support: JiraResult<SupportOverzicht> | null;
}) {
  if (support === null) {
    return (
      <p className={styles.muted}>
        Geen Beheer &amp; Support gekoppeld ·{" "}
        <NextLink href={`/platforms/${platform.slug}/bewerken`}>
          Organization koppelen
        </NextLink>
      </p>
    );
  }
  if (support.status !== "ok") {
    return (
      <p className={styles.muted}>
        {support.status === "fout" ? (
          "Supporttickets konden niet worden opgehaald"
        ) : (
          <VerbindLink href="/api/jira/login">Verbinden met Jira</VerbindLink>
        )}
      </p>
    );
  }
  const { open } = support.data;
  return (
    <a
      href={open.url}
      className={styles.support}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.aantal}>{open.aantal}</span>
      {open.aantal === 1 ? "open supportticket" : "open supporttickets"}
      <ExternalIcon className={styles.icoon} />
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}
