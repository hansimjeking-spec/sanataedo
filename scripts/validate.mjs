import fs from "node:fs";

const html = fs.readFileSync(new URL("../case-management/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../case-management/app.js", import.meta.url), "utf8");
const requiredIds = [
  "dashboardView",
  "currentViewTitle",
  "dashboardTotalClients",
  "caseStageOverview",
  "dashboardCaseAlerts",
  "clientsView",
  "caseworkView",
  "processView",
  "clientForm",
  "caseClientSelect",
  "caseOverviewForm",
  "genogramEditorDialog",
  "genogramEditorStatus",
  "regenerateGenogram",
  "resourcesView",
  "resourceForm"
];

const missing = requiredIds.filter((id) => !html.includes(`id="${id}"`));
if (missing.length) {
  throw new Error(`Missing required HTML ids: ${missing.join(", ")}`);
}
if (!app.includes("normalizeCaseManagement")) {
  throw new Error("Case-management state migration is missing");
}
if (!fs.existsSync(new URL("../genogram/app.js", import.meta.url))) {
  throw new Error("Integrated genogram editor is missing");
}
for (const file of ["../api/google-auth.js", "../api/google-cases.js", "../lib/google-drive.js"]) {
  if (!fs.existsSync(new URL(file, import.meta.url))) throw new Error(`Google Drive integration is missing: ${file}`);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) {
  throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(", ")}`);
}

const dynamicIds = new Set(["programClientIds", "processGoal", "processService", "processDuration", "dashboardCaseAlerts"]);
const referencedIds = [...app.matchAll(/\$\("#([A-Za-z][\w:-]*)"\)/g)].map((match) => match[1]);
const unresolved = referencedIds.filter((id) => !ids.includes(id) && !dynamicIds.has(id));
if (unresolved.length) {
  throw new Error(`JavaScript references missing HTML ids: ${[...new Set(unresolved)].join(", ")}`);
}

const genogramHtml = fs.readFileSync(new URL("../genogram/index.html", import.meta.url), "utf8");
if (!genogramHtml.includes('id="caseSaveButton"') || !fs.readFileSync(new URL("../genogram/app.js", import.meta.url), "utf8").includes("SARYE_GENOGRAM_SAVE")) {
  throw new Error("Genogram parent integration is incomplete");
}
if (!genogramHtml.includes('href="/genogram/styles.css') || !genogramHtml.includes('src="/genogram/app.js')) {
  throw new Error("Genogram assets must use deployment-safe absolute paths");
}

console.log("Static validation passed");
