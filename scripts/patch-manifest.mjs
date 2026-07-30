import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "../dist/manifest.json");
const hostsPath = join(__dirname, "../public/hosts.json");

const hosts = JSON.parse(readFileSync(hostsPath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

manifest.host_permissions = [
  ...hosts.host_permissions,
  ...(hosts.api_host_permissions ?? []),
];
manifest.content_scripts = [
  {
    matches: hosts.content_script_matches,
    js: ["content-script.js"],
    run_at: "document_idle",
  },
];

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("[ContextBridge] Patched dist/manifest.json with host_permissions and content_scripts");
