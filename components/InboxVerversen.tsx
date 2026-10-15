"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshIcon } from "./icons";
import orbit from "./OrbitStatus.module.css";
import styles from "./InboxVerversen.module.css";

/** Rendert de Inbox opnieuw; de pagina synchroniseert dan Slack en Gmail en toont zelf wat er misging. */
export function InboxVerversen() {
  const router = useRouter();
  const [bezig, startTransition] = useTransition();

  return (
    <button
      className={styles.knop}
      type="button"
      disabled={bezig}
      aria-busy={bezig}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshIcon className={`${orbit.icoon} ${bezig ? orbit.draait : ""}`} />
      {bezig ? "Ophalen…" : "Inbox verversen"}
    </button>
  );
}
