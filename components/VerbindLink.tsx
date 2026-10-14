"use client";

import { useEffect, useState } from "react";
import { RefreshIcon } from "./icons";
import orbit from "./OrbitStatus.module.css";
import styles from "./VerbindLink.module.css";

type Props = { href: string; className?: string; children: React.ReactNode };

/** Link naar een OAuth-login, met een draaiend icoon vanaf de klik tot de pagina wegnavigeert. */
export function VerbindLink({ href, className, children }: Props) {
  const [bezig, setBezig] = useState(false);

  // Terug via de browserknop herstelt de pagina uit de cache met de oude state.
  useEffect(() => {
    const reset = () => setBezig(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <a
      href={href}
      className={`${styles.link} ${className ?? ""}`}
      aria-busy={bezig}
      onClick={() => setBezig(true)}
    >
      {bezig && <RefreshIcon className={`${orbit.icoon} ${orbit.draait}`} />}
      {children}
    </a>
  );
}
