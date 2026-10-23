import assert from "node:assert";
import { test } from "node:test";
import { parseKlantId } from "./klanten.ts";

const tabel = [
  "| Company | Type | City | VAT | Owner (api_id) | Segments (api_ids) | Enabled |",
  "|---|---|---|---|---|---|---|",
  "| Gemeente Amsterdam | CLIENT | AMSTERDAM, NL | NL002564440B01 |  |  | yes |",
  "| Norday B.V. | BOTH | ROTTERDAM, NL | NL852973081B01 |  |  | yes |",
  "",
  "api_ids: CLF9R3B7FNZGASV, CLJMYP43UQMEDF9",
].join("\r\n");

test("de kopregel met de VAT-kolom telt niet als klant", () => {
  assert.equal(parseKlantId(tabel, "Gemeente Amsterdam"), "CLF9R3B7FNZGASV");
  assert.equal(parseKlantId(tabel, "Norday B.V."), "CLJMYP43UQMEDF9");
  assert.equal(parseKlantId(tabel, "Company"), null);
});
