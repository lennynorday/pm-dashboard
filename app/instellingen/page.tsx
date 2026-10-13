import {
  logoutAction,
  ontkoppelAction,
  refreshAccountGegevensAction,
  staToeFormAction,
  zetBronAction,
} from "@/app/actions";
import { ExternalLink } from "@/components/ExternalLink";
import { AlertIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { config } from "@/config/dashboard";
import { readAccountGegevens } from "@/lib/accountgegevens";
import { bronAan, leesUitsluitingen } from "@/lib/inbox-bronnen";
import { Bron, isVerbonden } from "@/lib/koppelingen";
import { initialen } from "@/lib/navigation";
import { currentUser } from "@/lib/session";
import type { InboxBron } from "@/lib/taak";
import { TABEL_BROWSER_URL } from "@/lib/superhuman";
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
  { bron: "slack", naam: "Slack", kort: "Slack" },
];

const INBOX_BRONNEN_INFO: { bron: InboxBron; naam: string; detail: string }[] =
  [
    {
      bron: "slack",
      naam: "Slack",
      detail:
        "Vermeldingen, DM's waarop jij moet reageren en bewaarde berichten.",
    },
    {
      bron: "gmail",
      naam: "Gmail",
      detail:
        "Mail in Postvak IN (Primair) met jou in Aan of CC, en mail met een ster.",
    },
  ];

export default async function InstellingenPage() {
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const { fout } = await readAccountGegevens();
  const uitsluitingen = leesUitsluitingen(user.email);

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

      <section className={grid.section} aria-labelledby="inbox">
        <h2 id="inbox" className={grid.sectionTitle}>
          Inbox
        </h2>
        <p className={styles.uitleg}>
          Kies welke bronnen in je Inbox komen. Zet je er een uit, dan
          verdwijnen de items uit die bron uit je Inbox; je to-do&apos;s blijven
          staan.
        </p>
        <div className={styles.kaart}>
          <ul className={styles.lijst}>
            {INBOX_BRONNEN_INFO.map(({ bron, naam, detail }) => {
              // Zonder Gmail-toegang staat de schakelaar uit, ook als de bron aan staat.
              const geenToegang =
                bron === "gmail" && !isVerbonden(user.email, "gmail");
              const aan = bronAan(user.email, bron) && !geenToegang;
              return (
                <li key={bron} className={styles.bronRij}>
                  <div>
                    <h3 id={`inbox-${bron}`} className={styles.naam}>
                      {naam}
                    </h3>
                    <p className={styles.detail}>{detail}</p>
                    {geenToegang && (
                      <p className={styles.waarschuwing}>
                        <AlertIcon />
                        Nog geen toegang: aanzetten opent het toestemmingsscherm
                        van Google.
                      </p>
                    )}
                  </div>
                  <form action={zetBronAction} className={styles.actie}>
                    <input type="hidden" name="bron" value={bron} />
                    <input type="hidden" name="aan" value={String(!aan)} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={aan}
                      aria-labelledby={`inbox-${bron}`}
                      className={styles.schakel}
                    />
                  </form>
                </li>
              );
            })}
          </ul>

          <h3 id="nooit" className={styles.subtitel}>
            Nooit in de Inbox
          </h3>
          <p className={`${styles.detail} ${styles.nooitUitleg}`}>
            Mail van deze afzenders en domeinen komt niet in je Inbox, behalve
            als je hem een ster geeft. Toevoegen doe je bij een mail in de
            Inbox.
          </p>
          {uitsluitingen.length === 0 ? (
            <p className={styles.detail}>Nog niemand uitgesloten.</p>
          ) : (
            <ul className={styles.uitsluit} aria-labelledby="nooit">
              {uitsluitingen.map(({ waarde, soort }) => (
                <li key={waarde} className={styles.chip}>
                  {waarde}
                  <span className={styles.soort}>{soort}</span>
                  <form action={staToeFormAction}>
                    <input type="hidden" name="waarde" value={waarde} />
                    <button type="submit" className={styles.chipKnop}>
                      <CloseIcon aria-hidden="true" />
                      <span className="visually-hidden">
                        {waarde} weer toestaan
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={grid.section} aria-labelledby="accountgegevens">
        <h2 id="accountgegevens" className={grid.sectionTitle}>
          Accountgegevens
        </h2>
        <p className={styles.uitleg}>
          Wat Orbit niet weet: Jira-projecten, supportorganisaties, AM,
          contactpersonen en links per platform. Ze staan in een tabel in
          Superhuman, zodat iedereen dezelfde gegevens ziet. Het dashboard haalt
          ze één keer per dag op.
        </p>
        {fout && (
          <Melding titel="Ophalen uit Superhuman is mislukt" role="alert">
            {fout}
          </Melding>
        )}
        <div className={styles.gegevens}>
          <ExternalLink href={TABEL_BROWSER_URL} className={styles.knop}>
            Tabel openen in Superhuman
          </ExternalLink>
          <form action={refreshAccountGegevensAction}>
            <button type="submit" className={styles.knop}>
              Verversen
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
