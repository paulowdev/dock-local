/**
 * Catalog schema. Every service the CLI knows about is described by ONE
 * catalog entry: how to detect it, how to run it locally, what to seed and
 * how the application should be pointed at it. Detection, generation and
 * documentation all derive from this single source of truth.
 */

export type Category =
  | "database"
  | "nosql"
  | "cache"
  | "messaging"
  | "search"
  | "storage"
  | "aws"
  | "security"
  | "observability"
  | "integration"
  | "platform"
  | "runtime"
  | "ai-ml";

/**
 * - service:          runs as its own compose service (postgres, kafka, ...)
 * - provider-backed:  emulated by a shared provider service (S3 -> ministack)
 * - external:         cannot run locally; stubbed through a provider (Apigee -> wiremock)
 * - report-only:      detected and reported with guidance, nothing generated
 * - runtime:          the application's own stack (Spring Boot, Node...), informs hints
 */
export type Kind = "service" | "provider-backed" | "external" | "report-only" | "runtime";

export interface DetectRules {
  /** Dependency ids (group:artifact, npm name, pip name...). Supports `*` wildcard. */
  dependencies?: string[];
  /** Regexes applied to config + source file contents (case-insensitive). */
  patterns?: string[];
  /** Globs whose presence alone is a signal (e.g. `**\/apiproxy/**`). */
  files?: string[];
  /** Environment variable name prefixes found in .env / config files. */
  env?: string[];
}

export interface ComposeFragment {
  image: string;
  command?: string | string[];
  entrypoint?: string | string[];
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  healthcheck?: Record<string, unknown>;
  depends_on?: string[] | Record<string, { condition: string }>;
  user?: string;
  platform?: string;
  restart?: string;
  [key: string]: unknown;
}

export interface SeedSpec {
  /** Path relative to `.dock/` where the rendered file is written. */
  path: string;
  /** Template file under `templates/` (rendered with the generation context). */
  template: string;
  /** chmod +x after writing. */
  executable?: boolean;
}

export interface CatalogEntry {
  id: string;
  name: string;
  category: Category;
  kind: Kind;
  /** Other names for the same thing (as used by inventories / users). */
  aliases?: string[];
  /** One-line description shown in `dock list`. */
  summary?: string;
  /** For provider-backed / external entries: id of the provider entry. */
  provider?: string;
  /** Value contributed to the provider (e.g. AWS service name for ministack SERVICES). */
  providerValue?: string;
  /** On a provider: env var that receives the comma-joined consumer `providerValue`s. */
  providerEnvKey?: string;
  /** Entries always started together with this one (kafka -> kafka-ui). */
  companions?: string[];
  /** Hard dependencies (schema-registry -> kafka). */
  requires?: string[];
  detect?: DetectRules;
  /**
   * Named regexes with a `v` capture group (single value) or a `block` group
   * (indented YAML block whose `key: value` / `- value` lines are the values).
   * Results feed seeds/app hints.
   */
  extract?: Record<string, string>;
  compose?: ComposeFragment;
  /** Variables written to `.dock/.env` (defaults, user-editable). */
  env?: Record<string, string>;
  seeds?: SeedSpec[];
  /** Hints for wiring the application to the local stack (host view: localhost:port). */
  appEnv?: Record<string, string>;
  /**
   * Overrides for the containerised app (`--app`), when the in-network address is not
   * simply host port -> container port (e.g. Kafka's internal listener).
   */
  appEnvInternal?: Record<string, string>;
  /** Short guidance shown in the report (mainly external / report-only). */
  notes?: string;
}

export interface Catalog {
  entries: CatalogEntry[];
  byId: Map<string, CatalogEntry>;
  resolve(idOrAlias: string): CatalogEntry | undefined;
}
