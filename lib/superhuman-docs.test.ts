import assert from "node:assert";
import { test } from "node:test";
import { docIdUitLink, paginaIdUitLink } from "./superhuman-docs.ts";

test("docIdUitLink haalt het doc-id uit de link in de accountgegevens", () => {
  assert.strictEqual(
    docIdUitLink("https://docs.superhuman.com/d/_dsOpoo6eGAx"),
    "sOpoo6eGAx",
  );
  assert.strictEqual(
    docIdUitLink("https://docs.superhuman.com/d/_dQ47L79r1LA/_sufdJvI4"),
    "Q47L79r1LA",
  );
  assert.strictEqual(
    docIdUitLink("https://coda.io/d/WO2-Intern_dQ47L79r1LA#_lu"),
    "Q47L79r1LA",
  );
  assert.strictEqual(docIdUitLink("https://example.com/map"), null);
});

test("paginaIdUitLink vindt dezelfde pagina met of zonder paginanaam", () => {
  assert.strictEqual(
    paginaIdUitLink("https://docs.superhuman.com/d/_d1iIzGZvA6Q/_suOaNM9q"),
    "OaNM9q",
  );
  assert.strictEqual(
    paginaIdUitLink(
      "https://docs.superhuman.com/d/Boijmans_d1iIzGZvA6Q/Notulen-intern_suOaNM9q#_lu",
    ),
    "OaNM9q",
  );
  assert.strictEqual(
    paginaIdUitLink("https://docs.superhuman.com/d/_d1iIzGZvA6Q"),
    null,
  );
});
