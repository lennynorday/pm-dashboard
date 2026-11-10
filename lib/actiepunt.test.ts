import assert from "node:assert";
import { test } from "node:test";
import {
  delenVan,
  isExtern,
  isIedereen,
  isVanMij,
  kandidaten,
  koppelNaam,
  leesActies,
  nieuweActies,
} from "./actiepunt.ts";

const NOTULEN = `**Aanwezig:** Lennart ter Haar (Norday), Theo (WO2)

## 1. Status en planning
- Planning loopt
- **Actie Lennart:** bij Lisanne inchecken.

## 2. Hosting en domein
- **Actie Theo:** de DNS-wijziging doorgeven.
- **Actie Jos de Vries:**   docentenoproep schrijven
- **Actie Misha:**
- gewone bullet met **vet** erin`;

test("leest elke actie met eigenaar en onderwerp", () => {
  assert.deepStrictEqual(leesActies(NOTULEN), [
    {
      eigenaar: "Lennart",
      wat: "bij Lisanne inchecken.",
      onderwerp: "Status en planning",
    },
    {
      eigenaar: "Theo",
      wat: "de DNS-wijziging doorgeven.",
      onderwerp: "Hosting en domein",
    },
    {
      eigenaar: "Jos de Vries",
      wat: "docentenoproep schrijven",
      onderwerp: "Hosting en domein",
    },
  ]);
});

test("geen acties en acties boven de eerste kop", () => {
  assert.deepStrictEqual(
    leesActies("**Aanwezig:** Jos\n\n## 1. Iets\n- niets"),
    [],
  );
  assert.deepStrictEqual(leesActies("- **Actie Jos:** bellen"), [
    { eigenaar: "Jos", wat: "bellen", onderwerp: null },
  ]);
});

test("van Lenny: Lennart, Lenny, volledige naam of de voornaam uit de sessie", () => {
  assert.ok(isVanMij("Lennart", "Lennart"));
  assert.ok(isVanMij("lenny", "Lennart"));
  assert.ok(isVanMij(" Lennart  ter Haar ", "Lennart"));
  assert.ok(isVanMij("Len", "Len"));
  assert.ok(!isVanMij("Theo", "Lennart"));
  assert.ok(isVanMij("Lennart en Theo", "Lennart"));
});

const PERSONEN = [
  { id: "U1", naam: "Jos de Vries" },
  { id: "U2", naam: "Misha Bakker" },
  { id: "U3", naam: "Misha Jansen" },
  { id: "U4", naam: "Zoë Smit" },
];

test("koppelt een naam op volledige naam of eenduidige voornaam", () => {
  assert.strictEqual(koppelNaam("Jos", PERSONEN)?.id, "U1");
  assert.strictEqual(koppelNaam("jos de vries", PERSONEN)?.id, "U1");
  assert.strictEqual(koppelNaam("Misha Jansen", PERSONEN)?.id, "U3");
  assert.strictEqual(koppelNaam("Zoe", PERSONEN)?.id, "U4");
});

test("niet eenduidig of niet gevonden: kiezen", () => {
  assert.strictEqual(koppelNaam("Misha", PERSONEN), null);
  assert.strictEqual(koppelNaam("Theo", PERSONEN), null);
  assert.strictEqual(koppelNaam("", PERSONEN), null);
});

test("extern is wie niet in de Slack-leden zit", () => {
  const leden = [
    { id: "U1", naam: "Lisanne de Vries" },
    { id: "U2", naam: "Jos Bakker" },
    { id: "U3", naam: "Jos Smit" },
  ];
  assert.strictEqual(isExtern("Theo", leden), true);
  assert.strictEqual(isExtern("Lisanne", leden), false);
  assert.strictEqual(isExtern("lisanne de vries", leden), false);
  assert.strictEqual(isExtern("Jos", leden), false);
  assert.strictEqual(isExtern("Theo", null), false);
  assert.strictEqual(isExtern("Theo", []), false);
});

test("nieuweActies: bestaande acties blijven, nieuwe nummeren verder", () => {
  const gelezen = [
    { eigenaar: "Theo", wat: "Offerte sturen", onderwerp: null },
    { eigenaar: "Kim", wat: "Planning maken", onderwerp: "Planning" },
  ];
  // Theo's actie staat al op gedaan (volgnummer 3); opnieuw uitlezen mag hem niet terugzetten.
  const uit = nieuweActies(gelezen, [
    { eigenaar: "theo", wat: "Offerte sturen ", volgnummer: 3 },
  ]);
  assert.deepStrictEqual(uit, [
    {
      eigenaar: "Kim",
      wat: "Planning maken",
      onderwerp: "Planning",
      volgnummer: 4,
    },
  ]);
  assert.deepStrictEqual(
    nieuweActies(gelezen, []).map((a) => a.volgnummer),
    [0, 1],
  );
});

test("groepen: van mij als één deel van mij is, extern als niemand een collega is", () => {
  const leden = [
    { id: "U1", naam: "Lisanne de Vries" },
    { id: "U2", naam: "Kim Jansen" },
  ];
  assert.deepStrictEqual(delenVan("Theo, Kim & Jos/Ans en Henk"), [
    "Theo",
    "Kim",
    "Jos",
    "Ans",
    "Henk",
  ]);
  assert.strictEqual(isVanMij("Theo en Lennart", "Lennart"), true);
  assert.strictEqual(isVanMij("Theo en Kim", "Lennart"), false);
  assert.strictEqual(isExtern("Theo en Kim", leden), false);
  assert.strictEqual(isExtern("Theo & Ans", leden), true);
  // Allen en iedereen zijn intern, maar niet te herinneren.
  assert.strictEqual(isExtern("Allen", leden), false);
  assert.strictEqual(isIedereen("iedereen"), true);
  assert.strictEqual(isIedereen("Kim"), false);
});

test("kandidaten: bij een groep alleen de collega's eruit", () => {
  const leden = [
    { id: "U1", naam: "Lisanne de Vries" },
    { id: "U2", naam: "Kim Jansen" },
    { id: "U3", naam: "Jos Smit" },
  ];
  assert.deepStrictEqual(
    kandidaten("Theo, Kim en Jos", leden).map((p) => p.id),
    ["U2", "U3"],
  );
  assert.strictEqual(kandidaten("Kim", leden).length, 3);
  assert.strictEqual(kandidaten("Theo en Ans", leden).length, 3);
});
