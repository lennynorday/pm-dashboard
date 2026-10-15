import type { BudgetMap } from "./orbit/budget-tekst.ts";
import { formatUren } from "./format.ts";

/** Een ingeplande dag van iemand op een taak. */
export type Planregel = {
  datum: string;
  wie: string;
  taak: string;
  /** De regel waar een reservering aan toegewezen is; bepaalt de map bij dubbele taaknamen. */
  regelId?: string;
};
/** Geschreven tijd van iemand op een taak; minuten. */
export type Tijdregel = {
  datum: string;
  wie: string;
  taak: string;
  minuten: number;
};
/** Tot en met welke dag iemands timesheet definitief is; null als er niets vergrendeld is. */
export type Bijregel = { wie: string; bijTm: string | null };

// ---------- Datums (ISO "2026-10-15", gerekend in UTC zodat zomertijd niet meetelt) ----------

const DAG_MS = 24 * 60 * 60 * 1000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Weekdag, 0 = zondag. */
const weekdag = (datum: string) => new Date(utc(datum)).getUTCDay();

export function dagPlus(datum: string, dagen: number): string {
  return iso(utc(datum) + dagen * DAG_MS);
}

export function isoDatum(datum: Date): string {
  const maand = String(datum.getMonth() + 1).padStart(2, "0");
  const dag = String(datum.getDate()).padStart(2, "0");
  return `${datum.getFullYear()}-${maand}-${dag}`;
}

export function maandagVan(datum: string): string {
  return dagPlus(datum, -((weekdag(datum) + 6) % 7));
}

/** Maandag vorige week t/m zondag volgende week. */
export function venster(vandaag: string): { van: string; tot: string } {
  const maandag = maandagVan(vandaag);
  return { van: dagPlus(maandag, -7), tot: dagPlus(maandag, 13) };
}

/** Werkdagen (ma-vr) van `van` t/m `tot`, beide meegerekend. */
export function werkdagen(van: string, tot: string): number {
  let aantal = 0;
  for (let dag = van; dag <= tot; dag = dagPlus(dag, 1)) {
    if (weekdag(dag) % 6 !== 0) aantal++;
  }
  return aantal;
}

/** Vrijdag van de vorige week: wie zijn timesheet tot daar heeft vastgezet, is bij (iedereen zet per week vast). */
export function vrijdagVorigeWeek(datum: string): string {
  return dagPlus(maandagVan(datum), -3);
}

const dagFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "di 14 okt" */
export function dagLabel(datum: string): string {
  return dagFormat.format(utc(datum)).replaceAll(".", "");
}

// ---------- Orbit-tekst ----------

/** "2h", "0h15" of "3h15" naar minuten. */
function parseKortDuur(tekst: string): number {
  const delen = /(\d+)h(\d+)?/.exec(tekst);
  return delen ? Number(delen[1]) * 60 + Number(delen[2] ?? 0) : 0;
}

const ENTRY = /^- (\d{4}-\d{2}-\d{2}) \d{2}:\d{2} \| /;

/**
 * De taaknaam: het stuk na de eerste " / " ná het projectnummer, tot " — " of "  (api_id".
 * ponytail: een " / " in de projectnaam of omschrijving vóór de taak breekt dit; Orbit geeft geen aparte taakkolom.
 */
function taakNaam(velden: string[]): string | null {
  const project = velden.findIndex(
    (veld, index) => index >= 2 && /^\d+ /.test(veld),
  );
  if (project < 0) return null;
  const rest = velden.slice(project + 1).join(" | ");
  const begin = rest.indexOf(" / ");
  if (begin < 0) return null;
  return (
    rest
      .slice(begin + 3)
      .split(/ — |\s+\(api_id| \| reserved/)[0]
      .trim() || null
  );
}

type Entry = { datum: string; velden: string[]; taak: string };

/** Alleen regels die met "- datum tijd |" beginnen; omschrijvingen lopen soms over meer regels. */
function parseEntries(tekst: string): Entry[] {
  return tekst.split("\n").flatMap((regel) => {
    const datum = ENTRY.exec(regel)?.[1];
    if (!datum) return [];
    const velden = regel.slice(2).split(" | ");
    const taak = taakNaam(velden);
    return taak ? [{ datum, velden, taak }] : [];
  });
}

/** ListPlannedEntries; alleen "planned" en "fixed-time". */
export function parsePlanning(tekst: string): Planregel[] {
  return parseEntries(tekst)
    .filter(({ velden }) => ["planned", "fixed-time"].includes(velden[3]))
    .map(({ datum, velden, taak }) => ({ datum, wie: velden[1].trim(), taak }));
}

/** Een reservering in Orbit: uren die voor iemand op een taak gereserveerd zijn. */
export type Reservering = {
  van: string;
  tot: string;
  wie: string;
  taak: string;
  /** Het nog open deel ("left"), in minuten. */
  minutenOver: number;
};

const RESERVERING = /^- (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2}) \| /;

/**
 * ListReservations.
 * ponytail: gaat ervan uit dat Orbit alleen open reserveringen geeft; de naam van de persoon en van de taak moeten gelijk zijn aan die in de planning en het budget.
 */
export function parseReserveringen(tekst: string): Reservering[] {
  return tekst.split("\n").flatMap((regel) => {
    const datums = RESERVERING.exec(regel);
    if (!datums) return [];
    const velden = regel.slice(2).split(" | ");
    const taak = taakNaam(velden);
    if (!taak) return [];
    return [
      {
        van: datums[1],
        tot: datums[2],
        wie: velden[1].trim(),
        taak,
        minutenOver: parseKortDuur(/left (\S+)/.exec(regel)?.[1] ?? ""),
      },
    ];
  });
}

/** Een reservering met de budgetregel waar ze bij hoort; zonder regelId past de taaknaam nergens. */
export type Toewijzing = Reservering & { regelId?: string };

/**
 * Wijst elke reservering (op `van`) toe aan de eerste regel met haar taaknaam waar nog ruimte is
 * (budget min geschreven, gepland en al toegewezen), anders aan de laatste.
 * ponytail: Orbit geeft bij een reservering alleen de taaknaam; aanname: sprints staan in Orbit in tijdsvolgorde. Een reservering wordt niet over regels verdeeld.
 */
export function wijsToe(
  mappen: BudgetMap[],
  reserveringen: Reservering[],
): Toewijzing[] {
  const regels = mappen.flatMap((map) => map.regels);
  const toegewezen = new Map<string, number>();
  return [...reserveringen]
    .sort((a, b) => a.van.localeCompare(b.van))
    .map((reservering) => {
      const kandidaten = regels.filter(({ naam }) => naam === reservering.taak);
      const ruimte = (regel: (typeof regels)[number]) =>
        regel.beschikbaar -
        regel.geschreven -
        regel.gepland -
        (toegewezen.get(regel.id) ?? 0);
      // Eerst waar hij helemaal past, dan waar nog iets ruimte is, anders de laatste.
      const doel =
        kandidaten.find((regel) => ruimte(regel) >= reservering.minutenOver) ??
        kandidaten.find((regel) => ruimte(regel) > 0) ??
        kandidaten.at(-1);
      if (!doel) return reservering;
      toegewezen.set(
        doel.id,
        (toegewezen.get(doel.id) ?? 0) + reservering.minutenOver,
      );
      return { ...reservering, regelId: doel.id };
    });
}

/** Per werkdag waarop een reservering het venster overlapt een planregel, zodat ze meetellen als planning. */
export function reserveringPlanning(
  toewijzingen: Toewijzing[],
  vandaag: string,
): Planregel[] {
  const { van, tot } = venster(vandaag);
  return toewijzingen.flatMap(
    ({ van: begin, tot: eind, wie, taak, regelId }) => {
      const dagen: Planregel[] = [];
      const laatste = eind < tot ? eind : tot;
      let dag = begin > van ? begin : van;
      for (; dag <= laatste; dag = dagPlus(dag, 1)) {
        if (weekdag(dag) % 6 !== 0)
          dagen.push({ datum: dag, wie, taak, regelId });
      }
      return dagen;
    },
  );
}

/** Het open deel van reserveringen telt als gepland op de toegewezen regel. */
export function metReserveringen(
  mappen: BudgetMap[],
  toewijzingen: Toewijzing[],
): BudgetMap[] {
  return mappen.map((map) => ({
    ...map,
    regels: map.regels.map((regel) => ({
      ...regel,
      gepland: toewijzingen
        .filter(({ regelId }) => regelId === regel.id)
        .reduce(
          (totaal, { minutenOver }) => totaal + minutenOver,
          regel.gepland,
        ),
    })),
  }));
}

/** ListTimeEntries met kind logged. */
export function parseTijd(tekst: string): Tijdregel[] {
  return parseEntries(tekst).map(({ datum, velden, taak }) => ({
    datum,
    wie: velden[1].trim(),
    taak,
    minuten: parseKortDuur(velden[2]),
  }));
}

/**
 * GetTimesheetStatus: de tabel met "Days locked" per persoon, vanaf `vanaf`.
 * ponytail: "Days locked N" geldt als N aaneengesloten kalenderdagen vanaf `vanaf`; een gat (week wel, vorige niet) klopt niet.
 */
export function parseBij(tekst: string, vanaf: string): Bijregel[] {
  return tekst.split("\n").flatMap((regel) => {
    const kolommen = regel.split("|").map((kolom) => kolom.trim());
    const vergrendeld = /^(\d+)\/\d+$/.exec(kolommen[5] ?? "")?.[1];
    if (vergrendeld === undefined) return [];
    const dagen = Number(vergrendeld);
    return [
      { wie: kolommen[1], bijTm: dagen > 0 ? dagPlus(vanaf, dagen - 1) : null },
    ];
  });
}

// ---------- De huidige sprint ----------

export type Sprint = {
  map: BudgetMap;
  /** De map vóór de huidige in de volgorde van GetProject. */
  vorige: BudgetMap | null;
  /** Komende mappen waar nog budget over is. */
  hierna: BudgetMap[];
  /** Eerste geplande dag van de map binnen het venster. */
  start: string;
  wanneer: string;
  planning: Planregel[];
};

export const somRegels = (
  regels: BudgetMap["regels"],
  veld: "beschikbaar" | "geschreven" | "gepland",
) => regels.reduce((totaal, regel) => totaal + regel[veld], 0);

/**
 * De map met planning deze week; anders die van volgende week, anders van vorige week.
 * Een taaknaam in meer mappen hoort bij de map waar iets op gepland staat, anders de eerste.
 * ponytail: matcht alleen op taaknaam; een sprint die vóór het venster begon, telt vanaf het venster.
 */
export function bepaalSprint(
  mappen: BudgetMap[],
  planning: Planregel[],
  vandaag: string,
): Sprint | null {
  const mapVan = ({ taak, regelId }: Planregel): BudgetMap | undefined => {
    const toegewezen = mappen.find((map) =>
      map.regels.some((regel) => regel.id === regelId),
    );
    if (toegewezen) return toegewezen;
    const heeft = mappen.filter((map) =>
      map.regels.some((regel) => regel.naam === taak),
    );
    return (
      heeft.find((map) =>
        map.regels.some((regel) => regel.naam === taak && regel.gepland > 0),
      ) ?? heeft[0]
    );
  };
  const maandag = maandagVan(vandaag);
  const weken = [maandag, dagPlus(maandag, 7), dagPlus(maandag, -7)];
  for (const begin of weken) {
    const eind = dagPlus(begin, 6);
    const maps = planning
      .filter(({ datum }) => datum >= begin && datum <= eind)
      .map(mapVan);
    const map = mappen.find((kandidaat) => maps.includes(kandidaat));
    if (!map) continue;
    const eigen = planning.filter((regel) => mapVan(regel) === map);
    const dagen = eigen.map(({ datum }) => datum).sort();
    const eerste = dagen[0];
    const laatste = dagen[dagen.length - 1];
    const totaal = Math.max(1, werkdagen(eerste, laatste));
    const nr = mappen.indexOf(map);
    return {
      map,
      vorige: mappen[nr - 1] ?? null,
      hierna: mappen
        .slice(nr + 1)
        .filter(
          (komend) =>
            somRegels(komend.regels, "beschikbaar") >
            somRegels(komend.regels, "geschreven"),
        ),
      start: eerste,
      wanneer:
        eerste > vandaag
          ? `Start ${dagLabel(eerste)}`
          : `dag ${Math.min(totaal, Math.max(1, werkdagen(eerste, vandaag)))} van ${totaal}`,
      planning: eigen,
    };
  }
  return null;
}

/** "Vorige sprint 3,7u onder budget"; niets als het binnen 3 minuten klopt. */
export function vorigeTekst(vorige: BudgetMap | null): string | undefined {
  if (!vorige) return undefined;
  const verschil =
    somRegels(vorige.regels, "geschreven") -
    somRegels(vorige.regels, "beschikbaar");
  if (Math.abs(verschil) <= 3) return undefined;
  return `Vorige sprint ${formatUren(Math.abs(verschil))}u ${verschil < 0 ? "onder" : "over"} budget`;
}

// ---------- Mensen ----------

export type Persoon = {
  naam: string;
  /** Minuten op deze regel. */
  minuten: number;
  /** Laatste dag met geschreven tijd in deze sprint. */
  laatste: string | null;
  bijTm: string | null;
  ok: boolean;
};

/** Waarover mensen en uren gaan: de regels, de eerste dag en wie erop gepland staat. */
export type Bereik = {
  regels: BudgetMap["regels"];
  start: string;
  planning: Planregel[];
};

export type Mensen = {
  /** Per regelnaam, de meeste uren eerst. */
  perRegel: Record<string, Persoon[]>;
  achter: string[];
  /** Laatste dag met geschreven tijd van wie dan ook, op welke taak dan ook. */
  laatst: string | null;
  /** De vroegste "bij t/m"; alleen als niemand achterloopt. */
  compleetTm: string | null;
};

const uniek = (namen: string[]) => [...new Set(namen)];

/** Eerste geplande dag na vandaag; null als er niets ingepland staat. */
export function ingeplandVanaf(
  planning: Planregel[],
  vandaag: string,
): string | null {
  return (
    planning
      .map(({ datum }) => datum)
      .filter((datum) => datum > vandaag)
      .sort()[0] ?? null
  );
}

/** Mensen met tijd of planning in het bereik, en wie achterloopt met uren schrijven. */
export function bepaalMensen(
  bereik: Bereik,
  uren: Tijdregel[],
  bij: Bijregel[],
  vandaag: string,
): Mensen {
  const taken = bereik.regels.map((regel) => regel.naam);
  const tijd = uren.filter(
    ({ taak, datum }) => taken.includes(taak) && datum >= bereik.start,
  );
  const grens = vrijdagVorigeWeek(vandaag);
  const bijTm = (naam: string) =>
    bij.find((regel) => regel.wie.toLowerCase() === naam.toLowerCase())
      ?.bijTm ?? null;
  const persoon = (naam: string, taak: string): Persoon => {
    const eigen = tijd.filter((regel) => regel.wie === naam);
    const tm = bijTm(naam);
    return {
      naam,
      minuten: eigen
        .filter((regel) => regel.taak === taak)
        .reduce((totaal, regel) => totaal + regel.minuten, 0),
      laatste:
        eigen
          .map((regel) => regel.datum)
          .sort()
          .at(-1) ?? null,
      bijTm: tm,
      ok: tm !== null && tm >= grens,
    };
  };
  const perRegel = Object.fromEntries(
    taken.map((taak) => [
      taak,
      uniek(
        [...tijd, ...bereik.planning]
          .filter((regel) => regel.taak === taak)
          .map((regel) => regel.wie),
      )
        .map((naam) => persoon(naam, taak))
        .sort((a, b) => b.minuten - a.minuten),
    ]),
  );
  const iedereen = uniek(
    [...tijd, ...bereik.planning].map((regel) => regel.wie),
  )
    .map((naam) => persoon(naam, ""))
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  const achter = iedereen.filter(({ ok }) => !ok).map(({ naam }) => naam);
  return {
    perRegel,
    achter,
    laatst:
      uren
        .map(({ datum }) => datum)
        .sort()
        .at(-1) ?? null,
    compleetTm:
      achter.length === 0
        ? (iedereen
            .map(({ bijTm: tm }) => tm)
            .filter((tm): tm is string => tm !== null)
            .sort()[0] ?? null)
        : null,
  };
}

const voornaam = (naam: string) => naam.split(" ")[0];

/** "Brenda en Anisha lopen achter met uren"; bij meer dan twee "Brenda, Anisha en nog 2". */
export function achterTekst(namen: string[]): string {
  const [a, b] = namen.map(voornaam);
  if (namen.length === 1) return `${a} loopt achter met uren`;
  if (namen.length === 2) return `${a} en ${b} lopen achter met uren`;
  return `${a}, ${b} en nog ${namen.length - 2} lopen achter met uren`;
}

export function initialen(naam: string): string {
  const delen = naam.split(" ").filter(Boolean);
  const eerste = delen[0]?.[0] ?? "";
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : "";
  return (eerste + laatste).toUpperCase();
}
