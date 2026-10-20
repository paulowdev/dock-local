import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { dockDir } from "../util/paths.js";

export const DEFAULT_REGISTRY = "";

/** Persisted in `.dock/dock.json` so add/remove/regenerate are idempotent. */
export interface DockState {
  version: 1;
  project: string;
  registry: string;
  services: string[];
  exclude: string[];
  minimal: boolean;
  /** `--app`: run the project's own image inside the stack (compose profile `app`). */
  app?: { dockerfile: string; port: string };
  resources: Record<string, string[]>;
  updatedAt: string;
}

export function statePath(projectDir: string): string {
  return join(dockDir(projectDir), "dock.json");
}

export function readState(projectDir: string): DockState | undefined {
  const p = statePath(projectDir);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as DockState) : undefined;
}

export function writeState(projectDir: string, state: DockState): void {
  writeFileSync(statePath(projectDir), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2) + "\n");
}

export function projectName(projectDir: string): string {
  return basename(projectDir).toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || "app";
}

export function resolveRegistry(flag?: string, state?: DockState): string {
  const v = flag ?? process.env.DOCK_REGISTRY ?? state?.registry ?? DEFAULT_REGISTRY;
  return v.replace(/\/+$/, "");
}
