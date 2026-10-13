"use client";

import { useRef } from "react";
import styles from "./Todos.module.css";

export type MenuItem = {
  label: string;
  /** Klasse voor het gekleurde stipje; het label blijft de eigenlijke informatie. */
  stip?: string;
  /** Alleen bij keuzes uit een rij (status, prioriteit); anders een gewone actie. */
  gekozen?: boolean;
  /** Een streep boven dit item. */
  scheiding?: boolean;
  kies: () => void;
};

type Props = {
  knopClass: string;
  ariaLabel: string;
  items: MenuItem[];
  children: React.ReactNode;
};

/** Klein popover-menu bij een knop. De browser regelt klikken buiten en Escape. */
export function TodosMenu({ knopClass, ariaLabel, items, children }: Props) {
  const knop = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  function toggle() {
    // Een klik op de knop sluit het menu al via "klikken buiten".
    const sluitKlik = wasOpen.current;
    wasOpen.current = false;
    if (sluitKlik || !knop.current || !menu.current) return;
    const rect = knop.current.getBoundingClientRect();
    menu.current.style.top = `${rect.bottom + 6}px`;
    menu.current.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 232))}px`;
    menu.current.showPopover();
  }

  function pijl(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const knoppen = Array.from(e.currentTarget.querySelectorAll("button"));
    const nu = knoppen.indexOf(document.activeElement as HTMLButtonElement);
    const stap = e.key === "ArrowDown" ? 1 : -1;
    knoppen[(nu + stap + knoppen.length) % knoppen.length].focus();
  }

  return (
    <>
      <button
        ref={knop}
        type="button"
        className={knopClass}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        onPointerDown={() => {
          wasOpen.current = !!menu.current?.matches(":popover-open");
        }}
        onClick={toggle}
      >
        {children}
      </button>
      <div
        ref={menu}
        popover="auto"
        role="menu"
        aria-label={ariaLabel}
        className={styles.menu}
        onToggle={(e) => {
          if (e.newState === "open")
            menu.current?.querySelector("button")?.focus();
        }}
        onKeyDown={pijl}
      >
        {items.map((item) => (
          <div key={item.label} role="none">
            {item.scheiding && <hr className={styles.streep} />}
            <button
              type="button"
              role={item.gekozen === undefined ? "menuitem" : "menuitemradio"}
              aria-checked={item.gekozen}
              className={styles.menuItem}
              onClick={() => {
                menu.current?.hidePopover();
                item.kies();
              }}
            >
              {item.stip && (
                <span
                  className={`${styles.stip} ${item.stip}`}
                  aria-hidden="true"
                />
              )}
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
