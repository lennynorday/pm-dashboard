import assert from "node:assert";
import { test } from "node:test";
import {
  type AgendaItem,
  alsWoordIn,
  bepaalMeetings,
  hoortBij,
  lokaal,
  naastElkaar,
  type Regel,
  titelWoord,
  weekVan,
} from "./meetings.ts";

const PLATFORMS = [
  { slug: "kunsthal", naam: "Kunsthal", roepnamen: ["KH"] },
  { slug: "kunsthal-kids", naam: "Kunsthal Kids", roepnamen: [] },
  { slug: "wo2", naam: "Tweedewereldoorlog.nl", roepnamen: ["TWO"] },
];

const item = (extra: Partial<AgendaItem>): AgendaItem => ({
  id: "e1",
  serieId: null,
  titel: "Overleg",
  start: "2026-11-10T10:00:00+01:00",
  eind: "2026-11-10T11:00:00+01:00",
  deelnemers: ["collega@norday.nl"],
  ...extra,
});

const regel = (extra: Partial<Regel>): Regel => ({
  soort: "meeting",
  sleutel: "e1",
  doel: "kunsthal",
  titel: "Overleg",
  vanaf: null,
  kanaal: null,
  ...extra,
});

test("weekVan: maandag t/m vrijdag met ISO-weeknummer", () => {
  assert.deepStrictEqual(weekVan("2026-11-12"), {
    maandag: "2026-11-09",
    dagen: [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ],
    nummer: 46,
    label: "Week 46 · 9–13 nov",
  });
  assert.strictEqual(weekVan("2026-12-01").label, "Week 49 · 30 nov–4 dec");
  // 1 januari 2027 is een vrijdag: die week is nog week 53 van 2026.
  assert.strictEqual(weekVan("2027-01-01").nummer, 53);
  assert.strictEqual(weekVan("2027-01-04").nummer, 1);
});

test("lokaal: rekent in Nederlandse tijd, ook rond de zomertijd", () => {
  assert.deepStrictEqual(lokaal("2026-11-10T08:30:00Z"), {
    datum: "2026-11-10",
    minuten: 9 * 60 + 30,
  });
  assert.deepStrictEqual(lokaal("2026-07-01T07:00:00Z"), {
    datum: "2026-07-01",
    minuten: 9 * 60,
  });
});

test("alsWoordIn: alleen hele woorden, hoofdletterongevoelig", () => {
  assert.ok(alsWoordIn("CMU | Sprintreview", "cmu"));
  assert.ok(
    alsWoordIn("Kick-off Tweedewereldoorlog.nl", "tweedewereldoorlog.nl"),
  );
  assert.ok(!alsWoordIn("CMUX overleg", "CMU"));
  assert.ok(!alsWoordIn("Kunsthalle", "Kunsthal"));
  assert.ok(!alsWoordIn("Overleg", " "));
});

test("titelWoord: wat vóór de streep staat, anders de hele titel", () => {
  assert.strictEqual(titelWoord("CMU | Sprintreview"), "CMU");
  assert.strictEqual(titelWoord("Accountoverleg Zoie"), "Accountoverleg Zoie");
});

test("hoortBij: herkenning", () => {
  assert.strictEqual(
    hoortBij(item({ titel: "Kunsthal | Planning" }), PLATFORMS, []),
    "kunsthal",
  );
  assert.strictEqual(
    hoortBij(item({ titel: "Kunsthal Kids demo" }), PLATFORMS, []),
    "kunsthal-kids",
  );
  assert.strictEqual(
    hoortBij(item({ titel: "KH | Planning" }), PLATFORMS, []),
    "kunsthal",
  );
  assert.strictEqual(
    hoortBij(item({ titel: "Kickoff two" }), PLATFORMS, []),
    "wo2",
  );
  assert.strictEqual(
    hoortBij(item({ titel: "1-op-1 Wade" }), PLATFORMS, []),
    "prive",
  );
});

test("hoortBij: meeting gaat voor serie, serie voor herkenning", () => {
  const afspraak = item({ titel: "Kunsthal | Sprintreview", serieId: "s1" });
  const serie = regel({ soort: "serie", sleutel: "s1", doel: "team" });
  const meeting = regel({ doel: "prive" });
  assert.strictEqual(hoortBij(afspraak, PLATFORMS, []), "kunsthal");
  assert.strictEqual(hoortBij(afspraak, PLATFORMS, [serie]), "team");
  assert.strictEqual(hoortBij(afspraak, PLATFORMS, [serie, meeting]), "prive");
});

test("hoortBij: een serieregel geldt pas vanaf zijn startmoment", () => {
  const afspraak = item({ serieId: "s1", titel: "Kunsthal" });
  const later = regel({
    soort: "serie",
    sleutel: "s1",
    doel: "team",
    vanaf: Date.parse("2026-11-11T10:00:00+01:00"),
  });
  assert.strictEqual(hoortBij(afspraak, PLATFORMS, [later]), "kunsthal");
});

test("hoortBij: een regel naar een verdwenen platform telt niet", () => {
  assert.strictEqual(
    hoortBij(item({ titel: "Kunsthal" }), PLATFORMS, [regel({ doel: "weg" })]),
    "kunsthal",
  );
});

test("naastElkaar: overlappende meetings krijgen een eigen kolom", () => {
  const uit = naastElkaar([
    { id: "a", begin: 540, eind: 600 },
    { id: "b", begin: 570, eind: 630 },
    { id: "c", begin: 600, eind: 660 },
    { id: "d", begin: 700, eind: 720 },
  ]);
  const plek = Object.fromEntries(
    uit.map((m) => [m.id, [m.kolom, m.kolommen]]),
  );
  assert.deepStrictEqual(plek, { a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
});

test("bepaalMeetings: extern, overgeslagen, buiten de week en focusblokken", () => {
  const week = weekVan("2026-11-09");
  const meetings = bepaalMeetings(
    [
      item({
        id: "x",
        deelnemers: ["theo@museum.nl", "a@norday.nl"],
        serieId: "s1",
      }),
      item({
        id: "y",
        start: "2026-11-14T10:00:00+01:00",
        eind: "2026-11-14T11:00:00+01:00",
      }),
      item({ id: "z" }),
      item({ id: "focus", titel: "Focus: offertes", deelnemers: [] }),
    ],
    week,
    PLATFORMS,
    [],
    [
      { soort: "serie", sleutel: "s1", titel: "Overleg" },
      { soort: "meeting", sleutel: "z", titel: "Overleg" },
    ],
    "norday.nl",
    Date.parse("2026-11-10T10:30:00+01:00"),
  );
  assert.deepStrictEqual(
    meetings.map((m) => [
      m.id,
      m.extern,
      m.overgeslagen,
      m.van,
      m.tot,
      m.afgelopen,
    ]),
    [
      ["x", true, "serie", "10:00", "11:00", false],
      ["z", false, "meeting", "10:00", "11:00", false],
    ],
  );
});

test("bepaalMeetings: wat op Privé terugvalt is standaard overgeslagen", () => {
  const week = weekVan("2026-11-09");
  const nu = Date.parse("2026-11-10T10:30:00+01:00");
  const maak = (regels: Regel[], metNotulen = new Set<string>()) =>
    bepaalMeetings(
      [
        item({ id: "los" }),
        item({ id: "kh", titel: "Kunsthal sprint" }),
        item({ id: "gezet" }),
        item({ id: "run" }),
      ],
      week,
      PLATFORMS,
      regels,
      [],
      "norday.nl",
      nu,
      metNotulen,
    ).map((m) => [m.id, m.hoort, m.overgeslagen]);
  assert.deepStrictEqual(
    maak([regel({ sleutel: "gezet", doel: "prive" })], new Set(["run"])),
    [
      ["los", "prive", "prive"],
      ["kh", "kunsthal", null],
      ["gezet", "prive", null],
      ["run", "prive", null],
    ],
  );
});
