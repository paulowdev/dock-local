import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadCatalog } from "../catalog/loader.js";
import type { Catalog, CatalogEntry } from "../catalog/types.js";
import { expand, type Plan } from "../generate/plan.js";
import { readState, type DockState } from "../generate/state.js";
import { writeStack, type Written } from "../generate/writer.js";
import { run } from "../util/exec.js";
import { dockDir } from "../util/paths.js";

export interface Ctx {
  projectDir: string;
  catalog: Catalog;
}

export function context(dir?: string): Ctx {
  return { projectDir: resolve(dir ?? process.cwd()), catalog: loadCatalog() };
}

export function requireState(projectDir: string): DockState {
  const state = readState(projectDir);
  if (!state || !existsSync(join(dockDir(projectDir), "docker-compose.yml"))) {
    throw new Error("no stack found in .dock/. Run `dock init` first.");
  }
  return state;
}

/** Rebuild the plan from persisted state (used by add/remove/regenerate). */
export function planFromState(state: DockState, catalog: Catalog): Plan {
  const selected = state.services.map((id) => catalog.resolve(id)).filter((e): e is CatalogEntry => Boolean(e));
  return expand(selected, catalog, [], state.resources, new Set(state.exclude), state.minimal);
}

export function regenerate(projectDir: string, state: DockState, catalog: Catalog, force = false): Written {
  return writeStack(projectDir, planFromState(state, catalog), state, { force });
}

export function compose(projectDir: string, args: string[]): Promise<number> {
  const dir = dockDir(projectDir);
  return run("docker", ["compose", "-f", join(dir, "docker-compose.yml"), "--env-file", join(dir, ".env"), ...args], { cwd: dir });
}

export const splitList = (v?: string): string[] => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
