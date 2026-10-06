import { groupLinks, Link, LINK_TYPE_LABELS } from "@/lib/links";
import { ExternalLink } from "./ExternalLink";
import styles from "./LinkList.module.css";

type Props = { links: Link[] };

export function LinkList({ links }: Props) {
  const groups = groupLinks(links);
  if (groups.length === 0) {
    return <p className={styles.empty}>Nog geen links voor dit platform.</p>;
  }

  return (
    <dl className={styles.groups}>
      {groups.map((group) => (
        <div key={group.type} className={styles.group}>
          <dt className={styles.type}>{LINK_TYPE_LABELS[group.type]}</dt>
          {group.links.map((link) => (
            <dd key={link.url} className={styles.item}>
              <ExternalLink href={link.url}>{link.label}</ExternalLink>
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}
