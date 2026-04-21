import alchemy from "alchemy";
import { ReactRouter } from "alchemy/cloudflare";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.dirname(fileURLToPath(import.meta.url));
const webAppDir = path.join(monorepoRoot, "apps", "web");
const infraDir = path.join(monorepoRoot, "packages", "infra");

config({ path: path.join(infraDir, ".env") });
config({ path: path.join(webAppDir, ".env") });

const app = await alchemy("campus-cafe", {
	rootDir: monorepoRoot,
});

export const web = await ReactRouter("web", {
	cwd: webAppDir,
	bindings: {
		VITE_CONVEX_URL: alchemy.env.VITE_CONVEX_URL!,
		VITE_CONVEX_SITE_URL: alchemy.env.VITE_CONVEX_SITE_URL!,
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
