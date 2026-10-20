import pc from "picocolors";
import type { Catalog } from "../catalog/types.js";
import type { Detection, DetectionReport } from "../detect/matcher.js";
import type { Plan } from "../generate/plan.js";
import { log, table } from "../util/log.js";

const levelColor = { high: pc.green, medium: pc.yellow, low: pc.dim } as const;

/** Compact JSON for agents: evidence trimmed to what is needed to trust the result. */
export function reportJson(report: DetectionReport, plan?: Plan): string {
  const detections = report.detections.map((d) => ({
    id: d.id, name: d.name, kind: d.kind, category: d.category, confidence: d.confidence,
    evidence: d.evidence.slice(0, 3).map((e) => `${e.type}:${e.value}@${e.file}`),
    ...(Object.keys(d.resources).length ? { resources: d.resources } : {}),
  }));
  const out: Record<string, unknown> = { project: report.project, scannedFiles: report.scannedFiles, truncated: report.truncated, detections };
  if (plan) out.plan = planJson(plan);
  return JSON.stringify(out, null, 2);
}

export function planJson(plan: Plan): Record<string, unknown> {
  return {
    selected: plan.selected.map((e) => e.id),
    runnable: plan.runnable.map((e) => e.id),
    providers: Object.fromEntries([...plan.consumers].map(([p, cs]) => [p, cs.map((c) => c.id)])),
    reportOnly: plan.reportOnly.map((e) => e.id),
    resources: plan.resources,
  };
}

export function printReport(report: DetectionReport, verbose = false): void {
  const runnable = report.detections.filter((d) => d.kind !== "report-only" && d.kind !== "runtime");
  const info = report.detections.filter((d) => d.kind === "report-only" || d.kind === "runtime");
  log.info(pc.bold(`Detected in ${report.project}`) + pc.dim(` (${report.scannedFiles} files${report.truncated ? ", truncated" : ""})`));
  if (!runnable.length && !info.length) { log.warn("nothing recognised. Use `dock list` and `dock init --services ...` to pick services manually."); return; }
  if (runnable.length) {
    log.info("\n" + pc.bold("Services to run locally"));
    log.info(table(runnable.map((d) => row(d, verbose)), ["service", "kind", "conf.", "evidence"]));
  }
  if (info.length) {
    log.info("\n" + pc.bold("Context (nothing to run)"));
    log.info(table(info.map((d) => [d.name, d.kind, levelColor[d.level](d.confidence.toFixed(2)), firstEvidence(d)]), ["item", "kind", "conf.", "evidence"]));
  }
  const res = runnable.flatMap((d) => Object.entries(d.resources).map(([k, v]) => [d.id, k, v.length > 6 && !verbose ? `${v.slice(0, 6).join(", ")} … (+${v.length - 6})` : v.join(", ")]));
  if (res.length) {
    log.info("\n" + pc.bold("Resources extracted (seeded on first start)"));
    log.info(table(res, ["service", "type", "values"]));
  }
}

export function printPlan(plan: Plan, catalog: Catalog): void {
  log.info(pc.bold("\nStack plan"));
  const env = Object.assign({}, ...[...plan.runnable, ...plan.selected].map((e) => e.env ?? {})) as Record<string, string>;
  const rows = plan.runnable.map((e) => {
    const consumers = plan.consumers.get(e.id)?.map((c) => c.name).join(", ");
    const ports = (e.compose?.ports ?? []).map((p) => p.split(":")[0]!.replace(/\$\{(\w+)\}/, (_, k) => env[k] ?? k)).join(",");
    return [e.id, ports || "-", consumers ? `emulates: ${consumers}` : e.summary ?? e.name];
  });
  log.info(table(rows, ["service", "host port", "role"]));
  const notes = [...plan.selected, ...plan.runnable, ...plan.reportOnly].filter((e) => e.notes);
  if (notes.length) {
    log.info(pc.bold("\nNotes"));
    for (const e of new Set(notes)) log.info(`${pc.cyan("•")} ${pc.bold(e.name)}: ${e.notes}`);
  }
  void catalog;
}

function row(d: Detection, verbose: boolean): string[] {
  const ev = verbose ? d.evidence.map((e) => `${e.type}:${e.value} (${e.file})`).join("\n") : firstEvidence(d);
  return [d.name, d.kind, levelColor[d.level](d.confidence.toFixed(2)), ev];
}

function firstEvidence(d: Detection): string {
  const e = d.evidence[0];
  if (!e) return "";
  const more = d.evidence.length > 1 ? pc.dim(` +${d.evidence.length - 1}`) : "";
  return `${e.type}:${truncate(e.value, 40)} ${pc.dim(e.file)}${more}`;
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
