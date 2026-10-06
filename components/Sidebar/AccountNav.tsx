import NextLink from "next/link";
import { NavAccount } from "@/lib/navigation";
import styles from "./Sidebar.module.css";

type Props = {
  accounts: NavAccount[];
  currentAccount: string | null;
};

export function AccountNav({ accounts, currentAccount }: Props) {
  return (
    <ul className={styles.list}>
      {accounts.map((account) => (
        <li key={account.slug}>
          <NextLink
            href={`/accounts/${account.slug}`}
            className={styles.item}
            aria-current={account.slug === currentAccount ? "page" : undefined}
          >
            <span className={styles.initials} aria-hidden="true">
              {account.initialen}
            </span>
            <span className={styles.label}>{account.naam}</span>
            <span className={styles.tooltip} aria-hidden="true">
              {account.naam}
            </span>
          </NextLink>
        </li>
      ))}
    </ul>
  );
}
