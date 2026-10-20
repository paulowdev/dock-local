import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import pc from "picocolors";
import { detect } from "../detect/index.js";
import { buildPlan } from "../generate/plan.js";
import { projectName, readState, resolveRegistry, type DockState } from "../generate/state.js";
import { writeStack } from "../generate/writer.js";
import { log } from "../util/log.js";
import { BackgroundPreflight, getDockerPreflightChecks, displayPreflightResults } from "../util/preflight.js";
import { context, splitList } from "./context.js";
import { planJson, printPlan, printReport } from "./report.js";
import { upCommand } from "./stack.js";

export interface InitOptions {
  yes?: boolean;
  services?: string;
  exclude?: string;
  registry?: string;
  minimal?: boolean;
  threshold?: string;
  force?: boolean;
  json?: boolean;
  docs?: boolean;
  /** Dockerfile path relative to the project (true = ./Dockerfile). */
  app?: string | boolean;
  appPort?: string;
  up?: boolean;
}

export function resolveApp(projectDir: string, flag: string | boolean | undefined, port: string | undefined, previous?: DockState["app"]): DockState["app"] {
  if (flag === undefined) return previous;
  const dockerfile = typeof flag === "string" ? flag : "Dockerfile";
  if (!existsSync(join(projectDir, dockerfile))) throw new Error(`--app: ${dockerfile} not found in ${projectDir}`);
  return { dockerfile, port: port ?? previous?.port ?? guessPort(join(projectDir, dockerfile)) };
}

const guessPort = (dockerfile: string): string => /^\s*EXPOSE\s+(\d+)/im.exec(readFileSync(dockerfile, "utf8"))?.[1] ?? "8080";

export async function initCommand(dir: string | undefined, opts: InitOptions): Promise<void> {
  const ctx = context(dir);
  const previous = readState(ctx.projectDir);

  // Start Docker preflight checks in parallel (non-blocking)
  const preflight = new BackgroundPreflight(getDockerPreflightChecks());

  const report = await detect(ctx.projectDir, { docs: opts.docs });
  const include = [...splitList(opts.services), ...(previous?.services ?? [])];
  const exclude = [...splitList(opts.exclude), ...(previous?.exclude ?? [])];
  const plan = buildPlan(report.detections, ctx.catalog, {
    include, exclude, minimal: opts.minimal ?? previous?.minimal,
    threshold: opts.threshold ? Number(opts.threshold) : undefined,
  });

  if (!plan.runnable.length) {
    if (opts.json) { console.log(JSON.stringify({ ok: false, reason: "nothing to run", plan: planJson(plan) })); return; }
    printReport(report);
    log.warn("nothing to run. Pick services explicitly: dock init --services postgres,kafka (see `dock list`).");
    return;
  }

  if (!opts.json) { printReport(report); printPlan(plan, ctx.catalog); }
  if (!opts.yes && !opts.json && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`\nGenerate .dock/ with this stack? ${pc.dim("[Y/n/edit] ")}`)).trim().toLowerCase();
    rl.close();
    if (answer === "n" || answer === "no") { log.info("aborted. Use --services/--exclude to adjust."); return; }
    if (answer === "e" || answer === "edit") {
      log.info("re-run with flags, e.g.  dock init --services postgres,kafka --exclude wiremock");
      return;
    }
  }

  const state: DockState = {
    version: 1,
    project: previous?.project ?? projectName(ctx.projectDir),
    registry: resolveRegistry(opts.registry, previous),
    services: plan.selected.map((e) => e.id),
    exclude: [...new Set(exclude)],
    minimal: opts.minimal ?? previous?.minimal ?? false,
    app: resolveApp(ctx.projectDir, opts.app, opts.appPort, previous?.app),
    resources: plan.resources,
    updatedAt: "",
  };
  const written = writeStack(ctx.projectDir, plan, state, { force: opts.force });

  // Wait for preflight checks before proceeding to `up` (if requested)
  if (opts.up) {
    log.info(pc.dim("\nchecking Docker environment..."));
    const preflightResults = await preflight.wait();
    const allOk = displayPreflightResults(preflightResults, false);
    if (!allOk) {
      log.error("Cannot start stack due to critical Docker environment issues. Run `dock doctor` for details.");
      process.exitCode = 1;
      return;
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, dir: written.dir, files: written.files, app: state.app ?? null, appEnv: written.appEnv, plan: planJson(plan) }, null, 2));
  } else {
    log.ok(`generated ${written.files.length} files in ${pc.bold(".dock/")}`);
    log.info(pc.dim("  " + written.files.join("  ")));
    if (state.app) log.info(`${pc.cyan("•")} app service from ${state.app.dockerfile} on port ${state.app.port} (profile \`app\`: \`dock up --app\`)`);
    if (!opts.up) log.info(`\n${pc.bold("Next")}\n  dock up            ${pc.dim("start the stack")}\n  dock status        ${pc.dim("health + UI links")}\n  source .dock/app.env  ${pc.dim("or import it in your IDE run config")}`);
    if (state.registry) log.info(pc.dim(`images pulled through ${state.registry} (override: --registry \"\" or DOCK_REGISTRY)`));
  }
  if (opts.up) await upCommand([], { app: Boolean(state.app) && opts.app !== undefined, dir: ctx.projectDir });
}
