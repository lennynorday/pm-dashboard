"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  ExternalIcon,
  HomeIcon,
  InboxIcon,
  MenuIcon,
  PanelIcon,
  TodoIcon,
} from "@/components/icons";
import type { NavAccount } from "@/lib/navigation";
import { MENU_COOKIE, MenuStand, Thema } from "@/lib/preferences";
import { AccountNav } from "./AccountNav";
import { setPreferenceCookie } from "./cookies";
import { ThemeSwitch } from "./ThemeSwitch";
import styles from "./Sidebar.module.css";

type Props = {
  accounts: NavAccount[];
  inboxUrl: string;
  todoUrl: string;
  initialStand: MenuStand;
  initialThema: Thema;
};

function currentAccount(pathname: string): string | null {
  return /^\/accounts\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

export function Sidebar({
  accounts,
  inboxUrl,
  todoUrl,
  initialStand,
  initialThema,
}: Props) {
  const pathname = usePathname();
  const current = currentAccount(pathname);
  const [stand, setStand] = useState<MenuStand>(initialStand);
  // Het mobiele menu is open voor de pagina waarop je het opende; navigeren sluit het.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const mobileOpen = openOn === pathname;
  const [tooltipsHidden, setTooltipsHidden] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileOpen)
      panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    // De inhoud achter het open menu is niet bereikbaar met Tab.
    document.getElementById("inhoud")?.toggleAttribute("inert", mobileOpen);
  }, [mobileOpen]);

  function closeMobile() {
    setOpenOn(null);
    menuButton.current?.focus();
  }

  // Een projectlink springt binnen dezelfde pagina; sluit dan ook het mobiele menu.
  function closeOnLinkClick(event: React.MouseEvent) {
    if (event.target instanceof Element && event.target.closest("a"))
      setOpenOn(null);
  }

  function toggleStand() {
    const next = stand === "ingeklapt" ? "uitgeklapt" : "ingeklapt";
    setStand(next);
    setPreferenceCookie(MENU_COOKIE, next);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Escape") return;
    setTooltipsHidden(true);
    if (mobileOpen) closeMobile();
  }

  const ingeklapt = stand === "ingeklapt";

  return (
    <div
      className={styles.sidebar}
      data-stand={stand}
      data-mobile-open={mobileOpen}
      data-tooltips-hidden={tooltipsHidden}
      onKeyDown={onKeyDown}
      onPointerMove={() => setTooltipsHidden(false)}
      onFocus={() => setTooltipsHidden(false)}
    >
      <div className={styles.topbar}>
        <NextLink href="/" className={styles.brand}>
          PM-dashboard
        </NextLink>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={mobileOpen}
          aria-controls="zijmenu"
          onClick={() => setOpenOn(mobileOpen ? null : pathname)}
        >
          <MenuIcon />
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div
          className={styles.backdrop}
          aria-hidden="true"
          onClick={closeMobile}
        />
      )}

      <div
        ref={panel}
        id="zijmenu"
        className={styles.panel}
        onClick={closeOnLinkClick}
      >
        <div className={styles.panelHeader}>
          <NextLink href="/" className={styles.brandPanel}>
            <span className={styles.brandShort} aria-hidden="true">
              PM
            </span>
            <span className={styles.label}>PM-dashboard</span>
          </NextLink>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeMobile}
          >
            <CloseIcon />
            <span className="visually-hidden">Menu sluiten</span>
          </button>
        </div>

        <nav aria-label="Hoofdmenu" className={styles.section}>
          <ul className={styles.list}>
            <li>
              <NextLink
                href="/"
                className={styles.item}
                aria-current={pathname === "/" ? "page" : undefined}
              >
                <HomeIcon />
                <span className={styles.label}>Overzicht</span>
                <span className={styles.tooltip} aria-hidden="true">
                  Overzicht
                </span>
              </NextLink>
            </li>
            <li>
              <a
                href={inboxUrl}
                className={styles.item}
                target="_blank"
                rel="noopener noreferrer"
              >
                <InboxIcon />
                <span className={styles.label}>Inbox</span>
                <ExternalIcon className={styles.external} />
                <span className="visually-hidden">
                  {" "}
                  (opent in nieuw tabblad)
                </span>
                <span className={styles.tooltip} aria-hidden="true">
                  Inbox
                </span>
              </a>
            </li>
            <li>
              <a
                href={todoUrl}
                className={styles.item}
                target="_blank"
                rel="noopener noreferrer"
              >
                <TodoIcon />
                <span className={styles.label}>To-do&apos;s</span>
                <ExternalIcon className={styles.external} />
                <span className="visually-hidden">
                  {" "}
                  (opent in nieuw tabblad)
                </span>
                <span className={styles.tooltip} aria-hidden="true">
                  To-do&apos;s
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Accounts" className={styles.section}>
          <h2 className={styles.sectionTitle}>Accounts</h2>
          {accounts.length === 0 && (
            <p className={styles.empty}>Geen accounts geladen.</p>
          )}
          <AccountNav accounts={accounts} currentAccount={current} />
        </nav>

        <div className={styles.footer}>
          <ThemeSwitch initialThema={initialThema} />
          <button
            type="button"
            className={styles.collapse}
            onClick={toggleStand}
          >
            <PanelIcon />
            <span className={styles.label}>
              {ingeklapt ? "Menu uitklappen" : "Menu inklappen"}
            </span>
            <span className={styles.tooltip} aria-hidden="true">
              {ingeklapt ? "Menu uitklappen" : "Menu inklappen"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
