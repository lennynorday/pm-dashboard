import assert from "node:assert";
import { test } from "node:test";
import { parseMappen, parseProjectUren } from "./budget-tekst.ts";

test("regels met haakjes achter de uren en met planner-uren worden gelezen", () => {
  const tekst = [
    "**Change management**  [chapter api_id: FPE54GQ9GHKXZP2]",
    "- Change management (8u per maand)  [api_id: PTGX6D1Z9RVFUEX]  planned 65h (bills reserved hours), done 64h 52m  assigned: Joca van der Horst",
    "- Overleg & Administatie  [api_id: PTWY9MU6KT2M4K5]  planned 17h 12m, done 13h 55m, scheduled in the planner 3h  assigned: Joca van der Horst",
    "- Incident management Januari  [api_id: PTA6NG25WJJESPQ]  (closed)  planned 4h, done 0m",
  ].join("\n");
  const regels = parseMappen(tekst)[0].regels.map((r) => [
    r.afgesloten,
    r.beschikbaar,
    r.geschreven,
    r.gepland,
  ]);
  assert.deepStrictEqual(regels, [
    [false, 3900, 3892, 0],
    [false, 1032, 835, 180],
    [true, 240, 0, 0],
  ]);
});

test("de startdatum komt uit de periode van het project", () => {
  assert.strictEqual(
    parseProjectUren("- **Period:** 2026-01-01 → 2026-12-31").start,
    "2026-01-01",
  );
  assert.strictEqual(parseProjectUren("geen periode").start, null);
});
