import assert from "node:assert";
import { test } from "node:test";
import {
  conceptMail,
  deelKanaal,
  externeGenodigden,
  isEmail,
  poAdressen,
  slackKanaal,
  threadStand,
  voegToe,
} from "./notulen-delen.ts";
import type { Regel } from "./meetings.ts";

test("de PO uit de contactpersonen, ook als Product owner", () => {
  assert.deepStrictEqual(
    poAdressen([
      { naam: "Saskia", rol: "PO", email: "saskia@kunsthal.nl" },
      { naam: "Rik", rol: "Developer", email: "rik@kunsthal.nl" },
      { naam: "Merel", rol: " product owner ", email: "merel@kunsthal.nl" },
      { naam: "Daan", rol: "po", email: "SASKIA@kunsthal.nl" },
      { naam: "Lotte", rol: "PO" },
      { naam: "Kees", rol: "Projectowner", email: "kees@kunsthal.nl" },
      { naam: "Fout", rol: "PO", email: "geen-adres" },
    ]),
    ["saskia@kunsthal.nl", "merel@kunsthal.nl"],
  );
  assert.deepStrictEqual(poAdressen([]), []);
});

test("alle genodigden zijn de externe deelnemers", () => {
  assert.deepStrictEqual(
    externeGenodigden(
      ["saskia@kunsthal.nl", "misha@norday.nl", "Wade@Norday.nl"],
      "norday.nl",
    ),
    ["saskia@kunsthal.nl"],
  );
});

test("adressen: alleen geldige e-mail, zonder dubbele", () => {
  assert.ok(isEmail("saskia@kunsthal.nl"));
  assert.ok(isEmail("  s.de-groot+notulen@sub.kunsthal.nl "));
  for (const fout of [
    "saskia",
    "saskia@kunsthal",
    "a b@x.nl",
    "@x.nl",
    "a@x.nl, b@y.nl",
    "",
  ]) {
    assert.ok(!isEmail(fout), fout);
  }
  assert.deepStrictEqual(
    voegToe(
      ["saskia@kunsthal.nl"],
      ["Saskia@Kunsthal.nl", " rik@kunsthal.nl "],
    ),
    ["saskia@kunsthal.nl", "rik@kunsthal.nl"],
  );
});

test("het Slack-kanaal uit een link, een id of een naam", () => {
  assert.deepStrictEqual(
    slackKanaal("https://norday-agency.slack.com/archives/C01AB2CD3EF"),
    { kanaal: "C01AB2CD3EF", naam: null },
  );
  assert.deepStrictEqual(
    slackKanaal(
      "https://norday-agency.slack.com/archives/C01AB2CD3EF/p1700000000000",
    ),
    { kanaal: "C01AB2CD3EF", naam: null },
  );
  assert.deepStrictEqual(
    slackKanaal("https://app.slack.com/client/T0123ABC/G0456DEF7"),
    { kanaal: "G0456DEF7", naam: null },
  );
  assert.deepStrictEqual(slackKanaal("#client-services"), {
    kanaal: "client-services",
    naam: "#client-services",
  });
  assert.strictEqual(slackKanaal("https://norday.nl/geen-slack"), null);
  assert.strictEqual(slackKanaal("Client Services"), null);
});

const regel = (kanaal: string | null): Regel => ({
  soort: "serie",
  sleutel: "s1",
  doel: "team",
  titel: "Teamoverleg",
  vanaf: null,
  kanaal,
});

test("kanaal: Team uit de serie, een platform uit Slack intern, anders een melding", () => {
  const platforms = [
    {
      slug: "wo2",
      links: { "slack-intern": "https://x.slack.com/archives/C0WO2INTERN" },
    },
    { slug: "kh", links: {} },
  ];
  assert.deepStrictEqual(
    deelKanaal({ hoort: "wo2", label: "WO2", serieId: null }, platforms, []),
    { kanaal: "C0WO2INTERN", naam: "het interne kanaal" },
  );
  const team = { hoort: "team", label: "Team", serieId: "s1" };
  assert.deepStrictEqual(deelKanaal(team, platforms, [regel("#cs")]), {
    kanaal: "cs",
    naam: "#cs",
  });
  const zonder = deelKanaal(team, platforms, [regel(null)]);
  assert.ok("melding" in zonder && zonder.href === "/instellingen#team-series");
  const geenLink = deelKanaal(
    { hoort: "kh", label: "Kunsthal", serieId: null },
    platforms,
    [],
  );
  assert.ok(
    "melding" in geenLink && geenLink.href === "/platforms/kh/bewerken",
  );
});

test("verzonden herkennen aan SENT in de thread; weg als het concept weg is", () => {
  const thread = (...labels: string[][]) => ({
    messages: labels.map((labelIds) => ({ labelIds })),
  });
  assert.strictEqual(threadStand(thread(["DRAFT"])), "concept");
  assert.strictEqual(threadStand(thread(["SENT", "INBOX"])), "verstuurd");
  assert.strictEqual(threadStand(thread(["SENT"], ["INBOX"])), "verstuurd");
  assert.strictEqual(threadStand(thread()), "weg");
  assert.strictEqual(threadStand(null), "weg");
});

test("de mail heeft titel en datum in het onderwerp en de link in de tekst", () => {
  const mail = conceptMail(
    { titel: "Kunsthal | Planning", start: "2026-11-04T13:00:00+01:00" },
    "https://docs.superhuman.com/p",
    "Lennart",
  );
  assert.strictEqual(
    mail.onderwerp,
    "Notulen Kunsthal | Planning 4 november 2026",
  );
  assert.ok(mail.tekst.includes("https://docs.superhuman.com/p"));
});
