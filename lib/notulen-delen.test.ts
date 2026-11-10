import assert from "node:assert";
import { test } from "node:test";
import {
  conceptMail,
  deelAfgerond,
  isNetwerkFout,
  metActies,
  parseOnderdeel,
  deelKanaal,
  externeGenodigden,
  isEmail,
  poAdressen,
  slackKanaal,
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

test("Delen is klaar als elk onderdeel verstuurd of overgeslagen is", () => {
  assert.strictEqual(deelAfgerond(["open", "verstuurd"]), "open");
  assert.strictEqual(deelAfgerond(["verstuurd", "overgeslagen"]), "gedeeld");
  assert.strictEqual(deelAfgerond(["verstuurd"]), "gedeeld");
  assert.strictEqual(deelAfgerond(["overgeslagen", "overgeslagen"]), "niet");
  assert.strictEqual(deelAfgerond(["overgeslagen"]), "niet");
  // Onzeker na een time-out: niet afgerond, en geen nieuwe verzendknop (geen open).
  assert.strictEqual(deelAfgerond(["onzeker", "verstuurd"]), "open");
  assert.deepStrictEqual(parseOnderdeel("onzeker", null), {
    stand: "onzeker",
    url: null,
  });
  assert.strictEqual(parseOnderdeel(null, null).stand, "open");
});

test("de mail heeft titel en datum in het onderwerp en de link in de tekst", () => {
  const mail = conceptMail(
    { titel: "Kunsthal | Planning", start: "2026-11-04T13:00:00+01:00" },
    "https://docs.superhuman.com/p",
    "Lennart",
    [{ eigenaar: "Jos", wat: "docentenoproep schrijven" }],
  );
  assert.strictEqual(
    mail.onderwerp,
    "Notulen Kunsthal | Planning 4 november 2026",
  );
  assert.ok(mail.tekst.includes("https://docs.superhuman.com/p"));
  assert.ok(mail.tekst.includes("• Jos: docentenoproep schrijven"));
  const zonder = conceptMail(
    { titel: "Kunsthal | Planning", start: "2026-11-04T13:00:00+01:00" },
    "https://docs.superhuman.com/p",
    "Lennart",
    [],
  );
  assert.ok(!zonder.tekst.includes("Acties:"));
});

test("isNetwerkFout: time-out en netwerkfout wel, een HTTP-fout niet", () => {
  assert.ok(isNetwerkFout(new DOMException("weg", "TimeoutError")));
  assert.ok(isNetwerkFout(new DOMException("weg", "AbortError")));
  assert.ok(isNetwerkFout(new TypeError("fetch failed")));
  assert.ok(!isNetwerkFout(new Error("Gmail gaf status 500")));
});

test("metActies: de acties uit de actuele notulen in het Slack-bericht", () => {
  const nieuw = [{ eigenaar: "Kim", wat: "planning maken" }];
  assert.strictEqual(
    metActies(
      "Notulen staan klaar: url\n\nActies:\n• Theo: offerte\n• Jos: x",
      nieuw,
    ),
    "Notulen staan klaar: url\n\nActies:\n• Kim: planning maken",
  );
  // De link die parseSlackBericht erachter zette, blijft staan.
  assert.strictEqual(
    metActies("Klaar.\n\nActies:\n• Theo: offerte\nurl", nieuw),
    "Klaar.\n\nActies:\n• Kim: planning maken\nurl",
  );
  assert.strictEqual(
    metActies("Klaar: url", nieuw),
    "Klaar: url\n\nActies:\n• Kim: planning maken",
  );
  assert.strictEqual(
    metActies("Klaar: url\n\nActies:\n• Theo: offerte", []),
    "Klaar: url",
  );
});
