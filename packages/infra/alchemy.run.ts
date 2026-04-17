import alchemy from "alchemy";
import { ReactRouter } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const app = await alchemy("campus-cafe");

export const web = await ReactRouter("web", {
	cwd: "../../apps/web",
	bindings: {
		VITE_CONVEX_URL: alchemy.env.VITE_CONVEX_URL!,
		VITE_CONVEX_SITE_URL: alchemy.env.VITE_CONVEX_SITE_URL!,
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
