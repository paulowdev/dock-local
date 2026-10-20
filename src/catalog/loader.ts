import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { packageRoot } from "../util/paths.js";
import type { Catalog, CatalogEntry, Category, Kind } from "./types.js";

const CATEGORIES: Category[] = [
  "database", "nosql", "cache", "messaging", "search", "storage", "aws",
  "security", "observability", "integration", "platform", "runtime",
];
const KINDS: Kind[] = ["service", "provider-backed", "external", "report-only", "runtime"];

let cached: Catalog | undefined;

export function loadCatalog(dir = join(packageRoot(), "catalog")): Catalog {
  if (cached && dir === join(packageRoot(), "catalog")) return cached;
  const entries: CatalogEntry[] = [];
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const doc = parse(readFileSync(join(dir, file), "utf8"));
    const list: unknown[] = Array.isArray(doc) ? doc : doc?.entries ?? [doc];
    for (const raw of list) entries.push(validate(raw, file));
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byAlias = new Map<string, CatalogEntry>();
  for (const e of entries) for (const a of e.aliases ?? []) byAlias.set(a.toLowerCase(), e);
  for (const e of entries) {
    for (const ref of [e.provider, ...(e.companions ?? []), ...(e.requires ?? [])]) {
      if (ref && !byId.has(ref)) throw new Error(`catalog: ${e.id} references unknown entry "${ref}"`);
    }
  }
  const catalog: Catalog = {
    entries,
    byId,
    resolve: (q) => byId.get(q) ?? byAlias.get(q.toLowerCase()),
  };
  if (dir === join(packageRoot(), "catalog")) cached = catalog;
  return catalog;
}

function validate(raw: unknown, file: string): CatalogEntry {
  if (!raw || typeof raw !== "object") throw new Error(`catalog/${file}: entry is not an object`);
  const e = raw as CatalogEntry;
  const where = `catalog/${file} (${e.id ?? "?"})`;
  if (!e.id || !/^[a-z0-9-]+$/.test(e.id)) throw new Error(`${where}: invalid id`);
  if (!e.name) throw new Error(`${where}: missing name`);
  if (!CATEGORIES.includes(e.category)) throw new Error(`${where}: invalid category "${e.category}"`);
  if (!KINDS.includes(e.kind)) throw new Error(`${where}: invalid kind "${e.kind}"`);
  if (e.kind === "service" && !e.compose?.image) throw new Error(`${where}: service needs compose.image`);
  if ((e.kind === "provider-backed" || e.kind === "external") && !e.provider)
    throw new Error(`${where}: ${e.kind} needs provider`);
  for (const [k, re] of Object.entries(e.extract ?? {})) {
    if (!re.includes("(?<v>") && !re.includes("(?<block>")) throw new Error(`${where}: extract.${k} needs a (?<v>...) or (?<block>...) group`);
    new RegExp(re, "gi");
  }
  for (const p of e.detect?.patterns ?? []) new RegExp(p, "i");
  return e;
}
