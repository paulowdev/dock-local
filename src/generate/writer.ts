import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CatalogEntry } from "../catalog/types.js";
import { dockDir, packageRoot } from "../util/paths.js";
import { render, type Ctx } from "../util/template.js";
import { APP_SERVICE, appService, buildCompose, composeYaml } from "./compose.js";
import type { Plan } from "./plan.js";
import { writeState, type DockState } from "./state.js";

export interface WriteOptions {
  /** overwrite seed files the user may have customised */
  force?: boolean;
}

export interface Written {
  dir: string;
  files: string[];
  appEnv: Record<string, string>;
}

export function writeStack(projectDir: string, plan: Plan, state: DockState, opts: WriteOptions = {}): Written {
  const dir = dockDir(projectDir);
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const out = (rel: string, content: string, overwrite = true, exec = false) => {
    const abs = join(dir, rel);
    if (!overwrite && existsSync(abs)) return;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    if (exec) chmodSync(abs, 0o755);
    files.push(rel);
  };

  const env = mergeEnv(join(dir, ".env"), plan, state.project, state.app);
  out(".env", envFile(env));

  const appEnv = buildAppEnv(plan, env);
  const doc = buildCompose(plan, state.project, state.registry);
  if (state.app) doc.services[APP_SERVICE] = appService(plan, env, appEnv, state.app, state.registry);
  out("docker-compose.yml", composeYaml(doc));

  const ctx = renderContext(plan, state, env);
  for (const entry of plan.runnable) {
    for (const seed of entry.seeds ?? []) {
      const tpl = readFileSync(join(packageRoot(), "templates", seed.template), "utf8");
      out(seed.path, render(tpl, ctx), opts.force ?? false, seed.executable);
    }
  }

  out("app.env", appEnvFile(appEnv));
  writeState(projectDir, state);
  files.push("dock.json");
  return { dir, files, appEnv };
}

/** Existing `.env` values win over catalog defaults, so user edits survive regeneration. */
function mergeEnv(path: string, plan: Plan, project: string, app?: DockState["app"]): Record<string, string> {
  const current = existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
  const merged: Record<string, string> = { COMPOSE_PROJECT_NAME: `${project}-dock` };
  if (app) merged.APP_PORT = app.port;
  for (const entry of [...plan.runnable, ...plan.selected]) for (const [k, v] of Object.entries(entry.env ?? {})) merged[k] = v;
  for (const [k, v] of Object.entries(current)) merged[k] = v;
  return merged;
}

function envFile(env: Record<string, string>): string {
  return "# dock-local stack variables. Edit freely; `dock init` keeps your values.\n" +
    Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) out[m[1]!] = m[2]!.replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

/** `${VAR}` in catalog values resolved with the merged .env so hints are copy-pasteable. */
export function interpolate(value: string, env: Record<string, string>): string {
  return value.replace(/\$\{([A-Z0-9_]+)(?::-([^}]*))?\}/gi, (_, k: string, d = "") => env[k] ?? d);
}

function buildAppEnv(plan: Plan, env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of [...plan.selected, ...plan.runnable]) {
    for (const [k, v] of Object.entries(entry.appEnv ?? {})) out[k] = interpolate(v, env);
  }
  return out;
}

function appEnvFile(appEnv: Record<string, string>): string {
  return "# Point your application at the local stack: `set -a; source .dock/app.env; set +a` (or import in your IDE run config).\n" +
    Object.entries(appEnv).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

function renderContext(plan: Plan, state: DockState, env: Record<string, string>): Ctx {
  const consumers: Record<string, CatalogEntry[]> = {};
  for (const [k, v] of plan.consumers) consumers[k] = v;
  const services: Record<string, boolean> = {};
  for (const e of [...plan.selected, ...plan.runnable]) services[e.id.replace(/-/g, "_")] = true;
  const resources: Record<string, string[]> = { ...plan.resources };
  for (const [k, v] of Object.entries(resources)) resources[k] = v.slice().sort();
  return { project: state.project, registry: state.registry, env, resources, services, consumers };
}
