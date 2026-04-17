/**
 * One-shot script: generates PNG app icons from the SVG template.
 * Run: node scripts/generate-pwa-icons.mjs (from apps/web)
 */
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicIcons = join(root, "public", "icons");
const svgPath = join(publicIcons, "icon.svg");

await mkdir(publicIcons, { recursive: true });

const svg = await readFile(svgPath);

const sizes = [
	{ name: "icon-192.png", size: 192 },
	{ name: "icon-512.png", size: 512 },
	{ name: "icon-maskable-512.png", size: 512 },
	{ name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
	const pipeline = sharp(svg).resize(size, size, {
		fit: "contain",
		background: { r: 10, g: 10, b: 10, alpha: 1 },
	});
	await pipeline.png().toFile(join(publicIcons, name));
}

console.log("Wrote PNG icons to public/icons/");
