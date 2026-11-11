import assert from "node:assert";
import { test } from "node:test";
import {
  leesWeggelaten,
  parsePassages,
  zetPassageTerug,
} from "./weggelaten.ts";

test("leest regels met en zonder onderwerpnummer", () => {
  assert.deepStrictEqual(leesWeggelaten("- [2] Marco is te laat\n\n- los"), [
    { onderwerp: 2, tekst: "Marco is te laat" },
    { onderwerp: null, tekst: "los" },
  ]);
  assert.deepStrictEqual(leesWeggelaten("geen"), []);
});

test("parsePassages verdraagt rommel", () => {
  assert.deepStrictEqual(parsePassages(null), []);
  assert.deepStrictEqual(parsePassages("{"), []);
  assert.deepStrictEqual(parsePassages('[{"onderwerp":1,"tekst":"a"},3]'), [
    { onderwerp: 1, tekst: "a" },
  ]);
});

test("terugzetten komt onderaan het juiste onderwerp", () => {
  const notulen = "**Aanwezig:** X\n\n## 1. Een\n- a\n\n## 2. Twee\n- b";
  assert.strictEqual(
    zetPassageTerug(notulen, { onderwerp: 1, tekst: "c" }),
    "**Aanwezig:** X\n\n## 1. Een\n- a\n- c\n\n## 2. Twee\n- b",
  );
  assert.strictEqual(
    zetPassageTerug(notulen, { onderwerp: 2, tekst: "c" }),
    `${notulen}\n- c`,
  );
  assert.strictEqual(
    zetPassageTerug(notulen, { onderwerp: 9, tekst: "c" }),
    `${notulen}\n- c`,
  );
});
