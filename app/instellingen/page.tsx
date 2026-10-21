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
import styles from "./page.module.css";
import { VerbindLink } from "@/components/VerbindLink";

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
      detail: "Mail in Postvak IN met jou in Aan of CC, en mail met een ster.",
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
      <PageHeading
        title="Instellingen"
        crumbs={[HOME]}
        aside={
          <div className={styles.profiel}>
            {user.foto ? (
              // Een kleine profielfoto van Google; next/image voegt hier niets toe.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.avatar}
                src={user.foto}
                alt=""
                width={44}
                height={44}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={styles.avatar} aria-hidden="true">
                {initialen(user.naam)}
              </span>
            )}
            <div>
              <p className="nd-row__title">{user.naam}</p>
              <p className="nd-meta">{user.email} · ingelogd met Google</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="nd-button nd-button--quiet nd-button--small"
              >
                Uitloggen
              </button>
            </form>
          </div>
        }
      />

      <div className={styles.indeling}>
        <nav className={`nd-filters ${styles.inhoud}`} aria-label="Onderdelen">
          <a className="nd-filter" href="#koppelingen">
            Koppelingen
          </a>
          <a className="nd-filter" href="#inbox">
            Inbox
          </a>
          <a className="nd-filter" href="#accountgegevens">
            Accountgegevens
          </a>
        </nav>

        <div>
          <section className={styles.sectie} aria-labelledby="koppelingen">
            <h2 id="koppelingen" className="nd-title">
              Koppelingen
            </h2>
            <ul className={styles.tegels}>
              {KOPPELINGEN.map((info) => {
                const verbonden = isVerbonden(user.email, info.bron);
                return (
                  <li
                    key={info.bron}
                    className={`${styles.tegel} ${verbonden ? "" : "nd-row--accent"}`}
                  >
                    <h3 className="nd-row__title">{info.naam}</h3>
                    <p
                      className="nd-status"
                      data-status={verbonden ? "ok" : "warn"}
                    >
                      {verbonden ? <CheckIcon /> : <AlertIcon />}
                      {verbonden ? "Verbonden" : "Niet verbonden"}
                    </p>
                    {info.detail && <p className="nd-meta">{info.detail}</p>}
                    {info.intrekken && (
                      <p className="nd-meta">
                        <ExternalLink href={info.intrekken.href}>
                          {info.intrekken.label}
                        </ExternalLink>
                      </p>
                    )}
                    {verbonden ? (
                      <form action={ontkoppelAction} className={styles.actie}>
                        <input type="hidden" name="bron" value={info.bron} />
                        <button
                          type="submit"
                          className="nd-button nd-button--quiet nd-button--small"
                        >
                          Ontkoppelen
                          <span className="visually-hidden">: {info.naam}</span>
                        </button>
                      </form>
                    ) : (
                      <VerbindLink
                        href={`/api/${info.bron}/login`}
                        className={`nd-button nd-button--small ${styles.actie}`}
                      >
                        Verbinden met {info.kort}
                      </VerbindLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.sectie} aria-labelledby="inbox">
            <h2 id="inbox" className="nd-title">
              Inbox
            </h2>
            <p className={styles.uitleg}>
              Kies welke bronnen in je Inbox komen. Zet je er een uit, dan
              verdwijnen de items uit die bron uit je Inbox; je to-do&apos;s
              blijven staan.
            </p>
            <ul className={styles.tegels}>
              {INBOX_BRONNEN_INFO.map(({ bron, naam, detail }) => {
                // Zonder Gmail-toegang staat de schakelaar uit, ook als de bron aan staat.
                const geenToegang =
                  bron === "gmail" && !isVerbonden(user.email, "gmail");
                const aan = bronAan(user.email, bron) && !geenToegang;
                return (
                  <li key={bron} className={styles.tegel}>
                    <div className={styles.tegelKop}>
                      <h3 id={`inbox-${bron}`} className="nd-row__title">
                        {naam}
                      </h3>
                      <form action={zetBronAction}>
                        <input type="hidden" name="bron" value={bron} />
                        <input type="hidden" name="aan" value={String(!aan)} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={aan}
                          aria-labelledby={`inbox-${bron}`}
                          className="nd-switch"
                        />
                      </form>
                    </div>
                    <p className="nd-meta">{detail}</p>
                    {geenToegang && (
                      <p className="nd-status" data-status="warn">
                        <AlertIcon />
                        Nog geen toegang: aanzetten opent het toestemmingsscherm
                        van Google.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className={`${styles.tegel} ${styles.nooit}`}>
              <h3 id="nooit" className="nd-row__title">
                Nooit in de Inbox
              </h3>
              <p className="nd-meta">
                Mail van deze afzenders en domeinen komt niet in je Inbox,
                behalve als je hem een ster geeft. Toevoegen doe je bij een mail
                in de Inbox.
              </p>
              {uitsluitingen.length === 0 ? (
                <p className="nd-meta">Nog niemand uitgesloten.</p>
              ) : (
                <ul className={styles.uitsluit} aria-labelledby="nooit">
                  {uitsluitingen.map(({ waarde, soort }) => (
                    <li key={waarde} className={`nd-chip ${styles.chip}`}>
                      {waarde}
                      <span className="nd-muted">{soort}</span>
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

          <section className={styles.sectie} aria-labelledby="accountgegevens">
            <h2 id="accountgegevens" className="nd-title">
              Accountgegevens
            </h2>
            <p className={styles.uitleg}>
              Wat Orbit niet weet: Jira-projecten, supportorganisaties, AM,
              contactpersonen en links per platform. Ze staan in een tabel in
              Superhuman, zodat iedereen dezelfde gegevens ziet. Het dashboard
              haalt ze één keer per dag op.
            </p>
            {fout && (
              <Melding titel="Ophalen uit Superhuman is mislukt" role="alert">
                {fout}
              </Melding>
            )}
            <div className={styles.knoppen}>
              <ExternalLink
                href={TABEL_BROWSER_URL}
                className="nd-button nd-button--small"
              >
                Tabel openen in Superhuman
              </ExternalLink>
              <form action={refreshAccountGegevensAction}>
                <button
                  type="submit"
                  className="nd-button nd-button--quiet nd-button--small"
                >
                  Verversen
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
