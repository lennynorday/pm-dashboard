// Maakt .next/standalone klaar voor de desktop-app, na `next build`.
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

/** Wat de app nodig heeft zonder .env.local; de versleutelingssleutel maakt elke gebruiker zelf. */
const GEHEIMEN = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "JIRA_CLIENT_ID",
  "JIRA_CLIENT_SECRET",
  "ORBIT_CLIENT_ID",
  "SUPERHUMAN_API_TOKEN",
];

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Geen .next/standalone/server.js; draai eerst next build.");
}

// Server.js levert static en public niet zelf mee. Van public alleen de lettertypes, geen mockups.
fs.cpSync(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);
fs.cpSync(
  path.join(root, "public", "fonts"),
  path.join(standalone, "public", "fonts"),
  { recursive: true },
);

// Niets persoonlijks in de app: geen eigen database of tokens, geen .env-bestanden.
fs.rmSync(path.join(standalone, "data"), { recursive: true, force: true });
for (const bestand of fs.readdirSync(standalone)) {
  if (bestand.startsWith(".env")) fs.rmSync(path.join(standalone, bestand));
}

const env = parseEnv(fs.readFileSync(path.join(root, ".env.local"), "utf8"));
const ontbreekt = GEHEIMEN.filter((naam) => !env[naam]);
if (ontbreekt.length > 0) {
  throw new Error(`Ontbreekt in .env.local: ${ontbreekt.join(", ")}`);
}
fs.writeFileSync(
  path.join(standalone, "geheimen.json"),
  JSON.stringify(Object.fromEntries(GEHEIMEN.map((naam) => [naam, env[naam]]))),
);
console.log("Server klaar in .next/standalone");
