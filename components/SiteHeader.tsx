import NextLink from "next/link";
import { config } from "@/config/accounts";
import { ExternalLink } from "./ExternalLink";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NextLink href="/" className={styles.home}>
          PM-dashboard
        </NextLink>
        <nav aria-label="Snelkoppelingen">
          <ul className={styles.shortcuts}>
            <li>
              <ExternalLink
                href={config.links.inbox}
                className={styles.shortcut}
              >
                Inbox
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={config.links.todo}
                className={styles.shortcut}
              >
                To-do&apos;s
              </ExternalLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
