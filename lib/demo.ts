import type { DatabaseSync } from "node:sqlite";
import type { AlleAccountGegevens, PlatformGegevens } from "./accountgegevens";
import type { AccountJira, Telling } from "./jira/overview";
import type { ProjectBudget } from "./orbit/budget";
import type { OrbitProject, ProjectFilter } from "./orbit/projects";
import type { GoogleProfiel } from "./google/oauth";
import {
  dagPlus,
  isoDatum,
  maandagVan,
  type Bijregel,
  type Planregel,
  type Reservering,
  type Tijdregel,
} from "./sprint";

/**
 * Demomodus (npm run demo): verzonnen klanten, collega's, inbox en to-do's in
 * plaats van Orbit, Jira, Slack, Gmail en Superhuman. Zie specs/2026-10-16-demomodus-met-nepdata.md.
 */
export const DEMO = process.env.DEMO === "1";

export const DEMO_GEBRUIKER: GoogleProfiel = {
  email: "sam.verbeek@demo.example",
  naam: "Sam Verbeek",
  voornaam: "Sam",
  foto: null,
};

const IK = DEMO_GEBRUIKER.naam;
const NOOR = "Noor Bakker";
const DAAN = "Daan Visser";
const LOTTE = "Lotte Mulder";
const JESSE = "Jesse de Graaf";
const FLEUR = "Fleur Smit";
const BRAM = "Bram Hendriks";
const MENSEN = [IK, NOOR, DAAN, LOTTE, JESSE, FLEUR, BRAM];

const u = (uren: number) => Math.round(uren * 60);
const vandaag = () => isoDatum(new Date());
const maandag = () => maandagVan(vandaag());
/** Werkdag `n` van deze week (0 = maandag); negatief of > 4 voor andere weken. */
const werkdag = (n: number) => dagPlus(maandag(), n + Math.floor(n / 5) * 2);

// ---------- Klanten, platforms en projecten ----------

type DemoKlant = {
  orbitNaam: string;
  id: string;
  am: string;
  platforms: (Partial<PlatformGegevens> & { naam: string })[];
};

const KLANTEN: DemoKlant[] = [
  {
    orbitNaam: "Stichting Museum Het Lichthuis",
    id: "DEMOKLANT000001",
    am: NOOR,
    platforms: [
      {
        naam: "Lichthuis website",
        orbitProjecten: ["4101", "4102", "4103"],
        jiraKeys: ["LHW"],
        supportOrganizations: ["Museum Het Lichthuis"],
        contactpersonen: [
          { naam: "Marieke Dekker", rol: "Hoofd communicatie" },
          { naam: "Tom Jansen", rol: "Webredacteur" },
        ],
      },
      {
        naam: "Collectie online",
        orbitProjecten: ["4104"],
        jiraKeys: ["LHC"],
        contactpersonen: [{ naam: "Ilse de Wit", rol: "Collectiebeheerder" }],
      },
    ],
  },
  {
    orbitNaam: "Gemeente Zuidervaart",
    id: "DEMOKLANT000002",
    am: NOOR,
    platforms: [
      {
        naam: "Loket Zuidervaart",
        jiraKeys: ["GZV"],
        supportOrganizations: ["Gemeente Zuidervaart"],
        contactpersonen: [
          {
            naam: "Peter van Leeuwen",
            rol: "Productowner digitale dienstverlening",
          },
        ],
      },
    ],
  },
  {
    orbitNaam: "Woonstichting Rivierland",
    id: "DEMOKLANT000003",
    am: BRAM,
    platforms: [
      {
        naam: "Mijn Rivierland",
        jiraKeys: ["MRL"],
        supportOrganizations: ["Woonstichting Rivierland"],
        contactpersonen: [
          { naam: "Sanne Kok", rol: "Teamleider klantcontact" },
        ],
      },
    ],
  },
  {
    orbitNaam: "Stichting Festival Kadeklanken",
    id: "DEMOKLANT000004",
    am: BRAM,
    platforms: [
      {
        naam: "Kadeklanken",
        jiraKeys: ["KDK"],
        contactpersonen: [{ naam: "Rick Peters", rol: "Marketing" }],
      },
    ],
  },
  {
    orbitNaam: "Stadsarchief Oostkamp",
    id: "DEMOKLANT000005",
    am: NOOR,
    platforms: [
      {
        naam: "Archief Oostkamp",
        jiraKeys: ["SAO"],
        supportOrganizations: ["Stadsarchief Oostkamp"],
        contactpersonen: [{ naam: "Hanna Vos", rol: "Archivaris" }],
      },
    ],
  },
  {
    orbitNaam: "Theater De Wissel B.V.",
    id: "DEMOKLANT000006",
    am: BRAM,
    platforms: [{ naam: "De Wissel", jiraKeys: ["TDW"] }],
  },
  {
    orbitNaam: "Bibliotheek Veenhoven",
    id: "DEMOKLANT000007",
    am: NOOR,
    platforms: [{ naam: "Bibliotheek Veenhoven", jiraKeys: ["BVH"] }],
  },
];

const SITE = (slug: string) => `https://${slug}.example`;

export function demoGegevens(): AlleAccountGegevens {
  return Object.fromEntries(
    KLANTEN.map((klant) => [
      klant.id,
      {
        am: klant.am,
        zonderPlatform: [],
        platforms: klant.platforms.map((platform) => {
          const slug = platform.naam.toLowerCase().replace(/\W+/g, "-");
          return {
            orbitProjecten: [],
            jiraKeys: [],
            supportOrganizations: [],
            contactpersonen: [],
            eigenLinks: [],
            links: {
              "omgeving-prod": SITE(slug),
              "omgeving-acc": SITE(`acc.${slug}`),
              "cms-prod": `${SITE(slug)}/cms`,
            },
            ...platform,
          };
        }),
      },
    ]),
  );
}

export function demoKlantIds(): Map<string, string> {
  return new Map(KLANTEN.map((klant) => [klant.orbitNaam, klant.id]));
}

type DemoProject = Omit<OrbitProject, "id" | "state"> & {
  budget: ProjectBudget;
  /** Wie wanneer op welke taak staat, als werkdag t.o.v. deze maandag. */
  planning?: [string, string, number[]][];
  reserveringen?: Reservering[];
};

type Regel = [
  naam: string,
  budget: number,
  geschreven: number,
  gepland?: number,
];

let teller = 0;
const map = (naam: string, regels: Regel[]) => ({
  id: `DEMOMAP${++teller}`,
  naam,
  regels: regels.map(([naam, budget, geschreven, gepland = 0]) => ({
    id: `DEMOTAAK${++teller}`,
    naam,
    afgesloten: false,
    beschikbaar: u(budget),
    geschreven: u(geschreven),
    gepland: u(gepland),
  })),
});

function budget(
  mappen: ReturnType<typeof map>[],
  offerteUren: number | null,
  start: string | null = null,
): ProjectBudget {
  const regels = mappen.flatMap((item) => item.regels);
  return {
    beschikbaar: regels.reduce((som, regel) => som + regel.beschikbaar, 0),
    geschreven: regels.reduce((som, regel) => som + regel.geschreven, 0),
    offerte:
      offerteUren === null
        ? { status: "geen" }
        : { status: "ok", minuten: u(offerteUren) },
    mappen,
    start,
  };
}

const jaar = new Date().getFullYear();

const PROJECTEN: DemoProject[] = [
  {
    number: "4101",
    name: "Lichthuis website doorontwikkeling 2026",
    client: KLANTEN[0].orbitNaam,
    owner: IK,
    endDate: `${jaar}-12-31`,
    budget: budget(
      [
        map("Sprint 14", [
          ["Sprint 14 - Development", 48, 51],
          ["Sprint 14 - Design", 12, 10.5],
          ["Sprint 14 - Projectmanagement", 6, 6],
        ]),
        map("Sprint 15", [
          ["Sprint 15 - Development", 56, 18, 32],
          ["Sprint 15 - Design", 10, 4, 6],
          ["Sprint 15 - Projectmanagement", 6, 2, 3],
        ]),
        map("Sprint 16", [
          ["Sprint 16 - Development", 48, 0],
          ["Sprint 16 - Projectmanagement", 6, 0],
        ]),
      ],
      240,
    ),
    planning: [
      [DAAN, "Sprint 15 - Development", [0, 1, 2, 3, 4, 5, 6]],
      [LOTTE, "Sprint 15 - Development", [1, 2, 3, 4]],
      [FLEUR, "Sprint 15 - Design", [0, 2]],
      [IK, "Sprint 15 - Projectmanagement", [0, 4]],
    ],
  },
  {
    number: "4102",
    name: "Lichthuis SLA 2026",
    client: KLANTEN[0].orbitNaam,
    owner: IK,
    endDate: `${jaar}-12-31`,
    budget: budget(
      [
        map("Change-uren 2026", [
          ["Support en kleine wijzigingen", 120, 112],
          ["Updates en beveiliging", 40, 31],
        ]),
      ],
      160,
      `${jaar}-01-01`,
    ),
  },
  {
    number: "4103",
    name: "Lichthuis toegankelijkheidsaudit",
    client: KLANTEN[0].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 40),
    budget: budget(
      [
        map("Audit", [
          ["Audit WCAG 2.2", 24, 21.5],
          ["Rapportage", 8, 6.5],
        ]),
      ],
      32,
    ),
  },
  {
    number: "4104",
    name: "Collectie online zoekfilters",
    client: KLANTEN[0].orbitNaam,
    owner: JESSE,
    endDate: dagPlus(vandaag(), 70),
    budget: budget([map("Bouw", [["Development", 60, 22]])], 60),
  },
  {
    number: "4105",
    name: "Lichthuis tentoonstellingsmicrosite",
    client: KLANTEN[0].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 90),
    budget: budget([map("Concept", [["Concept en design", 30, 4]])], 30),
  },
  {
    number: "4201",
    name: "Loket Zuidervaart SLA 2026",
    client: KLANTEN[1].orbitNaam,
    owner: IK,
    endDate: `${jaar}-12-31`,
    budget: budget(
      [
        map("Change-uren 2026", [
          ["Support", 200, 118],
          ["Hosting en monitoring", 30, 22],
        ]),
      ],
      230,
      `${jaar}-01-01`,
    ),
  },
  {
    number: "4202",
    name: "Loket Zuidervaart afspraakmodule",
    client: KLANTEN[1].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 55),
    budget: budget(
      [
        map("Sprint 1", [
          ["Sprint 1 - Development", 40, 44],
          ["Sprint 1 - Testen", 8, 9],
        ]),
        map("Sprint 2", [
          ["Sprint 2 - Development", 40, 6, 30],
          ["Sprint 2 - Testen", 8, 0, 6],
        ]),
      ],
      90,
    ),
    planning: [
      [JESSE, "Sprint 2 - Development", [-1, 0, 1, 2, 3]],
      [BRAM, "Sprint 2 - Testen", [3, 4]],
    ],
  },
  {
    number: "4301",
    name: "Mijn Rivierland huurdersportaal",
    client: KLANTEN[2].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 120),
    budget: budget(
      [
        map("Fase 1", [
          ["Development", 160, 171],
          ["Design", 40, 38],
          ["Projectmanagement", 20, 19],
        ]),
      ],
      210,
    ),
    reserveringen: [
      {
        van: werkdag(7),
        tot: werkdag(9),
        wie: DAAN,
        taak: "Development",
        minutenOver: u(16),
      },
    ],
  },
  {
    number: "4302",
    name: "Rivierland SLA 2026",
    client: KLANTEN[2].orbitNaam,
    owner: BRAM,
    endDate: `${jaar}-12-31`,
    budget: budget([map("Change-uren 2026", [["Support", 80, 41]])], 80),
  },
  {
    number: "4401",
    name: "Kadeklanken festivalsite 2027",
    client: KLANTEN[3].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 150),
    budget: budget(
      [
        map("Sprint 1", [
          ["Sprint 1 - Development", 32, 8, 20],
          ["Sprint 1 - Design", 16, 12, 4],
        ]),
        map("Sprint 2", [["Sprint 2 - Development", 32, 0]]),
      ],
      120,
    ),
    planning: [
      [LOTTE, "Sprint 1 - Development", [5, 6, 7, 8]],
      [FLEUR, "Sprint 1 - Design", [5]],
    ],
  },
  {
    number: "4501",
    name: "Archief Oostkamp SLA 2026",
    client: KLANTEN[4].orbitNaam,
    owner: IK,
    endDate: `${jaar}-12-31`,
    budget: budget(
      [map("Change-uren 2026", [["Support en beheer", 100, 92]])],
      100,
      `${jaar}-01-01`,
    ),
  },
  {
    number: "4502",
    name: "Archief Oostkamp nieuwe zoekmachine",
    client: KLANTEN[4].orbitNaam,
    owner: DAAN,
    endDate: dagPlus(vandaag(), 60),
    budget: budget([map("Bouw", [["Development", 80, 30]])], 80),
  },
  {
    number: "4601",
    name: "De Wissel ticketkoppeling",
    client: KLANTEN[5].orbitNaam,
    owner: IK,
    endDate: dagPlus(vandaag(), 30),
    budget: budget(
      [
        map("Koppeling", [
          ["Development", 36, 12],
          ["Testen", 6, 0],
        ]),
      ],
      42,
    ),
  },
  {
    number: "4701",
    name: "Bibliotheek Veenhoven website",
    client: KLANTEN[6].orbitNaam,
    owner: JESSE,
    endDate: dagPlus(vandaag(), 200),
    budget: budget([map("Fase 1", [["Development", 120, 64]])], 120),
  },
];

export function demoProjecten(filter: ProjectFilter): OrbitProject[] {
  return PROJECTEN.filter(
    (project) => !("mine" in filter) || project.owner === IK,
  ).map(({ number, name, client, owner, endDate }) => ({
    id: `DEMOPROJECT${number}`,
    number,
    name,
    client,
    owner,
    state: "OPEN",
    endDate,
  }));
}

const project = (number: string) =>
  PROJECTEN.find((item) => item.number === number);

export function demoBudget(number: string): ProjectBudget | null {
  return project(number)?.budget ?? null;
}

export function demoPlanning(number: string): Planregel[] {
  return (project(number)?.planning ?? []).flatMap(([wie, taak, dagen]) =>
    dagen.map((dag) => ({ datum: werkdag(dag), wie, taak })),
  );
}

export function demoReserveringen(number: string): Reservering[] {
  return project(number)?.reserveringen ?? [];
}

/** Geschreven uren: wie gepland stond, schreef op de dagen tot en met vandaag. */
export function demoUren(number: string, van: string): Tijdregel[] {
  return demoPlanning(number)
    .filter(({ datum }) => datum >= van && datum <= vandaag())
    .map((regel, index) => ({
      ...regel,
      minuten: u(index % 3 === 0 ? 6 : 7.5),
    }));
}

/** Iedereen bij tot gisteren, behalve Lotte (nog niets vergrendeld). */
export function demoTimesheet(): Bijregel[] {
  return MENSEN.map((wie) => ({
    wie,
    bijTm: wie === LOTTE ? null : dagPlus(vandaag(), -1),
  }));
}

// ---------- Jira en support ----------

const JIRA = "https://jira.example";
const telling = (aantal: number): Telling => ({ aantal, url: JIRA });

const SPRINTS: Record<
  string,
  [
    actief: number,
    gepland: number,
    backlog: number,
    sprint?: string,
    eindOver?: number,
  ]
> = {
  LHW: [14, 9, 37, "LHW Sprint 15", 4],
  LHC: [0, 3, 12],
  GZV: [8, 4, 21, "Afspraken sprint 2", -2],
  MRL: [11, 0, 18, "Portaal sprint 6", 6],
  KDK: [0, 7, 15],
  SAO: [0, 0, 9],
  TDW: [3, 2, 5, "Koppeling", 9],
  BVH: [6, 5, 30, "BVH Sprint 3", 2],
};

/** Open supporttickets per organization: eerste reactie, op Norday, wacht op klant, overig. */
const SUPPORT: Record<string, [number, number, number, number]> = {
  "Museum Het Lichthuis": [2, 5, 3, 1],
  "Gemeente Zuidervaart": [1, 3, 4, 2],
  "Woonstichting Rivierland": [0, 2, 1, 0],
  "Stadsarchief Oostkamp": [0, 1, 2, 1],
};

export function demoJira(account: {
  jiraKeys: string[];
  supportOrganizations: string[];
}): AccountJira {
  const nu = new Date();
  const jira = account.jiraKeys.map((key) => {
    const [actief, gepland, backlog, sprint, eindOver] = SPRINTS[key] ?? [
      0, 0, 0,
    ];
    return {
      key,
      result: {
        status: "ok" as const,
        data: {
          key,
          boardUrl: JIRA,
          perBak: {
            actief: telling(actief),
            gepland: telling(gepland),
            backlog: telling(backlog),
          },
          actieveSprints: sprint
            ? [
                {
                  naam: sprint,
                  einddatum: dagPlus(isoDatum(nu), eindOver ?? 0),
                },
              ]
            : [],
          fetchedAt: nu,
        },
      },
    };
  });
  const som = (i: number) =>
    account.supportOrganizations.reduce(
      (totaal, org) => totaal + (SUPPORT[org]?.[i] ?? 0),
      0,
    );
  const [eerste, norday, klant, overig] = [0, 1, 2, 3].map(som);
  const support =
    account.supportOrganizations.length === 0
      ? null
      : {
          status: "ok" as const,
          data: {
            organizations: account.supportOrganizations,
            open: telling(norday + klant + overig),
            opNorday: telling(norday),
            eersteReactie: telling(eerste),
            wachtOpKlant: telling(klant),
            overig: telling(overig),
            perStatus: [
              { status: "Waiting for first response", ...telling(eerste) },
              { status: "Wachtend op support", ...telling(norday - eerste) },
              { status: "Wachtend op klant", ...telling(klant) },
              { status: "In sprint", ...telling(overig) },
            ].filter(({ aantal }) => aantal > 0),
            fetchedAt: nu,
          },
        };
  return { jira, support };
}

// ---------- Inbox en to-do's ----------

type DemoTaak = {
  bron: "slack" | "gmail" | "eigen";
  titel: string;
  auteur?: string;
  afzender?: string;
  /** Kanaal bij Slack, onderwerp bij Gmail. */
  plek?: string;
  soort?: string;
  /** Uren geleden. */
  geleden: number;
  lijst: "inbox" | "todo";
  status?: string;
  prio?: number;
  reactie?: boolean;
};

const TAKEN: DemoTaak[] = [
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 0.5,
    auteur: DAAN,
    plek: "#lichthuis-dev",
    soort: "Vermelding",
    titel:
      "@Sam de deploy naar acc staat klaar, kun jij de release notes even checken voordat Marieke gaat testen?",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 1.5,
    auteur: NOOR,
    plek: "Direct bericht",
    soort: "Direct bericht",
    titel:
      "Heb je morgen 15 min voor de offerte van Kadeklanken? Ik wil de urenverdeling nog even met je doorlopen.",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 2,
    auteur: "Peter van Leeuwen",
    afzender: "p.vanleeuwen@zuidervaart.example",
    plek: "Afspraakmodule: feedback testronde",
    soort: "Aan",
    titel:
      "Hoi Sam, we hebben de testronde afgerond. In de bijlage een lijst met 6 bevindingen, waarvan 2 blokkerend voor livegang.",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 3,
    auteur: FLEUR,
    plek: "#kadeklanken",
    soort: "Vermelding",
    titel:
      "@Sam de nieuwe homepage-designs staan in Figma, zou fijn zijn als je ze voor vrijdag naar Rick kunt sturen",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 5,
    auteur: "Marieke Dekker",
    afzender: "m.dekker@lichthuis.example",
    plek: "Vraag over nieuwsbrief-inschrijving",
    soort: "Aan",
    titel:
      "Bezoekers melden dat de bevestigingsmail van de nieuwsbrief in de spam belandt. Kunnen jullie meekijken?",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 6,
    auteur: JESSE,
    plek: "Direct bericht",
    soort: "Direct bericht",
    titel:
      "Sprint 2 van de afspraakmodule loopt een dag uit, de koppeling met het zaaksysteem gaf meer gedoe dan gedacht",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 20,
    auteur: BRAM,
    plek: "#rivierland",
    soort: "Bewaard",
    titel:
      "Rivierland wil de livegang van het portaal een week naar voren halen, graag even afstemmen wat dat betekent voor de planning",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 22,
    auteur: "Sanne Kok",
    afzender: "s.kok@rivierland.example",
    plek: "Planning livegang Mijn Rivierland",
    soort: "Aan",
    titel:
      "Goedemiddag Sam, zoals besproken willen we graag op 1 december live. Is dat haalbaar?",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 26,
    auteur: LOTTE,
    plek: "#dev",
    soort: "Vermelding",
    titel:
      "@Sam ik ben maandag en dinsdag vrij, wil jij Kadeklanken sprint 1 een dag opschuiven?",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 28,
    auteur: "Hanna Vos",
    afzender: "h.vos@oostkamp.example",
    plek: "Uren SLA tweede helft",
    soort: "Aan",
    titel:
      "Wij zien dat de SLA-uren bijna op zijn. Wat zijn de opties voor de rest van het jaar?",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 30,
    auteur: NOOR,
    plek: "#accounts",
    soort: "Vermelding",
    titel:
      "@Sam kun jij voor het kwartaaloverleg met Zuidervaart een korte stand van zaken maken?",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 48,
    auteur: "Rick Peters",
    afzender: "rick@kadeklanken.example",
    plek: "Line-up aankondiging",
    soort: "Ster",
    titel:
      "Op 1 november maken we de line-up bekend. Kan de artiestenpagina dan live?",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 50,
    auteur: DAAN,
    plek: "Direct bericht",
    soort: "Direct bericht",
    titel:
      "Mag ik de upgrade van het CMS van De Wissel inplannen voor volgende week?",
  },
  {
    bron: "gmail",
    lijst: "inbox",
    geleden: 70,
    auteur: "Ilse de Wit",
    afzender: "i.dewit@lichthuis.example",
    plek: "Nieuwe filters collectie",
    soort: "Aan",
    titel:
      "Zouden we ook op materiaal kunnen filteren? Dat vragen onderzoekers vaak.",
  },
  {
    bron: "slack",
    lijst: "inbox",
    geleden: 75,
    auteur: BRAM,
    plek: "#algemeen",
    soort: "Vermelding",
    titel: "@channel vrijdag teamlunch om 12:30, wie schuift aan?",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 4,
    status: "niet-gestart",
    prio: 1,
    titel: "Bevindingen testronde afspraakmodule inplannen",
  },
  {
    bron: "slack",
    lijst: "todo",
    geleden: 30,
    status: "niet-gestart",
    prio: 2,
    auteur: FLEUR,
    plek: "#kadeklanken",
    soort: "Vermelding",
    titel: "Homepage-designs naar Rick sturen",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 60,
    status: "niet-gestart",
    prio: 3,
    titel: "Offerte Lichthuis microsite uitwerken",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 26,
    status: "bezig",
    prio: 2,
    titel: "Sprint 16 Lichthuis voorbereiden",
  },
  {
    bron: "gmail",
    lijst: "todo",
    geleden: 3,
    status: "bezig",
    prio: 1,
    auteur: "Sanne Kok",
    afzender: "s.kok@rivierland.example",
    plek: "Planning livegang Mijn Rivierland",
    soort: "Aan",
    titel: "Haalbaarheid livegang 1 december uitzoeken",
    reactie: true,
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 80,
    status: "wacht",
    prio: 3,
    titel: "Akkoord meerwerk Rivierland afwachten",
  },
  {
    bron: "slack",
    lijst: "todo",
    geleden: 52,
    status: "wacht",
    prio: 3,
    auteur: JESSE,
    plek: "#zuidervaart",
    soort: "Bewaard",
    titel: "Testaccounts zaaksysteem aanvragen bij Zuidervaart",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 100,
    status: "geblokkeerd",
    prio: 2,
    titel: "DNS-wijziging Kadeklanken (wacht op hostingpartij)",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 120,
    status: "klaar",
    prio: 3,
    titel: "Retro sprint 14 Lichthuis",
  },
  {
    bron: "eigen",
    lijst: "todo",
    geleden: 140,
    status: "klaar",
    prio: 4,
    titel: "Toegankelijkheidsrapport naar Lichthuis",
  },
];

/** Zet de demogebruiker en, bij een lege demo.db, de inbox en to-do's klaar. */
export function vulDemo(db: DatabaseSync): void {
  db.prepare(
    "INSERT OR IGNORE INTO gebruikers (email, naam, voornaam) VALUES (?, ?, ?)",
  ).run(DEMO_GEBRUIKER.email, DEMO_GEBRUIKER.naam, DEMO_GEBRUIKER.voornaam);
  const aantal = db.prepare("SELECT COUNT(*) AS n FROM taken").get()?.n;
  if (aantal !== 0) return;
  const nu = Date.now();
  const invoegen = db.prepare(
    `INSERT INTO taken (email, bron, bron_id, titel, bericht, auteur, afzender, plek, tijd, url, soort, lijst, status, prio, toegevoegd, afgerond, reactie)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  TAKEN.forEach((taak, index) => {
    const ms = nu - taak.geleden * 60 * 60 * 1000;
    // Bij Gmail is plek het onderwerp: dat is de titel van een inbox-item, zoals bij een echte mail.
    const gmail = taak.bron === "gmail";
    const titel = gmail && taak.lijst === "inbox" ? taak.plek : taak.titel;
    const tijd = taak.bron === "eigen" ? null : Math.floor(ms / 1000);
    invoegen.run(
      DEMO_GEBRUIKER.email,
      taak.bron,
      taak.bron === "eigen" ? null : `demo:${index}`,
      titel ?? taak.titel,
      taak.bron === "eigen" ? null : taak.titel,
      taak.auteur ?? null,
      taak.afzender ?? null,
      gmail ? null : (taak.plek ?? null),
      tijd,
      taak.bron === "eigen" ? null : "https://chat.example",
      taak.soort ?? null,
      taak.lijst,
      taak.status ?? "niet-gestart",
      taak.prio ?? 3,
      ms,
      taak.status === "klaar" ? ms : null,
      taak.reactie ? tijd : null,
    );
  });
}
