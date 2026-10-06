"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronIcon,
  CloseIcon,
  ExternalIcon,
  HomeIcon,
  InboxIcon,
  LogoutIcon,
  MenuIcon,
  PanelIcon,
  TodoIcon,
} from "@/components/icons";
import { logoutAction } from "@/app/actions";
import { initialen, NavAccount } from "@/lib/navigation";
import {
  GroepStand,
  MENU_COOKIE,
  MenuStand,
  OVERIGE_COOKIE,
} from "@/lib/preferences";
import type { Gebruiker } from "@/lib/session";
import { AccountNav } from "./AccountNav";
import { setPreferenceCookie } from "./cookies";
import styles from "./Sidebar.module.css";

type Props = {
  accounts: NavAccount[];
  inboxUrl: string;
  todoUrl: string;
  initialStand: MenuStand;
  initialOverige: GroepStand;
  user: Gebruiker;
};

function currentAccount(pathname: string): string | null {
  return /^\/platforms\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

export function Sidebar({
  accounts,
  inboxUrl,
  todoUrl,
  initialStand,
  initialOverige,
  user,
}: Props) {
  const pathname = usePathname();
  const current = currentAccount(pathname);
  const [stand, setStand] = useState<MenuStand>(initialStand);
  const mijn = accounts.filter((account) => account.mijn);
  const overige = accounts.filter((account) => !account.mijn);
  // Open als ik het zo had achtergelaten, of als ik op een van deze accounts ben.
  const [overigeOpen, setOverigeOpen] = useState(
    initialOverige === "open" ||
      overige.some((account) => account.slug === current),
  );
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

  // Een link naar de pagina waar je al bent navigeert niet; sluit dan ook het mobiele menu.
  function closeOnLinkClick(event: React.MouseEvent) {
    if (event.target instanceof Element && event.target.closest("a"))
      setOpenOn(null);
  }

  function toggleStand() {
    const next = stand === "ingeklapt" ? "uitgeklapt" : "ingeklapt";
    setStand(next);
    setPreferenceCookie(MENU_COOKIE, next);
  }

  function toggleOverige() {
    const next = !overigeOpen;
    setOverigeOpen(next);
    setPreferenceCookie(OVERIGE_COOKIE, next ? "open" : "dicht");
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

        <NextLink
          href="/instellingen"
          className={styles.user}
          aria-current={pathname === "/instellingen" ? "page" : undefined}
        >
          {user.foto ? (
            // Een kleine profielfoto van Google; next/image voegt hier niets toe.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.avatar}
              src={user.foto}
              alt=""
              width={40}
              height={40}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              {initialen(user.naam)}
            </span>
          )}
          <span className={styles.label}>
            <span className={styles.welkom}>
              Welkom terug, {user.voornaam}!
            </span>
            <span className={styles.email}>{user.email}</span>
            <span className="visually-hidden">, naar instellingen</span>
          </span>
          <span className={styles.tooltip} aria-hidden="true">
            {user.naam}, instellingen
          </span>
        </NextLink>

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
                <span className={styles.label}>Gmail-inbox</span>
                <ExternalIcon className={styles.external} />
                <span className="visually-hidden">
                  {" "}
                  (opent in nieuw tabblad)
                </span>
                <span className={styles.tooltip} aria-hidden="true">
                  Gmail-inbox
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
                <span className={styles.label}>To-do&apos;s in Superhuman</span>
                <ExternalIcon className={styles.external} />
                <span className="visually-hidden">
                  {" "}
                  (opent in nieuw tabblad)
                </span>
                <span className={styles.tooltip} aria-hidden="true">
                  To-do&apos;s in Superhuman
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Accounts" className={styles.section}>
          <h2 className={styles.sectionTitle}>Mijn platforms</h2>
          {mijn.length === 0 && (
            <p className={styles.empty}>Geen platforms uit Orbit geladen.</p>
          )}
          <AccountNav accounts={mijn} currentAccount={current} />

          {overige.length > 0 && (
            <>
              <h2 className={styles.groupTitle}>
                <button
                  type="button"
                  className={styles.groupToggle}
                  aria-expanded={overigeOpen}
                  aria-controls="overige-platforms"
                  onClick={toggleOverige}
                >
                  <ChevronIcon />
                  <span className={styles.label}>
                    Overige Culture-platforms ({overige.length})
                  </span>
                  <span className={styles.tooltip} aria-hidden="true">
                    Overige Culture-platforms
                  </span>
                </button>
              </h2>
              <div id="overige-platforms" hidden={!overigeOpen}>
                <AccountNav accounts={overige} currentAccount={current} />
              </div>
            </>
          )}
        </nav>

        <div className={styles.footer}>
          <form action={logoutAction}>
            <button type="submit" className={styles.logout}>
              <LogoutIcon />
              <span className={styles.label}>Uitloggen</span>
              <span className={styles.tooltip} aria-hidden="true">
                Uitloggen
              </span>
            </button>
          </form>
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
