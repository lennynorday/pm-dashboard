"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  ChevronIcon,
  CloseIcon,
  HomeIcon,
  InboxIcon,
  LogoutIcon,
  MenuIcon,
  TodoIcon,
} from "@/components/icons";
import { logoutAction } from "@/app/actions";
import { initialen, NavPlatform } from "@/lib/navigation";
import {
  GroepStand,
  MENU_COOKIE,
  MenuStand,
  OVERIGE_COOKIE,
} from "@/lib/preferences";
import type { Gebruiker } from "@/lib/session";
import { NordayLogo } from "../NordayLogo";
import { PlatformNav } from "./PlatformNav";
import { setPreferenceCookie } from "./cookies";
import styles from "./Sidebar.module.css";

type Props = {
  platforms: NavPlatform[];
  initialStand: MenuStand;
  initialOverige: GroepStand;
  user: Gebruiker;
  telling: { inbox: number; open: number };
};

function currentPlatform(pathname: string): string | null {
  return /^\/platforms\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

export function Sidebar({
  platforms,
  initialStand,
  initialOverige,
  user,
  telling,
}: Props) {
  const pathname = usePathname();
  const current = currentPlatform(pathname);
  const [stand, setStand] = useState<MenuStand>(initialStand);
  const mijn = platforms.filter((platform) => platform.mijn);
  const overige = platforms.filter((platform) => !platform.mijn);
  // Open als ik het zo had achtergelaten, of als ik op een van deze platforms ben.
  const [overigeOpen, setOverigeOpen] = useState(
    initialOverige === "open" ||
      overige.some((platform) => platform.slug === current),
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
          <NordayLogo className={styles.logo} />
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
            <NordayLogo className={styles.logo} />
            <span className={styles.label}>PM-dashboard</span>
          </NextLink>
          <button
            type="button"
            className={styles.collapse}
            aria-expanded={!ingeklapt}
            aria-controls="zijmenu"
            onClick={toggleStand}
          >
            <ChevronIcon />
            <span className="nd-visually-hidden">
              {ingeklapt ? "Menu uitklappen" : "Menu inklappen"}
            </span>
            <span className={styles.tooltip} aria-hidden="true">
              {ingeklapt ? "Menu uitklappen" : "Menu inklappen"}
            </span>
          </button>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeMobile}
          >
            <CloseIcon />
            <span className="nd-visually-hidden">Menu sluiten</span>
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
            <span className="nd-visually-hidden">, naar instellingen</span>
          </span>
          <span className={styles.tooltip} aria-hidden="true">
            {user.naam}, instellingen
          </span>
        </NextLink>

        <nav aria-label="Hoofdmenu" className={styles.section}>
          <ul className="nd-nav__section">
            <li>
              <NextLink
                href="/"
                className={`nd-nav__item ${styles.item}`}
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
              <NextLink
                href="/inbox"
                className={`nd-nav__item ${styles.item}`}
                aria-current={pathname === "/inbox" ? "page" : undefined}
              >
                <InboxIcon />
                <span className={styles.label}>Inbox</span>
                {telling.inbox > 0 && (
                  <span className={`nd-badge ${styles.count}`}>
                    {telling.inbox}
                  </span>
                )}
                <span className={styles.tooltip} aria-hidden="true">
                  Inbox
                </span>
              </NextLink>
            </li>
            <li>
              <NextLink
                href="/todos"
                className={`nd-nav__item ${styles.item}`}
                aria-current={pathname === "/todos" ? "page" : undefined}
              >
                <TodoIcon />
                <span className={styles.label}>To-do&apos;s</span>
                {telling.open > 0 && (
                  <span className={`nd-badge ${styles.count}`}>
                    {telling.open}
                  </span>
                )}
                <span className={styles.tooltip} aria-hidden="true">
                  To-do&apos;s
                </span>
              </NextLink>
            </li>
            <li>
              <NextLink
                href="/weekplanner"
                className={`nd-nav__item ${styles.item}`}
                aria-current={pathname === "/weekplanner" ? "page" : undefined}
              >
                <CalendarIcon />
                <span className={styles.label}>Weekplanner</span>
                <span className={styles.tooltip} aria-hidden="true">
                  Weekplanner
                </span>
              </NextLink>
            </li>
          </ul>
        </nav>

        <nav aria-label="Platforms" className={styles.section}>
          <h2 className={`nd-nav__title ${styles.sectionTitle}`}>
            Mijn platforms
          </h2>
          {mijn.length === 0 && (
            <p className={styles.empty}>Geen platforms uit Orbit geladen.</p>
          )}
          <PlatformNav platforms={mijn} currentPlatform={current} />

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
                <PlatformNav platforms={overige} currentPlatform={current} />
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
        </div>
      </div>
    </div>
  );
}
