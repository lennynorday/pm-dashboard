import { logoutAction, ontkoppelAction } from "@/app/actions";
import { ExternalLink } from "@/components/ExternalLink";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { PageHeading } from "@/components/PageHeading";
import { config } from "@/config/accounts";
import { Bron, isVerbonden } from "@/lib/koppelingen";
import { initialen } from "@/lib/navigation";
import { currentUser } from "@/lib/session";
import grid from "../grid.module.css";
import styles from "./page.module.css";

const HOME = { label: "Overzicht", href: "/" };

type BronInfo = {
  bron: Bron;
  naam: string;
  kort: string;
  /** Extra uitleg onder de status, zoals de site. */
  detail?: string;
  intrekken?: { label: string; href: string };
};

const KOPPELINGEN: BronInfo[] = [
  { bron: "orbit", naam: "Teamleader Orbit", kort: "Orbit" },
  {
    bron: "jira",
    naam: "Jira",
    kort: "Jira",
    detail: `Site: ${new URL(config.jiraSite).host}`,
    intrekken: {
      label: "Toegang intrekken in je Atlassian-account",
      href: "https://id.atlassian.com/manage-profile/apps",
    },
  },
];

export default async function InstellingenPage() {
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;

  return (
    <>
      <PageHeading title="Instellingen" crumbs={[HOME]} />

      <section className={grid.section} aria-labelledby="profiel">
        <h2 id="profiel" className={grid.sectionTitle}>
          Profiel
        </h2>
        <div className={styles.profiel}>
          {user.foto ? (
            // Een kleine profielfoto van Google; next/image voegt hier niets toe.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.avatar}
              src={user.foto}
              alt=""
              width={64}
              height={64}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              {initialen(user.naam)}
            </span>
          )}
          <div>
            <p className={styles.naam}>{user.naam}</p>
            <p className={styles.detail}>{user.email}</p>
            <p className={styles.detail}>Ingelogd met Google</p>
          </div>
          <form action={logoutAction} className={styles.actie}>
            <button type="submit" className={styles.knop}>
              Uitloggen
            </button>
          </form>
        </div>
      </section>

      <section className={grid.section} aria-labelledby="koppelingen">
        <h2 id="koppelingen" className={grid.sectionTitle}>
          Koppelingen
        </h2>
        <ul className={styles.lijst}>
          {KOPPELINGEN.map((info) => {
            const verbonden = isVerbonden(user.email, info.bron);
            return (
              <li key={info.bron} className={styles.koppeling}>
                <div>
                  <h3 className={styles.naam}>{info.naam}</h3>
                  <p
                    className={styles.status}
                    data-verbonden={verbonden || undefined}
                  >
                    {verbonden ? <CheckIcon /> : <AlertIcon />}
                    {verbonden ? "Verbonden" : "Niet verbonden"}
                  </p>
                  {info.detail && (
                    <p className={styles.detail}>{info.detail}</p>
                  )}
                  {info.intrekken && (
                    <p className={styles.detail}>
                      <ExternalLink href={info.intrekken.href}>
                        {info.intrekken.label}
                      </ExternalLink>
                    </p>
                  )}
                </div>
                {verbonden ? (
                  <form action={ontkoppelAction} className={styles.actie}>
                    <input type="hidden" name="bron" value={info.bron} />
                    <button type="submit" className={styles.knop}>
                      Ontkoppelen
                      <span className="visually-hidden">: {info.naam}</span>
                    </button>
                  </form>
                ) : (
                  <a
                    href={`/api/${info.bron}/login`}
                    className={`${styles.knop} ${styles.primair} ${styles.actie}`}
                  >
                    Verbinden met {info.kort}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
