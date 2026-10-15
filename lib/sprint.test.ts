import assert from "node:assert";
import { test } from "node:test";
import {
  achterTekst,
  bepaalMensen,
  bepaalSprint,
  dagLabel,
  ingeplandVanaf,
  initialen,
  vrijdagVorigeWeek,
  parseBij,
  parsePlanning,
  parseTijd,
  venster,
  vorigeTekst,
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
