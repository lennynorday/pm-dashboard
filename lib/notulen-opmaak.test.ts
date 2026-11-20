import assert from "node:assert";
import { test } from "node:test";
import { htmlNaarMd, type Knoop, mdNaarHtml } from "./notulen-opmaak.ts";

const t = (tekst: string): Knoop => ({
  nodeType: 3,
  nodeName: "#text",
  textContent: tekst,
  childNodes: [],
});
const el = (nodeName: string, ...kinderen: Knoop[]): Knoop => ({
  nodeType: 1,
  nodeName,
  textContent: null,
  childNodes: kinderen,
});

const NOTULEN = [
  "**Aanwezig:** Lennart (Norday), Femke (Loket)  ",
  "**Doel:** planning afstemmen.",
  "",
  "## 1. Planning fase 2",
  "",
  "- Start in week 48, *voorlopig*",
  "- **Actie Lennart:** offerte uitwerken",
].join("\n");

test("Markdown wordt veilige HTML met koppen, lijsten, vet en cursief", () => {
  assert.strictEqual(
    mdNaarHtml(NOTULEN),
    "<p><strong>Aanwezig:</strong> Lennart (Norday), Femke (Loket)<br><strong>Doel:</strong> planning afstemmen.</p>" +
      "<h3>1. Planning fase 2</h3>" +
      "<ul><li>Start in week 48, <em>voorlopig</em></li><li><strong>Actie Lennart:</strong> offerte uitwerken</li></ul>",
  );
  assert.strictEqual(mdNaarHtml("<script>x</script>"), "<p>&lt;script&gt;x&lt;/script&gt;</p>");
  assert.strictEqual(mdNaarHtml("1. een\n2. twee"), "<ol><li>een</li><li>twee</li></ol>");
  assert.strictEqual(mdNaarHtml("snake_case_naam"), "<p>snake_case_naam</p>");
});

test("het veld wordt weer dezelfde Markdown", () => {
  const veld = el(
    "DIV",
    el("P", el("STRONG", t("Aanwezig:")), t(" Lennart (Norday), Femke (Loket)"), el("BR"), el("STRONG", t("Doel:")), t(" planning afstemmen.")),
    el("H3", t("1. Planning fase 2")),
    el("UL", el("LI", t("Start in week 48, "), el("EM", t("voorlopig"))), el("LI", el("STRONG", t("Actie Lennart:")), t(" offerte uitwerken"))),
  );
  assert.strictEqual(htmlNaarMd(veld), NOTULEN);
});

test("wat de browser maakt: <b>, <i>, <div>-regels, spaties binnen vet, genummerd", () => {
  const veld = el(
    "DIV",
    t("Losse regel"),
    el("DIV", el("B", t("vet ")), t("en "), el("I", t("schuin"))),
    el("DIV", el("BR")),
    el("OL", el("LI", t("een")), el("LI", t("twee"))),
  );
  assert.strictEqual(htmlNaarMd(veld), "Losse regel\n\n**vet** en *schuin*\n\n1. een\n2. twee");
});

test("een spreker-verwijzing wordt een naam-knop en weer een verwijzing", () => {
  assert.strictEqual(
    mdNaarHtml('- **Actie [[Speaker 1|Eva "x" Smit]]:** bellen'),
    '<ul><li><strong>Actie <span data-spreker="Speaker 1" data-naam="Eva &quot;x&quot; Smit" contenteditable="false" role="button" tabindex="0">Speaker 1</span>:</strong> bellen</li></ul>',
  );
  const knop = (spreker: string, naam: string | null): Knoop => ({
    ...el("SPAN", t("Eva")),
    getAttribute: (attr) => (attr === "data-spreker" ? spreker : attr === "data-naam" ? naam : null),
  });
  assert.strictEqual(
    htmlNaarMd(el("DIV", el("UL", el("LI", el("STRONG", t("Actie "), knop("Speaker 1", null), t(":")), t(" bellen"))))),
    "- **Actie [[Speaker 1]]:** bellen",
  );
  assert.strictEqual(htmlNaarMd(el("DIV", el("P", knop("Speaker 2", "Femke"), t(" belt")))), "[[Speaker 2|Femke]] belt");
});
