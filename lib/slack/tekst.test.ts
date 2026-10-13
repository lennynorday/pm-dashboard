import assert from "node:assert";
import { test } from "node:test";
import { platteTekst } from "./tekst.ts";

const namen = new Map([["U1", "Sanne de Vries"]]);

test("een vermelding wordt @Volledige Naam, ook met label", () => {
  assert.strictEqual(
    platteTekst("hoi <@U1> en <@U1|sanne>", namen),
    "hoi @Sanne de Vries en @Sanne de Vries",
  );
});

test("een onbekende gebruiker wordt @onbekend, nooit een id", () => {
  assert.strictEqual(
    platteTekst("hoi <@U9> en <@U9|x>", namen),
    "hoi @onbekend en @onbekend",
  );
});

test("een link wordt het label", () => {
  assert.strictEqual(platteTekst("zie <https://a|label>", namen), "zie label");
});
