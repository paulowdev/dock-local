import pc from "picocolors";
import { log, table } from "../util/log.js";
import { APP_SERVICE } from "../generate/compose.js";
import { context, regenerate, requireState } from "./context.js";
import { resolveApp } from "./init.js";

export function addCommand(services: string[], opts: { force?: boolean; appPort?: string }): void {
  const ctx = context();
  const state = requireState(ctx.projectDir);
  for (const q of services) {
    if (q === APP_SERVICE) { state.app = resolveApp(ctx.projectDir, true, opts.appPort, state.app); continue; }
    const entry = ctx.catalog.resolve(q);
    if (!entry) throw new Error(`unknown service "${q}" (see: dock list)`);
    if (entry.kind === "report-only" || entry.kind === "runtime") throw new Error(`"${entry.id}" is ${entry.kind}; nothing to run`);
    if (!state.services.includes(entry.id)) state.services.push(entry.id);
    state.exclude = state.exclude.filter((x) => x !== entry.id);
  }
  const w = regenerate(ctx.projectDir, state, ctx.catalog, opts.force);
  log.ok(`stack updated (${w.files.length} files). Run \`dock up\` to apply.`);
}

export function removeCommand(services: string[]): void {
  const ctx = context();
  const state = requireState(ctx.projectDir);
  for (const q of services) {
    if (q === APP_SERVICE) { delete state.app; continue; }
    const id = ctx.catalog.resolve(q)?.id ?? q;
    state.services = state.services.filter((s) => s !== id);
    if (!state.exclude.includes(id)) state.exclude.push(id);
  }
  regenerate(ctx.projectDir, state, ctx.catalog);
  log.ok("stack updated. Run `dock up` (and `docker compose rm` for removed containers) to apply.");
}

export function listCommand(opts: { category?: string; json?: boolean; all?: boolean }): void {
  const { catalog } = context();
  let entries = catalog.entries.filter((e) => opts.all || (e.kind !== "report-only" && e.kind !== "runtime"));
  if (opts.category) entries = entries.filter((e) => e.category === opts.category);
  if (opts.json) {
    console.log(JSON.stringify(entries.map((e) => ({ id: e.id, name: e.name, kind: e.kind, category: e.category, aliases: e.aliases ?? [], provider: e.provider })), null, 2));
    return;
  }
  log.info(table(
    entries.map((e) => [e.id, e.category, e.kind === "provider-backed" || e.kind === "external" ? `via ${e.provider}` : e.kind, (e.aliases ?? []).join(","), e.summary ?? ""]),
    ["id", "category", "runs as", "aliases", "summary"],
  ));
  if (!opts.all) log.info(pc.dim("\n--all includes report-only items and runtimes"));
}
