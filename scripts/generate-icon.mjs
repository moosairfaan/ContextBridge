import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public/icons/icon128.svg");
const pngPath = join(root, "public/icons/icon128.png");

const svg = readFileSync(svgPath);

await sharp(svg, { density: 288 })
  .resize(128, 128)
  .png()
  .toFile(pngPath);

console.log(`[ContextBridge] Wrote ${pngPath}`);
