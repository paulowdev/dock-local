import type { Catalog, CatalogEntry } from "../catalog/types.js";
import type { Detection } from "../detect/matcher.js";

export interface Plan {
  /** user-facing selection (what the project needs), catalog ids */
  selected: CatalogEntry[];
  /** compose services to run, in dependency order */
  runnable: CatalogEntry[];
  /** provider id -> consumers emulated/stubbed by it */
  consumers: Map<string, CatalogEntry[]>;
  /** detected but nothing to run (guidance only) */
  reportOnly: CatalogEntry[];
  /** merged extracted resources across the selection */
  resources: Record<string, string[]>;
}

export interface PlanOptions {
  /** minimum confidence for automatic selection */
  threshold?: number;
  /** explicit ids/aliases to add */
  include?: string[];
  /** ids/aliases to drop */
  exclude?: string[];
  /** skip companions (UIs, init helpers that are optional) */
  minimal?: boolean;
}

export function buildPlan(detections: Detection[], catalog: Catalog, opts: PlanOptions = {}): Plan {
  const threshold = opts.threshold ?? 0.5;
  const exclude = new Set((opts.exclude ?? []).map((x) => catalog.resolve(x)?.id ?? x));
  const picked = new Map<string, CatalogEntry>();
  const reportOnly: CatalogEntry[] = [];
  const resources: Record<string, string[]> = {};

  for (const d of detections) {
    const entry = catalog.byId.get(d.id);
    if (!entry || exclude.has(entry.id)) continue;
    for (const [k, vals] of Object.entries(d.resources)) resources[k] = uniq([...(resources[k] ?? []), ...vals]);
    if (entry.kind === "report-only" || entry.kind === "runtime") { reportOnly.push(entry); continue; }
    if (d.confidence >= threshold) picked.set(entry.id, entry);
  }
  for (const q of opts.include ?? []) {
    const entry = catalog.resolve(q);
    if (!entry) throw new Error(`unknown service "${q}" (see: dock list)`);
    if (entry.kind === "report-only" || entry.kind === "runtime") throw new Error(`"${entry.id}" is ${entry.kind}; nothing to run`);
    picked.set(entry.id, entry);
  }
  return expand([...picked.values()], catalog, reportOnly, resources, exclude, opts.minimal ?? false);
}

/** Resolve providers, requirements and companions into an ordered runnable list. */
export function expand(
  selected: CatalogEntry[], catalog: Catalog, reportOnly: CatalogEntry[] = [],
  resources: Record<string, string[]> = {}, exclude = new Set<string>(), minimal = false,
): Plan {
  const runnable = new Map<string, CatalogEntry>();
  const consumers = new Map<string, CatalogEntry[]>();
  const visiting = new Set<string>();

  const add = (e: CatalogEntry) => {
    if (runnable.has(e.id) || exclude.has(e.id) || visiting.has(e.id)) return;
    visiting.add(e.id);
    for (const r of e.requires ?? []) add(catalog.byId.get(r)!);
    if (e.kind === "service") runnable.set(e.id, e);
    if (!minimal) for (const c of e.companions ?? []) add(catalog.byId.get(c)!);
    visiting.delete(e.id);
  };

  for (const e of selected) {
    if (e.provider) {
      const provider = catalog.byId.get(e.provider)!;
      consumers.set(provider.id, [...(consumers.get(provider.id) ?? []), e]);
      add(provider);
    } else add(e);
  }
  return { selected, runnable: [...runnable.values()], consumers, reportOnly, resources };
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];
