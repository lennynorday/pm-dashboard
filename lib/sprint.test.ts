import assert from "node:assert";
import { test } from "node:test";
import {
  achterTekst,
  bepaalMensen,
  bepaalSprint,
  dagPlus,
  dagLabel,
  ingeplandVanaf,
  initialen,
  vrijdagVorigeWeek,
  werkdagenTerug,
  metReserveringen,
  parseBij,
  parsePlanning,
  parseReserveringen,
  parseTijd,
  reserveringPlanning,
  venster,
  vorigeTekst,
  wijsToe,
} from "./sprint.ts";
import type { BudgetMap } from "./orbit/budget-tekst.ts";

const PLAN = [
  "- 2026-10-12 09:00 | Anisha Sivakumaran | 2h | planned | 2044 Erfgoed Gelderland | Samenwerksprint + Ontwikkeling platform - Fase 1  / Project Management  (api_id: ACS9YK4EN8XSHB9)",
  "- 2026-10-13 09:00 | Brenda Leensvaart | 3h15 | fixed-time | 2044 Erfgoed Gelderland | Samenwerksprint + Ontwikkeling platform - Fase 1  / Design  (api_id: A2)",
  "- 2026-10-14 09:00 | Brenda Leensvaart | 3h | request | 2044 Erfgoed Gelderland | Fase 2  / Design  (api_id: A3)",
].join("\n");

const TIJD = [
  "- 2026-10-08 16:20 | Lennart Ter Haar | 0h10 | 1590 WO2NET | OvdR | Sprint 2026 - Toegankelijkheid / Coordinatie (PM & PL) — - Afstemming  (api_id: ACX4AMCN37TY56P) [locked: timesheet submitted (FINAL)]",
  "  tweede regel van een omschrijving",
  "- 2026-10-09 10:00 | Brenda Leensvaart | 2h | 1590 WO2NET | x | Sprint 2026 - Toegankelijkheid / Design  (api_id: B)",
].join("\n");

const regel = (
  naam: string,
  beschikbaar: number,
  geschreven: number,
  gepland = 0,
) => ({
  id: naam,
  naam,
  afgesloten: false,
  beschikbaar,
  geschreven,
  gepland,
});
const mappen: BudgetMap[] = [
  { id: "1", naam: "Vorige", regels: [regel("Oud", 600, 540)] },
  {
    id: "2",
    naam: "Fase 1",
    regels: [
      regel("Project Management", 600, 60, 120),
      regel("Design", 900, 120),
    ],
  },
  { id: "3", naam: "Fase 2", regels: [regel("Test", 300, 0, 60)] },
];

test("planning leest alleen planned en fixed-time", () => {
  assert.deepStrictEqual(parsePlanning(PLAN), [
    {
      datum: "2026-10-12",
      wie: "Anisha Sivakumaran",
      taak: "Project Management",
    },
    { datum: "2026-10-13", wie: "Brenda Leensvaart", taak: "Design" },
  ]);
  assert.deepStrictEqual(
    parsePlanning("No planning entries match these filters."),
    [],
  );
});

test("tijd slaat vervolgregels over en leest 0h10 en 2h", () => {
  assert.deepStrictEqual(
    parseTijd(TIJD).map((t) => [t.wie, t.taak, t.minuten]),
    [
      ["Lennart Ter Haar", "Coordinatie (PM & PL)", 10],
      ["Brenda Leensvaart", "Design", 120],
    ],
  );
});

test("bij t/m komt uit Days locked vanaf de maandag", () => {
  const tabel = [
    "| User | Registered | Capacity | % | Days locked | api_id |",
    "|---|---|---|---|---|---|",
    "| Brenda Leensvaart | 31h10 | 72h | 43% | 0/10 | US2XQ1ZXQCQKP4U |",
    "| Anisha Sivakumaran | 40h | 72h | 55% | 3/10 | U2 |",
  ].join("\n");
  assert.deepStrictEqual(parseBij(tabel, "2026-10-05"), [
    { wie: "Brenda Leensvaart", bijTm: null },
    { wie: "Anisha Sivakumaran", bijTm: "2026-10-07" },
  ]);
});

test("datums: venster, vrijdag vorige week en label", () => {
  assert.deepStrictEqual(venster("2026-10-15"), {
    van: "2026-10-05",
    tot: "2026-10-25",
  });
  assert.strictEqual(vrijdagVorigeWeek("2026-10-15"), "2026-10-09");
  assert.strictEqual(vrijdagVorigeWeek("2026-10-12"), "2026-10-09");
  assert.strictEqual(dagLabel("2026-10-14"), "wo 14 okt");
});

test("de huidige sprint, dag X van Y en vorige/hierna", () => {
  const sprint = bepaalSprint(mappen, parsePlanning(PLAN), "2026-10-15");
  assert.strictEqual(sprint?.map.naam, "Fase 1");
  assert.strictEqual(sprint?.wanneer, "dag 2 van 2");
  assert.strictEqual(sprint?.vorige?.naam, "Vorige");
  assert.deepStrictEqual(
    sprint?.hierna.map((m) => m.naam),
    ["Fase 2"],
  );
  assert.strictEqual(
    vorigeTekst(sprint?.vorige ?? null),
    "Vorige sprint 1u onder budget",
  );
  assert.strictEqual(
    bepaalSprint(mappen, parsePlanning(PLAN), "2026-10-09")?.wanneer,
    "Start ma 12 okt",
  );
});

test("achterlopers en compleet", () => {
  const sprint = bepaalSprint(mappen, parsePlanning(PLAN), "2026-10-15");
  assert.ok(sprint);
  const uren = [
    {
      datum: "2026-10-12",
      wie: "Anisha Sivakumaran",
      taak: "Project Management",
      minuten: 60,
    },
  ];
  const bereik = {
    regels: sprint.map.regels,
    start: sprint.start,
    planning: sprint.planning,
  };
  const achter = bepaalMensen(
    bereik,
    uren,
    [
      // Vorige week vastgezet (t/m zondag) is bij, ook al loopt deze week nog.
      { wie: "anisha sivakumaran", bijTm: "2026-10-11" },
      { wie: "Brenda Leensvaart", bijTm: null },
    ],
    "2026-10-15",
  );
  assert.deepStrictEqual(achter.achter, ["Brenda Leensvaart"]);
  assert.strictEqual(achter.compleetTm, null);
  assert.strictEqual(achter.perRegel["Project Management"][0].minuten, 60);
  const klaar = bepaalMensen(
    bereik,
    uren,
    [
      { wie: "Anisha Sivakumaran", bijTm: "2026-10-14" },
      { wie: "Brenda Leensvaart", bijTm: "2026-10-16" },
    ],
    "2026-10-15",
  );
  assert.strictEqual(klaar.compleetTm, "2026-10-14");
  assert.strictEqual(
    achterTekst(["A B", "C D", "E F", "G H"]),
    "A, C en nog 2 lopen achter met uren",
  );
  assert.strictEqual(initialen("Lennart Ter Haar"), "LH");
});

test("overig: laatst geschreven, mensen over meer mappen en ingepland vanaf", () => {
  const plan = parsePlanning(PLAN);
  assert.strictEqual(ingeplandVanaf(plan, "2026-10-12"), "2026-10-13");
  assert.strictEqual(ingeplandVanaf(plan, "2026-10-13"), null);
  const mensen = bepaalMensen(
    {
      regels: mappen.flatMap((map) => map.regels),
      start: "2026-09-18",
      planning: plan,
    },
    [
      { datum: "2026-10-01", wie: "Jos Bezemer", taak: "Oud", minuten: 30 },
      {
        datum: "2026-10-09",
        wie: "Brenda Leensvaart",
        taak: "Test",
        minuten: 5,
      },
    ],
    [{ wie: "Jos Bezemer", bijTm: "2026-10-14" }],
    "2026-10-15",
  );
  assert.strictEqual(mensen.laatst, "2026-10-09");
  assert.deepStrictEqual(
    mensen.perRegel["Oud"].map((p) => p.naam),
    ["Jos Bezemer"],
  );
  assert.deepStrictEqual(mensen.achter, [
    "Anisha Sivakumaran",
    "Brenda Leensvaart",
  ]);
});

const RES = [
  "- 2026-10-19 → 2026-10-24 | Mark Molendijk | 2851 IHC | Onsland | Doorontwikkeling 2026 / Sprint (nog te verdelen) | reserved 2h, used 0h, left 2h  (api_id: RVFUWTHVAVE15SE)",
  "- 2026-11-02 → 2026-11-14 | Lennart Ter Haar | 1590 WO2NET | OvdR | Sprint 2026 - Toegankelijkheid / Coordinatie (PM & PL) | reserved 4h45, used 0h, left 4h45  (api_id: RVHY25XJPFRGZT5)",
].join("\n");

test("reserveringen lezen taak, persoon en het open deel", () => {
  assert.deepStrictEqual(parseReserveringen(RES), [
    {
      van: "2026-10-19",
      tot: "2026-10-24",
      wie: "Mark Molendijk",
      taak: "Sprint (nog te verdelen)",
      minutenOver: 120,
    },
    {
      van: "2026-11-02",
      tot: "2026-11-14",
      wie: "Lennart Ter Haar",
      taak: "Coordinatie (PM & PL)",
      minutenOver: 285,
    },
  ]);
  assert.deepStrictEqual(
    parseReserveringen("No reservations match these filters."),
    [],
  );
});

test("het open deel van reserveringen telt op bij gepland", () => {
  const toe = wijsToe(
    [
      {
        id: "1",
        naam: "Sprint",
        regels: [regel("Sprint (nog te verdelen)", 600, 0, 60)],
      },
    ],
    parseReserveringen(RES),
  );
  const metRes = metReserveringen(
    [
      {
        id: "1",
        naam: "Sprint",
        regels: [regel("Sprint (nog te verdelen)", 600, 0, 60)],
      },
    ],
    toe,
  );
  assert.strictEqual(metRes[0].regels[0].gepland, 180);
  assert.strictEqual(mappen[1].regels[0].gepland, 120);
});

test("bij een dubbele taaknaam tellen alleen de reserveringen per taak", () => {
  const taak = "Sprint (nog te verdelen)";
  const ihc: BudgetMap[] = [
    {
      id: "a",
      naam: "Toegankelijkheid",
      regels: [{ ...regel(taak, 5400, 975), id: "a1" }],
    },
    {
      id: "b",
      naam: "Verhalen en Organisaties",
      regels: [{ ...regel(taak, 8580, 0), id: "b1" }],
    },
    { id: "c", naam: "Overig", regels: [{ ...regel("PM", 600, 0), id: "c1" }] },
  ];
  const res = (van: string, wie: string, minutenOver: number) => ({
    van,
    tot: dagPlus(van, 11),
    wie,
    taak,
    minutenOver,
  });
  const perProject = [
    res("2026-10-13", "Ivo", 120),
    res("2026-10-26", "Jos", 240),
    res("2026-11-02", "Mark", 4200),
    { ...res("2026-10-13", "Lenny", 60), taak: "PM" },
  ];
  const toe = wijsToe(ihc, perProject, {
    a1: [res("2026-10-13", "Ivo", 120), res("2026-11-02", "Mark", 4200)],
    b1: [res("2026-10-26", "Jos", 240)],
  });
  assert.deepStrictEqual(
    metReserveringen(ihc, toe).map((map) => map.regels[0].gepland),
    [4320, 240, 60],
  );
  const plan = reserveringPlanning(toe, "2026-10-15");
  assert.strictEqual(
    bepaalSprint(metReserveringen(ihc, toe), plan, "2026-10-15")?.map.naam,
    "Toegankelijkheid",
  );
});

test("een reservering volgende week maakt een sprintproject", () => {
  const res = parseReserveringen(
    "- 2026-10-19 → 2026-10-24 | Brenda Leensvaart | 2044 Erfgoed | x | Fase 2 / Test | reserved 2h, used 0h, left 2h  (api_id: R)",
  );
  const plan = reserveringPlanning(res, "2026-10-15");
  assert.strictEqual(plan.length, 5);
  assert.strictEqual(
    bepaalSprint(mappen, plan, "2026-10-15")?.map.naam,
    "Fase 2",
  );
});

test("werkdagenTerug slaat het weekend over", () => {
  assert.strictEqual(werkdagenTerug("2026-10-21", 5), "2026-10-14");
  assert.strictEqual(werkdagenTerug("2026-10-19", 1), "2026-10-16");
  assert.strictEqual(werkdagenTerug("2026-10-25", 5), "2026-10-19");
});
