import { addLinkAction } from "@/app/actions";
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
  ChevronIcon,
  CmsIcon,
  DocIcon,
  ExternalIcon,
  FigmaIcon,
  FolderIcon,
  GlobeIcon,
  LinkIcon,
  SlackIcon,
  SparkleIcon,
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
  "claude-project": SparkleIcon,
  "omgeving-acc": GlobeIcon,
  "omgeving-prod": GlobeIcon,
  "cms-acc": CmsIcon,
  "cms-prod": CmsIcon,
};

type Props = {
  links: Link[];
  eigenLinks: EigenLink[];
  /** De slug om links aan toe te voegen; ontbreekt als dat nu niet kan, zoals zonder Orbit-klant. */
  toevoegenVoor?: string;
};

function LinkRij({
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
        className={`nd-action nd-action--main ${styles.link}`}
        title={new URL(url).host}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icoon />
        {naam}
        <ExternalIcon className={styles.extern} />
        <span className="nd-visually-hidden"> (opent in nieuw tabblad)</span>
      </a>
    </li>
  );
}

/**
 * De links van een platform in vaste groepen, plus de eigen links onder Overig.
 * Alleen ingevulde links staan in de lijst; de lege linktypes staan onder één uitklapper.
 */
export function LinkGroepen({ links, eigenLinks, toevoegenVoor }: Props) {
  const groepen = LINK_GROEPEN.map((groep) => ({
    naam: groep.naam,
    links: links.filter((link) => groep.typen.includes(link.type)),
  })).filter((groep) => groep.links.length > 0);
  const leeg = toevoegenVoor
    ? LINK_GROEPEN.flatMap((groep) => groep.typen).filter(
        (type) => !links.some((link) => link.type === type),
      )
    : [];
  const eigenToevoegen =
    toevoegenVoor !== undefined && eigenLinks.length < MAX_EIGEN_LINKS;

  return (
    <section className="nd-card" aria-labelledby="links">
      <div className="nd-card__head">
        <h2 id="links" className="nd-title">
          Links
        </h2>
      </div>
      {groepen.length === 0 && eigenLinks.length === 0 ? (
        <p className="nd-empty">Nog geen links.</p>
      ) : (
        <div className={`nd-row ${styles.groepen}`}>
          {groepen.map((groep) => (
            <div key={groep.naam}>
              <h3 className="nd-eyebrow">{groep.naam}</h3>
              <ul className={styles.lijst}>
                {groep.links.map((link) => (
                  <LinkRij
                    key={link.type}
                    naam={LINK_TYPE_LABELS[link.type]}
                    url={link.url}
                    Icoon={ICOON[link.type]}
                  />
                ))}
              </ul>
            </div>
          ))}
          {eigenLinks.length > 0 && (
            <div>
              <h3 className="nd-eyebrow">Overig</h3>
              <ul className={styles.lijst}>
                {eigenLinks.map((link) => (
                  <LinkRij
                    key={`${link.naam}-${link.url}`}
                    naam={link.naam}
                    url={link.url}
                    Icoon={LinkIcon}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {(leeg.length > 0 || eigenToevoegen) && toevoegenVoor && (
        <details className={`nd-disclosure ${styles.ontbreekt}`}>
          <summary>
            <ChevronIcon />
            {leeg.length === 0
              ? "Link toevoegen"
              : `${leeg.length} ${leeg.length === 1 ? "link ontbreekt" : "links ontbreken"}`}
          </summary>
          <div className={styles.toevoegen}>
            {leeg.map((type) => (
              <LinkToevoegen
                key={type}
                action={addLinkAction.bind(null, toevoegenVoor, type)}
                linktype={LINK_TYPE_LABELS[type]}
              />
            ))}
            {eigenToevoegen && (
              <LinkToevoegen
                action={addLinkAction.bind(null, toevoegenVoor, "eigen")}
              />
            )}
          </div>
        </details>
      )}
    </section>
  );
}
