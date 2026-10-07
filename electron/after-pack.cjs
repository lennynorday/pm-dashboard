// electron-builder neemt nooit node_modules mee in extraResources; de server kopiëren we daarom zelf.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const app = `${context.packager.appInfo.productFilename}.app`;
  fs.cpSync(
    path.join(__dirname, "..", ".next", "standalone"),
    path.join(context.appOutDir, app, "Contents", "Resources", "server"),
    { recursive: true },
  );
};
