// Desktop-schil: start de Next-server lokaal op poort 3999 en toont hem in een eigen venster.
const {
  app,
  BrowserWindow,
  dialog,
  shell,
  utilityProcess,
} = require("electron");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const POORT = 3999;
const ADRES = `http://localhost:${POORT}`;

// Zo heet de map in Application Support, ook als je de app vanuit de repo start.
app.setName("PM Dashboard");

// Google weigert inloggen in een ingebouwde browser die zich als Electron meldt.
app.userAgentFallback = app.userAgentFallback.replace(
  /\s(Electron|PM Dashboard)\/\S+/g,
  "",
);

let server = null;

/** Per gebruiker een eigen sleutel, bij de eerste start aangemaakt en daarna hergebruikt. */
function sleutel(map) {
  const bestand = path.join(map, "sleutel");
  if (!fs.existsSync(bestand)) {
    fs.writeFileSync(bestand, randomBytes(32).toString("base64"), {
      mode: 0o600,
    });
  }
  return fs.readFileSync(bestand, "utf8").trim();
}

function poortVrij(poort) {
  return new Promise((resolve) => {
    const proef = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => proef.close(() => resolve(true)))
      .listen(poort, "localhost");
  });
}

/** Wacht tot de server antwoordt; geeft op na een minuut. */
async function wachtOpServer() {
  for (let poging = 0; poging < 120; poging++) {
    try {
      await fetch(ADRES, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("De server startte niet binnen een minuut.");
}

function stop(titel, melding) {
  dialog.showErrorBox(titel, melding);
  app.quit();
}

app.whenReady().then(async () => {
  if (!(await poortVrij(POORT))) {
    stop(
      "PM Dashboard kan niet starten",
      `Poort ${POORT} is al in gebruik, waarschijnlijk door een PM Dashboard dat al open is. Sluit dat, en open de app daarna opnieuw.`,
    );
    return;
  }

  const map = app.getPath("userData");
  fs.mkdirSync(map, { recursive: true });
  const serverMap = app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(__dirname, "..", ".next", "standalone");
  const geheimen = JSON.parse(
    fs.readFileSync(path.join(serverMap, "geheimen.json"), "utf8"),
  );

  server = utilityProcess.fork(path.join(serverMap, "server.js"), [], {
    cwd: serverMap,
    stdio: "inherit",
    env: {
      ...process.env,
      ...geheimen,
      NODE_ENV: "production",
      PORT: String(POORT),
      HOSTNAME: "localhost",
      PM_DATA_DIR: map,
      TOKEN_ENCRYPTION_KEY: sleutel(map),
    },
  });
  server.once("exit", () => app.quit());

  try {
    await wachtOpServer();
  } catch (error) {
    stop("PM Dashboard kan niet starten", error.message);
    return;
  }

  const venster = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "PM Dashboard",
  });
  // Links naar Jira, Slack en Superhuman openen in je eigen browser.
  venster.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  venster.loadURL(ADRES);
});

// Venster dicht is app dicht, ook op de Mac; de server stopt mee.
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => server?.kill());
