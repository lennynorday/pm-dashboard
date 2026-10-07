import type { LinkState } from "@/app/actions";
import {
  type EigenLink,
  type Link,
  LINK_GROEPEN,
  LINK_TYPE_LABELS,
  type LinkType,
  MAX_EIGEN_LINKS,
} from "@/lib/links";
import {
  BoardIcon,
  CmsIcon,
  DocIcon,
  ExternalIcon,
  FigmaIcon,
  FolderIcon,
  GlobeIcon,
  LinkIcon,
  SlackIcon,
} from "./icons";
import { LinkToevoegen } from "./LinkToevoegen";
import styles from "./LinkGroepen.module.css";

const ICOON: Record<LinkType, typeof LinkIcon> = {
  "slack-intern": SlackIcon,
  "slack-klant": SlackIcon,
  "superhuman-intern": DocIcon,
  "superhuman-gedeeld": DocIcon,
  "jira-board": BoardIcon,
  drive: FolderIcon,
  figma: FigmaIcon,
  "omgeving-acc": GlobeIcon,
  "omgeving-prod": GlobeIcon,
  "cms-acc": CmsIcon,
  "cms-prod": CmsIcon,
};

type Props = {
  links: Link[];
  eigenLinks: EigenLink[];
  /** Ontbreekt als toevoegen nu niet kan, zoals zonder Orbit-klant. */
  toevoegen?: (vorige: LinkState, formData: FormData) => Promise<LinkState>;
};

function Tegel({
  naam,
  url,
  Icoon,
}: {
  naam: string;
  url: string;
  Icoon: typeof LinkIcon;
}) {
  return (
    <li>
      <a
        href={url}
        className={styles.tegel}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.icoon}>
          <Icoon className={styles.svg} />
        </span>
        <span className={styles.tekst}>
          <strong>{naam}</strong>
          <small>{new URL(url).host}</small>
        </span>
        <ExternalIcon className={styles.extern} />
        <span className="visually-hidden"> (opent in nieuw tabblad)</span>
      </a>
    </li>
  );
}

/** De links van een platform in vaste groepen; Overig bevat de eigen links. */
export function LinkGroepen({ links, eigenLinks, toevoegen }: Props) {
  const groepen = LINK_GROEPEN.map((groep) => ({
    naam: groep.naam,
    links: links.filter((link) => groep.typen.includes(link.type)),
  })).filter((groep) => groep.links.length > 0);

  return (
    <div className={styles.groepen}>
      {groepen.map((groep, index) => (
        <div key={groep.naam} className={styles.groep} data-groep={index}>
          <h3 className={styles.kop}>{groep.naam}</h3>
          <ul className={styles.lijst}>
            {groep.links.map((link) => (
              <Tegel
                key={link.type}
                naam={LINK_TYPE_LABELS[link.type]}
                url={link.url}
                Icoon={ICOON[link.type]}
              />
            ))}
          </ul>
        </div>
      ))}
      <div className={styles.groep} data-groep="overig">
        <h3 className={styles.kop}>
          Overig{" "}
          <span className={styles.max}>
            {eigenLinks.length} van {MAX_EIGEN_LINKS}
          </span>
        </h3>
        {eigenLinks.length > 0 && (
          <ul className={styles.lijst}>
            {eigenLinks.map((link) => (
              <Tegel
                key={`${link.naam}-${link.url}`}
                naam={link.naam}
                url={link.url}
                Icoon={LinkIcon}
              />
            ))}
          </ul>
        )}
        {toevoegen && eigenLinks.length < MAX_EIGEN_LINKS && (
          <LinkToevoegen action={toevoegen} />
        )}
      </div>
    </div>
  );
}
