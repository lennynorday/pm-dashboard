import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { zetFout, zetStap } from "./notulen-stap.ts";

function metRij(stap: number, opnameId: string | null) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE notulen (email TEXT, meeting_id TEXT, stap INTEGER, sinds INTEGER,
    opname_id TEXT, tekst TEXT, pagina_url TEXT, weggelaten TEXT, fout TEXT, bezig INTEGER)`);
  db.prepare(
    "INSERT INTO notulen (email, meeting_id, stap, sinds, opname_id) VALUES ('a', 'm', ?, 0, ?)",
  ).run(stap, opnameId);
  const rij = () => db.prepare("SELECT * FROM notulen").get();
  return { db, rij };
}

test("zetStap: het resultaat telt als de rij nog staat zoals de run hem aantrof", () => {
  const { db, rij } = metRij(3, "of_a");
  assert.equal(
    zetStap(
      db,
      "a",
      "m",
      4,
      { stap: 3, opnameId: "of_a" },
      { tekst: "notulen" },
    ),
    true,
  );
  assert.equal(rij()?.stap, 4);
  assert.equal(rij()?.tekst, "notulen");
});

test("zetStap: rij teruggezet tijdens een run, het resultaat wordt genegeerd", () => {
  const { db, rij } = metRij(3, "of_a");
  // zetOpname tijdens de run: andere opname, terug naar stap 2.
  db.exec("UPDATE notulen SET stap = 2, opname_id = 'of_b'");
  assert.equal(
    zetStap(db, "a", "m", 4, { stap: 3, opnameId: "of_a" }, { tekst: "oud" }),
    false,
  );
  // Ook als een nieuwe ronde de rij alweer op stap 3 zette.
  db.exec("UPDATE notulen SET stap = 3");
  assert.equal(
    zetStap(db, "a", "m", 4, { stap: 3, opnameId: "of_a" }, { tekst: "oud" }),
    false,
  );
  zetFout(db, "a", "m", "Claude faalde", { stap: 3, opnameId: "of_a" });
  assert.equal(rij()?.stap, 3);
  assert.equal(rij()?.tekst, null);
  assert.equal(rij()?.fout, null);
});
