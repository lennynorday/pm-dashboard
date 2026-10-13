"use client";

import { useEffect } from "react";
import { synchroniseerInboxAction } from "@/app/actions";

const ELKE_MS = 5 * 60 * 1000;

/** Houdt de teller van de Inbox bij zolang het dashboard openstaat; toont zelf niets. */
export function InboxSync() {
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void synchroniseerInboxAction();
    }, ELKE_MS);
    return () => clearInterval(timer);
  }, []);
  return null;
}
