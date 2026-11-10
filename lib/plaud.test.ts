import assert from "node:assert";
import { test } from "node:test";
import {
  parseDuur,
  parseFile,
  parseRecent,
  opnamesRondDag,
  parseTranscript,
  verdeelOpnames,
} from "./plaud.ts";
import { plaudWebUrl } from "./notulen-stand.ts";

// Echte uitvoer van plaud 0.3.15.
const RECENT = `
Recordings in the last 5 days: 3

  of_a065acd1c1d9990a6e199b280ba2fefe  2026-11-05 16:32:00  2026-11-05  37m30s
  of_22ea9c573f0d8489f4b743fc28babd78  [WO2] 11-04 Projectoverleg: Prototype-ontwikkeling en Voorbereiding Kick-off WO2-platform  2026-11-04  41m52s
  of_9db852e396cdf590d668016b64959693  11-05 Projectoverleg: Kick-off Redactieteam  2026-11-05  1h02m07s
`;

const FILE = `- Fetching file...

File Details:

  id:           of_a065acd1c1d9990a6e199b280ba2fefe
  name:         2026-11-05 16:32:00
  created_at:   2026-11-05T16:09:34
  start_at:     2026-11-05T15:32:00.922000
  duration:     37m30s
  serial_number: 1793892720922
  audio:        available
  transcript:   unavailable
  summary:      unavailable
`;

const TRANSCRIPT = `- Fetching transcript...
Transcript: [WO2] 11-04 Projectoverleg: Prototype-ontwikkeling

[00:04 - 01:03] Speaker 1: Hé Lennie, goedemorgen. Hoe is ie?
[01:03 - 02:00] Speaker 2: Ja, precies. De wereld draait toch door.
`;

test("parseRecent leest id, naam met spaties en datum, zonder kop", () => {
  assert.deepStrictEqual(parseRecent(RECENT), [
    {
      id: "of_a065acd1c1d9990a6e199b280ba2fefe",
      naam: "2026-11-05 16:32:00",
      datum: "2026-11-05",
    },
    {
      id: "of_22ea9c573f0d8489f4b743fc28babd78",
      naam: "[WO2] 11-04 Projectoverleg: Prototype-ontwikkeling en Voorbereiding Kick-off WO2-platform",
      datum: "2026-11-04",
    },
    {
      id: "of_9db852e396cdf590d668016b64959693",
      naam: "11-05 Projectoverleg: Kick-off Redactieteam",
      datum: "2026-11-05",
    },
  ]);
});

test("parseFile leest start_at als UTC en of er een transcript is", () => {
  assert.deepStrictEqual(parseFile(FILE), {
    id: "of_a065acd1c1d9990a6e199b280ba2fefe",
    start: Date.parse("2026-11-05T15:32:00.922Z"),
    duurMs: (37 * 60 + 30) * 1000,
    transcript: false,
  });
  assert.strictEqual(
    parseFile(
      FILE.replace("transcript:   unavailable", "transcript:   available"),
    )?.transcript,
    true,
  );
  assert.strictEqual(parseFile("✗ [NOT_FOUND] File not found"), null);
});

test("parseDuur leest uren, minuten en seconden", () => {
  assert.strictEqual(parseDuur("37m30s"), 2_250_000);
  assert.strictEqual(parseDuur("1h02m07s"), 3_727_000);
  assert.strictEqual(parseDuur("45s"), 45_000);
  assert.strictEqual(parseDuur("onbekend"), 0);
});

test("parseTranscript houdt alleen de gesproken regels over", () => {
  assert.strictEqual(
    parseTranscript(TRANSCRIPT),
    "[00:04 - 01:03] Speaker 1: Hé Lennie, goedemorgen. Hoe is ie?\n[01:03 - 02:00] Speaker 2: Ja, precies. De wereld draait toch door.",
  );
  assert.strictEqual(
    parseTranscript(
      '- Fetching transcript...\nNo "transaction" transcript for this recording. Available: (none).',
    ),
    "",
  );
});

test("verdeelOpnames koppelt op overlap in UTC, de langste overlap wint", () => {
  // Meeting 16:30–17:15 Nederlandse tijd (UTC+1) = 15:30–16:15 UTC.
  const meeting = {
    id: "m",
    start: Date.parse("2026-11-05T16:30:00+01:00"),
    eind: Date.parse("2026-11-05T17:15:00+01:00"),
  };
  const opname = parseFile(FILE);
  assert.ok(opname);
  const geen = new Set<string>();
  assert.strictEqual(
    verdeelOpnames([meeting], [opname], geen).get("m"),
    opname.id,
  );

  const kort = { ...opname, id: "kort", start: meeting.start, duurMs: 60_000 };
  assert.strictEqual(
    verdeelOpnames([meeting], [kort, opname], geen).get("m"),
    opname.id,
  );

  // Als start_at lokale tijd zou zijn, lag hij een uur later en buiten de meeting.
  const later = { ...opname, start: meeting.eind };
  assert.strictEqual(verdeelOpnames([meeting], [later], geen).size, 0);
});

test("verdeelOpnames: een opname hoort bij één meeting, de langste overlap", () => {
  const ms = (tijd: string) => Date.parse(`2026-11-04T${tijd}:00+01:00`);
  const kickoff = { id: "kickoff", start: ms("13:30"), eind: ms("16:00") };
  const theo = { id: "theo", start: ms("16:00"), eind: ms("16:30") };
  const opname = {
    id: "of_wo2",
    start: ms("13:33"),
    duurMs: ms("16:11") - ms("13:33"),
    transcript: true,
  };
  const geen = new Set<string>();
  assert.deepStrictEqual(
    [...verdeelOpnames([kickoff, theo], [opname], geen)],
    [["kickoff", "of_wo2"]],
  );
  // Al gekoppeld aan de kick-off: Theo blijft wachten op een opname.
  assert.strictEqual(
    verdeelOpnames([kickoff, theo], [opname], new Set(["of_wo2"])).size,
    0,
  );
});

test("verdeelOpnames: zonder de helft van meeting en opname geen koppeling", () => {
  const ms = (tijd: string) => Date.parse(`2026-11-04T${tijd}:00+01:00`);
  const meeting = { id: "m", start: ms("10:00"), eind: ms("11:00") };
  const opname = (van: string, tot: string) => ({
    id: `of_${van}`,
    start: ms(van),
    duurMs: ms(tot) - ms(van),
    transcript: true,
  });
  const geen = new Set<string>();
  // Een collega neemt op van 10:45 tot 11:30: een kwart van de meeting.
  assert.strictEqual(
    verdeelOpnames([meeting], [opname("10:45", "11:30")], geen).size,
    0,
  );
  // Een opname van de hele dag: de meeting is maar een klein deel ervan.
  assert.strictEqual(
    verdeelOpnames([meeting], [opname("08:00", "17:00")], geen).size,
    0,
  );
  assert.strictEqual(
    verdeelOpnames([meeting], [opname("10:05", "11:10")], geen).get("m"),
    "of_10:05",
  );
});

test("plaudWebUrl laat of_ weg", () => {
  assert.strictEqual(
    plaudWebUrl("of_9e7c39949756c4b78019c878b249d9f3"),
    "https://web.plaud.ai/file/9e7c39949756c4b78019c878b249d9f3",
  );
});

test("opnamesRondDag houdt de dag zelf en de dagen ernaast, ook over een maandgrens", () => {
  const opname = (datum: string) => ({ id: `of_${datum}`, naam: "x", datum });
  const lijst = [
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
  ].map(opname);
  assert.deepStrictEqual(
    opnamesRondDag(lijst, "2026-11-01").map((o) => o.datum),
    ["2026-10-31", "2026-11-01", "2026-11-02"],
  );
});
