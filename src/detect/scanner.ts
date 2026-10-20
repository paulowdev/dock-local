import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";

export type FileKind = "manifest" | "config" | "source" | "docs";

export interface ScannedFile {
  rel: string;
  kind: FileKind;
  content: string;
}

export interface ProjectScan {
  root: string;
  files: ScannedFile[];
  /** normalized dependency id -> manifest file it came from */
  dependencies: Map<string, string>;
  /** env var names seen in .env / properties / yaml keys, uppercased */
  envNames: Map<string, string>;
  truncated: boolean;
}

const IGNORE = [
  "**/node_modules/**", "**/.git/**", "**/target/**", "**/build/**", "**/dist/**", "**/out/**",
  "**/.idea/**", "**/.vscode/**", "**/.dock/**", "**/vendor/**", "**/coverage/**", "**/__pycache__/**",
  "**/.venv/**", "**/venv/**", "**/.gradle/**", "**/.terraform/**", "**/bin/**", "**/obj/**",
  "**/*.min.js", "**/*.lock", "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml",
];

const GLOBS: Record<FileKind, string[]> = {
  manifest: [
    "**/pom.xml", "**/build.gradle", "**/build.gradle.kts", "**/settings.gradle{,.kts}", "**/package.json",
    "**/requirements*.txt", "**/pyproject.toml", "**/Pipfile", "**/go.mod", "**/*.csproj", "**/Gemfile", "**/composer.json",
  ],
  config: [
    "**/application*.{yml,yaml,properties}", "**/bootstrap*.{yml,yaml}", "**/*.properties", "**/.env", "**/.env.*",
    "**/*.tf", "**/*.tfvars", "**/Dockerfile*", "**/docker-compose*.{yml,yaml}", "**/compose*.{yml,yaml}",
    "**/values*.{yml,yaml}", "**/.gluon/**/*.{yml,yaml,env}", "**/.ci/**/*.{yml,yaml}", "**/.github/workflows/*.{yml,yaml}",
    "**/serverless.{yml,yaml}", "**/template.{yml,yaml}", "**/samconfig.toml", "**/k8s/**/*.{yml,yaml}", "**/helm/**/*.{yml,yaml}",
    "**/apiproxy/**/*.xml", "**/*.config.{js,ts,mjs,cjs,json}", "**/appsettings*.json", "**/config/*.{json,yml,yaml,js,ts}",
    "**/liquibase*.{xml,yml,yaml}", "**/db/changelog/**/*.{xml,yml,yaml,sql}", "**/flyway.conf", "**/schema.prisma",
  ],
  source: ["**/*.{java,kt,scala,groovy,ts,js,mjs,cjs,py,go,cs,rb,php}"],
  docs: ["**/README*", "**/*.md", "**/docs/**/*"],
};

export interface ScanOptions {
  /** include documentation files (weak evidence) */
  docs?: boolean;
  /** hard cap on scanned files (source files are dropped first) */
  maxFiles?: number;
  maxFileBytes?: number;
}

export async function scanProject(root: string, opts: ScanOptions = {}): Promise<ProjectScan> {
  const maxFiles = opts.maxFiles ?? 2500;
  const maxBytes = opts.maxFileBytes ?? 512 * 1024;
  const kinds: FileKind[] = opts.docs ? ["manifest", "config", "source", "docs"] : ["manifest", "config", "source"];
  const seen = new Set<string>();
  const files: ScannedFile[] = [];
  let truncated = false;

  for (const kind of kinds) {
    const matches = await fg(GLOBS[kind], { cwd: root, ignore: IGNORE, dot: true, onlyFiles: true, suppressErrors: true });
    for (const rel of matches.sort()) {
      if (seen.has(rel)) continue;
      if (files.length >= maxFiles) { truncated = true; break; }
      seen.add(rel);
      const abs = join(root, rel);
      try {
        if (statSync(abs).size > maxBytes) continue;
        files.push({ rel, kind, content: readFileSync(abs, "utf8") });
      } catch { /* unreadable, skip */ }
    }
  }

  const dependencies = new Map<string, string>();
  const envNames = new Map<string, string>();
  for (const f of files) {
    if (f.kind === "manifest") for (const d of extractDependencies(f)) dependencies.set(d, f.rel);
    if (f.kind === "config") for (const e of extractEnvNames(f)) if (!envNames.has(e)) envNames.set(e, f.rel);
  }
  return { root, files, dependencies, envNames, truncated };
}

/** Normalizes dependency declarations across ecosystems into lowercase ids. */
export function extractDependencies(f: ScannedFile): string[] {
  const out = new Set<string>();
  const name = f.rel.split("/").pop()!.toLowerCase();
  const c = f.content;
  const add = (s?: string | null) => { if (s) out.add(s.trim().toLowerCase()); };

  if (name === "pom.xml") {
    for (const m of c.matchAll(/<groupId>\s*([^<\s]+)\s*<\/groupId>\s*<artifactId>\s*([^<\s]+)\s*<\/artifactId>/g)) add(`${m[1]}:${m[2]}`);
    for (const m of c.matchAll(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>\s*<groupId>\s*([^<\s]+)\s*<\/groupId>/g)) add(`${m[2]}:${m[1]}`);
  } else if (name.startsWith("build.gradle") || name.startsWith("settings.gradle")) {
    for (const m of c.matchAll(/["']([a-z0-9_.\-]+):([a-z0-9_.\-]+)(?::[^"']*)?["']/gi)) add(`${m[1]}:${m[2]}`);
    for (const m of c.matchAll(/group\s*[:=]\s*["']([^"']+)["']\s*,\s*name\s*[:=]\s*["']([^"']+)["']/gi)) add(`${m[1]}:${m[2]}`);
  } else if (name === "package.json" || name === "composer.json") {
    try {
      const json = JSON.parse(c) as Record<string, Record<string, string> | undefined>;
      for (const k of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "require", "require-dev"])
        for (const dep of Object.keys(json[k] ?? {})) add(dep);
    } catch { /* invalid json */ }
  } else if (name.startsWith("requirements")) {
    for (const line of c.split("\n")) {
      const m = /^\s*([a-z0-9_.\-\[\]]+)/i.exec(line);
      if (m && !line.trim().startsWith("#") && !line.trim().startsWith("-")) add(m[1]!.replace(/\[.*\]$/, ""));
    }
  } else if (name === "pyproject.toml" || name === "pipfile") {
    for (const m of c.matchAll(/^\s*"?([a-z0-9_.\-]+)"?\s*(?:[=<>~!\[]|$)/gim)) add(m[1]);
  } else if (name === "go.mod") {
    for (const m of c.matchAll(/^\s*([a-z0-9.\-_\/]+\.[a-z]+\/[^\s]+)\s+v/gim)) add(m[1]);
  } else if (name.endsWith(".csproj")) {
    for (const m of c.matchAll(/<PackageReference\s+Include="([^"]+)"/gi)) add(m[1]);
  } else if (name === "gemfile") {
    for (const m of c.matchAll(/^\s*gem\s+["']([^"']+)["']/gim)) add(m[1]);
  }
  return [...out];
}

function extractEnvNames(f: ScannedFile): string[] {
  const out = new Set<string>();
  const isEnv = /(^|\/)\.env(\.|$)/.test(f.rel) || f.rel.endsWith(".properties") || f.rel.endsWith(".env");
  const re = isEnv ? /^\s*([A-Za-z_][A-Za-z0-9_.\-]*)\s*[=:]/gm : /\$\{\s*([A-Z][A-Z0-9_]{2,})\b/g;
  for (const m of f.content.matchAll(re)) out.add(m[1]!.toUpperCase().replace(/[.\-]/g, "_"));
  return [...out];
}
