import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(monorepoRoot);

const args = process.argv.slice(2);
const alchemyArgs = args.length > 0 ? args : ["dev"];
const result = spawnSync("bun", ["x", "alchemy", ...alchemyArgs], {
	cwd: monorepoRoot,
	stdio: "inherit",
	shell: false,
	env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
