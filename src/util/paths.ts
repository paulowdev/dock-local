import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Root of the installed package (works from src/ via tsx and from dist/). */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "catalog"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("dock-local: cannot locate package root");
}

export const DOCK_DIR = ".dock";

export function dockDir(projectDir: string): string {
  return resolve(projectDir, DOCK_DIR);
}
