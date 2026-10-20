import { detect } from "../detect/index.js";
import { buildPlan } from "../generate/plan.js";
import { context } from "./context.js";
import { printPlan, printReport, reportJson } from "./report.js";

export interface DetectOptions { json?: boolean; docs?: boolean; verbose?: boolean; plan?: boolean; threshold?: string }

export async function detectCommand(dir: string | undefined, opts: DetectOptions): Promise<void> {
  const ctx = context(dir);
  const report = await detect(ctx.projectDir, { docs: opts.docs });
  const plan = buildPlan(report.detections, ctx.catalog, { threshold: opts.threshold ? Number(opts.threshold) : undefined });
  if (opts.json) { console.log(reportJson(report, plan)); return; }
  printReport(report, opts.verbose);
  if (opts.plan) printPlan(plan, ctx.catalog);
}
