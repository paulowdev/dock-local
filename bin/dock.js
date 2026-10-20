#!/usr/bin/env node
// Self-contained entrypoint: builds dist/ on first run so `node <path>/bin/dock.js`
// works straight from a checkout (no registry needed).
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(root, "dist", "cli.js");

if (!existsSync(entry)) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const steps = existsSync(join(root, "node_modules")) ? [["run", "build"]] : [["install", "--no-audit", "--no-fund"], ["run", "build"]];
  console.error("dock-local: first run, building…");
  for (const args of steps) {
    const r = spawnSync(npm, args, { cwd: root, stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`dock-local: \`npm ${args.join(" ")}\` failed in ${root}.`);
      process.exit(r.status ?? 1);
    }
  }
}

import(entry).then((m) => m.main(process.argv)).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
