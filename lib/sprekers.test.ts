import assert from "node:assert";
import { test } from "node:test";
import {
  leesSprekers,
  parseSprekers,
  verwijzing,
  vulNamenIn,
} from "./sprekers.ts";

const SPREKERS = [
  { label: "Speaker 1", naam: "Lennart ter Haar", citaat: "" },
  { label: "Speaker 2", naam: "Noor Bakker", citaat: "" },
];

test("vulNamenIn: volledig bij Aanwezig, elders de voornaam, een eigen naam wint", () => {
  const md = [
    "**Aanwezig:** [[Speaker 1]] (Norday), [[Speaker 2]] (Norday)",
    "- [[Speaker 2]] vindt het haalbaar, [[Speaker 1|Eva Smit]] niet",
    "- **Actie [[Speaker 1]]:** offerte maken",
    "- **Actie [[Speaker 2|Femke]]:** testers uitnodigen",
    "- **Actie [[Speaker 3]]:** onbekend",
  ].join("\n");
  assert.strictEqual(
    vulNamenIn(md, SPREKERS),
    [
      "**Aanwezig:** Lennart ter Haar (Norday), Noor Bakker (Norday)",
      "- Noor vindt het haalbaar, Eva niet",
      "- **Actie Lennart:** offerte maken",
      "- **Actie Femke:** testers uitnodigen",
      "- **Actie Speaker 3:** onbekend",
    ].join("\n"),
  );
});

test("vulNamenIn laat een omschrijving heel en tekst zonder verwijzingen gelijk", () => {
  const sprekers = [
    { label: "Speaker 1", naam: "iemand van Kunsthal", citaat: "" },
  ];
  assert.strictEqual(
    vulNamenIn("- [[Speaker 1]] belt", sprekers),
    "- iemand van Kunsthal belt",
  );
  assert.strictEqual(
    vulNamenIn("- Lennart belt [x]", sprekers),
    "- Lennart belt [x]",
  );
});

test("verwijzing haalt tekens weg die de verwijzing zouden breken", () => {
  assert.strictEqual(verwijzing("Speaker 1"), "[[Speaker 1]]");
  assert.strictEqual(
    verwijzing("Speaker 1", "Femke | ]x"),
    "[[Speaker 1|Femke x]]",
  );
});

test("leesSprekers en parseSprekers", () => {
  assert.deepStrictEqual(
    leesSprekers("- [[Speaker 1]] = Noor Bakker | “Ja prima.”\nrommel\n"),
    [{ label: "Speaker 1", naam: "Noor Bakker", citaat: "Ja prima." }],
  );
  assert.deepStrictEqual(parseSprekers(JSON.stringify(SPREKERS)), SPREKERS);
  assert.deepStrictEqual(parseSprekers("geen json"), []);
  assert.deepStrictEqual(
    parseSprekers([{ label: "S1" }, { label: "S2", naam: "Noor", citaat: 3 }]),
    [{ label: "S2", naam: "Noor", citaat: "" }],
  );
});
