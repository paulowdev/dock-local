import type { Catalog, CatalogEntry, Category, Kind } from "../catalog/types.js";
import type { FileKind, ProjectScan } from "./scanner.js";

export type Level = "high" | "medium" | "low";

export interface Evidence {
  type: "dependency" | "pattern" | "file" | "env";
  value: string;
  file: string;
}

export interface Detection {
  id: string;
  name: string;
  category: Category;
  kind: Kind;
  confidence: number;
  level: Level;
  evidence: Evidence[];
  /** values captured by the entry's `extract` regexes (topics, buckets, hosts...) */
  resources: Record<string, string[]>;
}

export interface DetectionReport {
  project: string;
  scannedFiles: number;
  truncated: boolean;
  detections: Detection[];
}

const WEIGHT: Record<Evidence["type"], number> = { dependency: 0.9, file: 0.8, pattern: 0.65, env: 0.5 };
const KIND_WEIGHT: Record<FileKind, number> = { manifest: 1, config: 1, source: 0.85, docs: 0.3 };
const MAX_EVIDENCE = 6;
const MAX_RESOURCES = 40;

export function levelOf(c: number): Level { return c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low"; }

export function matchProject(scan: ProjectScan, catalog: Catalog): DetectionReport {
  const detections: Detection[] = [];
  for (const entry of catalog.entries) {
    const d = matchEntry(entry, scan);
    if (d) detections.push(d);
  }
  detections.sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
  return { project: scan.root, scannedFiles: scan.files.length, truncated: scan.truncated, detections };
}

function matchEntry(entry: CatalogEntry, scan: ProjectScan): Detection | undefined {
  const rules = entry.detect;
  const evidence: Evidence[] = [];
  const scores: number[] = [];
  const push = (e: Evidence, w: number) => { scores.push(w); if (evidence.length < MAX_EVIDENCE) evidence.push(e); };

  for (const pat of rules?.dependencies ?? []) {
    const re = wildcard(pat);
    for (const [dep, file] of scan.dependencies) {
      const artifact = dep.includes(":") ? dep.slice(dep.indexOf(":") + 1) : dep;
      if (re.test(dep) || re.test(artifact)) push({ type: "dependency", value: dep, file }, WEIGHT.dependency);
    }
  }
  for (const glob of rules?.files ?? []) {
    const re = globToRegex(glob);
    const hit = scan.files.find((f) => re.test(f.rel));
    if (hit) push({ type: "file", value: glob, file: hit.rel }, WEIGHT.file);
  }
  for (const prefix of rules?.env ?? []) {
    for (const [name, file] of scan.envNames) if (name.startsWith(prefix.toUpperCase())) { push({ type: "env", value: name, file }, WEIGHT.env); break; }
  }
  const patterns = (rules?.patterns ?? []).map((p) => ({ src: p, re: new RegExp(p, "i") }));
  if (patterns.length) {
    for (const f of scan.files) {
      if (f.kind === "manifest" && !f.rel.endsWith("package.json")) continue;
      for (const { src, re } of patterns) {
        if (re.test(f.content)) push({ type: "pattern", value: src, file: f.rel }, WEIGHT.pattern * KIND_WEIGHT[f.kind]);
      }
    }
  }
  if (!scores.length) return undefined;

  const resources = runExtractors(entry, scan);
  // noisy-or: independent signals reinforce each other, capped
  const confidence = Math.min(0.99, 1 - scores.reduce((acc, s) => acc * (1 - s), 1));
  return {
    id: entry.id, name: entry.name, category: entry.category, kind: entry.kind,
    confidence: Number(confidence.toFixed(2)), level: levelOf(confidence), evidence, resources,
  };
}

function runExtractors(entry: CatalogEntry, scan: ProjectScan): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, src] of Object.entries(entry.extract ?? {})) {
    const re = new RegExp(src, "gi");
    const values = new Set<string>();
    for (const f of scan.files) {
      if (f.kind === "docs") continue;
      for (const m of f.content.matchAll(re)) {
        const found = m.groups?.block ? blockValues(m.groups.block) : [m.groups?.v?.trim() ?? ""];
        for (const v of found) if (v && !v.includes("${") && !v.includes("{{") && v.length < 120 && !NOISE.test(v)) values.add(v);
        if (values.size >= MAX_RESOURCES) break;
      }
    }
    if (values.size) out[key] = [...values].sort();
  }
  return out;
}

/** `key: value` / `- value` lines of an indented YAML block captured by a `(?<block>...)` group. */
function blockValues(block: string): string[] {
  return block.split("\n").map((l) => /^\s*(?:-\s*|[\w.-]+\s*[:=]\s*)["']?([A-Za-z][\w.-]{2,})["']?\s*(?:#.*)?$/.exec(l)?.[1] ?? "").filter(Boolean);
}

/** Values that are never project resources (schema URLs, registries, placeholders). */
const NOISE = new RegExp([
  "^(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|host\\.docker\\.internal|example\\.(com|org)|true|false|null|none|string|name|value|test)$",
  "(^|\\.)(w3|apache|maven|gradle|springframework|spring\\.io|npmjs|docker|github|githubusercontent|microsoft|google|googleapis|gitlab|jfrog|sonatype|oracle|ibm|redhat|quay|schema|schemas|xmlsource|json-schema|swagger|openapis|opensource|mozilla|wikipedia|stackoverflow)\\b",
  "^(xmlns|http|https|www)$",
].join("|"), "i");

const escape = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
const wildcard = (p: string) => new RegExp(`^${escape(p).replace(/\*/g, ".*")}$`, "i");
const globToRegex = (g: string) => {
  const src = escape(g).replace(/\*\*\//g, "\u0001").replace(/\*\*/g, "\u0002").replace(/\*/g, "[^/]*")
    .replace(/\u0001/g, "(?:.*/)?").replace(/\u0002/g, ".*");
  return new RegExp(`^${src}$`, "i");
};
