import { readFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { APP_PROFILE, APP_SERVICE } from "../generate/compose.js";
import { parseEnv } from "../generate/writer.js";
import { capture } from "../util/exec.js";
import { log, table } from "../util/log.js";
import { dockDir } from "../util/paths.js";
import { compose, context, requireState } from "./context.js";

export async function upCommand(services: string[], opts: { foreground?: boolean; pull?: boolean; app?: boolean; build?: boolean; dir?: string }): Promise<void> {
  const ctx = context(opts.dir);
  const state = requireState(ctx.projectDir);
  if (opts.app && !state.app) throw new Error("no app service configured. Run `dock init --app [Dockerfile]` (or `dock add app`).");
  const args = [
    ...(opts.app ? ["--profile", APP_PROFILE] : []),
    "up", ...(opts.foreground ? [] : ["-d", "--wait"]), ...(opts.pull ? ["--pull", "always"] : []), ...(opts.build ? ["--build"] : []),
    "--remove-orphans", ...services,
  ];
  const code = await compose(ctx.projectDir, args);
  if (code !== 0) { log.error("compose up failed. Try `dock doctor` and `dock logs <service>`."); process.exitCode = code; return; }
  if (!opts.foreground) await statusCommand(opts.dir);
}

export async function downCommand(opts: { volumes?: boolean }): Promise<void> {
  const ctx = context();
  requireState(ctx.projectDir);
  process.exitCode = await compose(ctx.projectDir, ["--profile", APP_PROFILE, "down", "--remove-orphans", ...(opts.volumes ? ["--volumes"] : [])]);
}

export async function logsCommand(services: string[], opts: { follow?: boolean; tail?: string }): Promise<void> {
  const ctx = context();
  requireState(ctx.projectDir);
  process.exitCode = await compose(ctx.projectDir, ["logs", "--tail", opts.tail ?? "100", ...(opts.follow ? ["-f"] : []), ...services]);
}

export async function statusCommand(projectDir?: string): Promise<void> {
  const ctx = context(projectDir);
  const state = requireState(ctx.projectDir);
  const dir = dockDir(ctx.projectDir);
  const ps = capture("docker", ["compose", "-f", join(dir, "docker-compose.yml"), "--env-file", join(dir, ".env"), "ps", "--format", "json"], dir);
  if (!ps.ok) { log.error(ps.out || "docker compose ps failed"); return; }
  const rows = ps.out.split("\n").filter(Boolean).map((l) => JSON.parse(l) as { Service: string; State: string; Health?: string; Status: string });
  if (!rows.length) { log.info("stack is down. Run `dock up`."); return; }
  log.info(table(rows.map((r) => [r.Service, colorState(r.State, r.Health), r.Status]), ["service", "state", "status"]));
  const appEnv = parseEnv(readFileSync(join(dir, "app.env"), "utf8"));
  const urls = Object.entries(appEnv).filter(([k, v]) => k.endsWith("_URL") && /^https?:\/\//.test(v) && /UI|GRAFANA|PROMETHEUS|JAEGER|KEYCLOAK|WIREMOCK|KAFKA_UI|RABBITMQ_UI/.test(k));
  if (urls.length) log.info("\n" + urls.map(([k, v]) => `${pc.dim(k.padEnd(18))} ${v}`).join("\n"));
  if (state.app && rows.some((r) => r.Service === APP_SERVICE)) {
    const port = parseEnv(readFileSync(join(dir, ".env"), "utf8")).APP_PORT ?? state.app.port;
    log.info(`${pc.dim("APP".padEnd(18))} http://localhost:${port}`);
  }
  log.info(pc.dim("\napp config: .dock/app.env"));
}

export function envCommand(opts: { export?: boolean }): void {
  const ctx = context();
  requireState(ctx.projectDir);
  const text = readFileSync(join(dockDir(ctx.projectDir), "app.env"), "utf8");
  console.log(opts.export ? text.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => `export ${l}`).join("\n") : text);
}

function colorState(state: string, health?: string): string {
  const s = health ? `${state} (${health})` : state;
  if (health === "unhealthy" || state === "exited") return pc.red(s);
  if (health === "starting") return pc.yellow(s);
  return state === "running" ? pc.green(s) : s;
}
