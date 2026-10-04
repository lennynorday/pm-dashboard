"use client";

import NextLink from "next/link";
import { useState } from "react";
import { ChevronIcon } from "@/components/icons";
import type { NavAccount } from "@/lib/navigation";
import styles from "./Sidebar.module.css";

type Props = {
  accounts: NavAccount[];
  currentAccount: string | null;
  currentProject: string | null;
};

export function AccountNav({
  accounts,
  currentAccount,
  currentProject,
}: Props) {
  const [open, setOpen] = useState<string[]>(
    currentAccount ? [currentAccount] : [],
  );

  function toggle(slug: string) {
    setOpen((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  return (
    <ul className={styles.list}>
      {accounts.map((account) => {
        const expanded =
          open.includes(account.slug) || account.slug === currentAccount;
        const isCurrent =
          account.slug === currentAccount && currentProject === null;
        const listId = `projecten-${account.slug}`;
        return (
          <li key={account.slug}>
            <div className={styles.accountRow}>
              <NextLink
                href={`/accounts/${account.slug}`}
                className={styles.item}
                aria-current={isCurrent ? "page" : undefined}
              >
                <span className={styles.initials} aria-hidden="true">
                  {account.initialen}
                </span>
                <span className={styles.label}>{account.naam}</span>
                <span className={styles.tooltip} aria-hidden="true">
                  {account.naam}
                </span>
              </NextLink>
              <button
                type="button"
                className={styles.expand}
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => toggle(account.slug)}
              >
                <ChevronIcon />
                <span className="visually-hidden">
                  Projecten van {account.naam}
                </span>
              </button>
            </div>
            {expanded && (
              <ul id={listId} className={styles.projects}>
                {account.projecten.map((project) => (
                  <li key={project.number}>
                    <NextLink
                      href={`/projecten/${project.number}`}
                      className={styles.project}
                      aria-current={
                        project.number === currentProject ? "page" : undefined
                      }
                    >
                      {project.naam}
                    </NextLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
