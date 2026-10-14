import NextLink from "next/link";
import { NavPlatform } from "@/lib/navigation";
import styles from "./Sidebar.module.css";

type Props = {
  platforms: NavPlatform[];
  currentPlatform: string | null;
};

/** Elk platform als gelijkwaardig item; de klant klein eronder als die anders heet. */
export function PlatformNav({ platforms, currentPlatform }: Props) {
  return (
    <ul className={styles.list}>
      {platforms.map((platform) => (
        <li key={platform.slug}>
          <NextLink
            href={`/platforms/${platform.slug}`}
            className={styles.item}
            aria-current={
              platform.slug === currentPlatform ? "page" : undefined
            }
          >
            <span className={styles.initials} aria-hidden="true">
              {platform.productieHost ? (
                // Een favicon van Google; next/image voegt hier niets toe.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://www.google.com/s2/favicons?domain=${platform.productieHost}&sz=64`}
                  alt=""
                  width={20}
                  height={20}
                />
              ) : (
                platform.initialen
              )}
            </span>
            <span className={styles.label}>
              {platform.naam}
              {platform.klant && (
                <span className={styles.klant}>
                  <span className="visually-hidden">, </span>
                  {platform.klant}
                </span>
              )}
            </span>
            <span className={styles.tooltip} aria-hidden="true">
              {platform.klant
                ? `${platform.naam} (${platform.klant})`
                : platform.naam}
            </span>
          </NextLink>
        </li>
      ))}
    </ul>
  );
}
