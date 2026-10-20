# dock-local — Developer Guide

This guide explains how `dock` works internally, how to run and test the project, and — primarily — how to **add or adjust infrastructure services**, which is 90% of the maintenance and requires **no TypeScript code**.

---

## 1. Principle: a single source of truth

Everything that `dock` knows about an infrastructure service is in **a single YAML entry** in `catalog/*.yaml`:

```
detection  ──►  plan  ──►  compose + .env + seeds + app.env
   ▲                             ▲
   └───── catalog/*.yaml ────────┘
```

The same catalog entry specifies *how to detect* (dependency patterns, regex, files, environment variables), *how to run* (Docker Compose fragment), *what to provision* (seed templates), and *how the application connects* (`appEnv` variables). Detection, orchestration generation, `dock list`, and reporting all derive from catalog entries. There is no per-service TypeScript code.

---

## 2. Repository Structure

```
bin/dock.js            entrypoint; compiles dist/ by itself on first run
src/
  cli.ts               commands (commander)
  catalog/             types.ts (schema), loader.ts (loads + validates catalog/*.yaml)
  detect/              scanner.ts (scans files, extracts dependencies), matcher.ts (scores + extracts resources)
  generate/            plan.ts (selection → providers/companions/requires), compose.ts, writer.ts (.dock/), state.ts (dock.json)
  commands/            detect, init, stack (up/down/status/logs/env), manage (add/remove/list), doctor, share, report
  util/                template.ts (mini-mustache), exec.ts, log.ts, paths.ts
catalog/               10-databases, 20-cache-search, 30-messaging, 40-aws, 50-security, 60-observability, 70-integration, 80-platform, 90-runtimes
templates/             seeds rendered to .dock/init/**
test/                  vitest + fixtures (spring-app, node-app)
docs/                  this guide and the user guide
reference-files/       resource inventory by project (catalog input)
```

---

## 3. Running Locally

### On macOS and Linux
```bash
npm install                 
npm run typecheck
npm test                    # vitest
npm run build               # tsc → dist/
node bin/dock.js detect test/fixtures/spring-app --plan
npx tsx src/cli.ts detect test/fixtures/node-app      # direct execution without compiling
npm run link                # or create symlink: ln -sf $(pwd)/bin/dock.js ~/.local/bin/dock
```

### On Windows (PowerShell)
```powershell
npm install
npm run typecheck
npm test
npm run build
node bin\dock.js detect test\fixtures\spring-app --plan
npm link                    # makes `dock` available in the user's PATH
```

### End-to-end Test (with Docker)

```bash
cp -R test/fixtures/node-app ~/dock-e2e && cd ~/dock-e2e     # inside $HOME (not /tmp)
dock init -y --minimal --app --up
curl localhost:3000          # the fixture app tests connectivity with each service
dock down -v && cd .. && rm -rf ~/dock-e2e
```

---

## 4. How Detection Works

`scanner.ts` collects files in three classes (docs only with `--docs`):

| File Class | Examples | Detection Usage |
|---|---|---|
| **manifest** | `pom.xml`, `build.gradle(.kts)`, `package.json`, `requirements*.txt`, `pyproject.toml`, `go.mod`, `*.csproj`, `Gemfile` | Normalized dependency identifiers (`group:artifact`, npm/pip package names) |
| **config** | `application*.yml/properties`, `.env*`, `*.tf` (Terraform IaC), `Dockerfile*`, `values*.yaml` (Helm), `.gluon/**`, `.github/workflows/*` (CI/CD), `template.yaml` (SAM), `apiproxy/**` (Apigee) | Regex pattern matching + resource identifier extraction |
| **source** | `*.java,kt,ts,js,py,go,cs,…` | Regex pattern matching with reduced confidence weight |

Ignores common build/dependency directories: `node_modules`, `target`, `build`, `dist`, `.git`, `.dock`, etc. Default scanning limits: 2,500 files maximum, 512 KB per file.

`matcher.ts` applies detection rules for each catalog entry and combines confidence signals using noisy-or probabilistic logic:

| Evidence Type | Confidence Weight |
|---|---|
| Declared dependency in manifest | 0.90 (highest confidence) |
| Required file present (`files`) | 0.80 |
| Regex pattern match in config file | 0.65 |
| Regex pattern match in source code | 0.65 × 0.85 = 0.55 (reduced weight) |
| Environment variable name match (`env`) | 0.50 |

Confidence score interpretation: ≥ 0.8 = **high** (strong evidence), ≥ 0.5 = **medium** (selected by default threshold), < 0.5 = **low** (excluded unless forced).
`dependencies` accepts wildcard patterns `*` (e.g., `org.apache.kafka:*`, `*kafka-starter*`) and matches both the complete Maven/Gradle coordinate and artifact name alone.

### Resource Identifier Extraction

`extract` is a key-value map of `resource_key → regex_pattern`. The regex pattern requires a named capture group:

- `(?<v>...)` — captures one value per regex match (e.g., `jdbc:postgresql://host/(?<v>[a-z_]+)` extracts database name).
- `(?<block>...)` — captures an indented YAML block; each line `key: value` or `- value` becomes a separate value (useful for extracting nested `topics:` / `queues:` arrays from Spring configuration).

Values containing `${...}` placeholders, exceeding length limits, or matching noise patterns (schema registry hosts, Docker registry URLs, `localhost`, etc.) are automatically discarded (see `NOISE` constant in `matcher.ts`). Use distinct resource keys per service when semantic meaning differs (e.g., `rabbit_queues` vs `sqs_queues`), because extracted resources are merged by key and made available to seed templates.

---

## 5. How Generation Works

`plan.ts` — `buildPlan` function takes detected services meeting confidence threshold (or forced via `--services`), removes excluded services (`--exclude`), and `expand` resolves dependency graph:

- `provider` → the emulator/stub service that provides the capability (e.g., S3 → `ministack`, Apigee → `wiremock`); `providerValue` feeds the provider's `providerEnvKey` environment variable (e.g., `SERVICES=s3,sqs`).
- `requires` → hard infrastructure dependencies in topological execution order (e.g., schema-registry → kafka must start first).
- `companions` → optional management/UI containers (e.g., kafka → kafka-ui, kafka-init seed job); `--minimal` flag omits companions.

`compose.ts` — clones the Docker Compose `compose` fragment from each executable service entry, prefixes Docker Hub image names with configured registry mirror (fully qualified registry URLs like `icr.io/...` remain unchanged), collects named volume declarations, filters `depends_on` references to only include present services, adds shared `dock` Docker network. When `--app` flag is used, generates the `app` service definition (using Docker Compose `app` profile) with `appEnv` connection strings rewritten to internal `service:port` references and applies `appEnvInternal` overrides.

`writer.ts` — generates `.dock/` directory structure with smart merge policies:

| File/Directory | Regeneration Policy |
|---|---|
| `docker-compose.yml`, `app.env`, `dock.json` | Always regenerated from catalog on every `init`/`add`/`remove` |
| `.env` | Smart merge: existing user-edited values take precedence over catalog defaults |
| `init/**` (seed scripts) | Only created if file doesn't exist; `--force` flag overwrites user customizations |

Seed templates use a minimal Mustache implementation (`util/template.ts`) supporting: property access `{{a.b}}`, iteration `{{#each list}}{{this}}{{/each}}`, conditionals `{{#if x}}…{{else}}…{{/if}}` (nestable). Triple-brace syntax `{{{x}}}` is preserved unprocessed (for WireMock response templating). Available template context variables: `project` (name, path), `registry` (container registry prefix), `env` (merged `.env` key-value pairs), `resources` (extracted identifiers merged by key), `services` (selected service IDs with dashes normalized to underscores, e.g., `services.otel_collector`).

---

## 6. Adding an Infrastructure Service (Step-by-Step Example)

Example: adding **Memcached** distributed cache service to the catalog.

1. Choose the file by category (`catalog/20-cache-search.yaml`) and add:

```yaml
- id: memcached
  name: Memcached
  category: cache
  kind: service
  summary: Memcached 1.6.
  detect:
    dependencies: [memcached, pymemcache, net.spy:spymemcache, "*:spring-boot-starter-cache-memcached"]
    patterns: ["\\bmemcached\\b"]
    env: [MEMCACHED_]
  env:
    MEMCACHED_PORT: "11211"
  compose:
    image: memcached:1.6-alpine
    ports: ["${MEMCACHED_PORT}:11211"]
    healthcheck:
      test: ["CMD-SHELL", "nc -z localhost 11211 || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 20
  appEnv:
    MEMCACHED_SERVERS: "localhost:${MEMCACHED_PORT}"
```

2. If seed data provisioning is needed, create `templates/memcached/<file>` and declare it in `seeds:` array with the `path` relative to `.dock/` directory.
3. If it's emulated by another service, use `kind: provider-backed` + `provider` + `providerValue`; if it can't run locally (external SaaS), use `kind: external` + `provider: wiremock` for HTTP stubbing; if it's informational only, use `kind: report-only` + `notes`.
4. Add a test assertion in the `test/` fixtures (or create a new fixture project) and run `npm test`. The `loader.ts` schema validator validates catalog YAML on load — invalid service IDs, broken dependency references, and invalid regex patterns fail fast with clear error messages.
5. If the container image isn't hosted on Docker Hub, confirm registry accessibility on the corporate network (`docker manifest inspect <image>`); note that quay.io CDN may be blocked in some corporate environments.

### Schema Fields (`src/catalog/types.ts`)

| field | required | description |
|---|---|---|
| `id`, `name`, `category`, `kind` | yes | `kind`: `service`, `provider-backed`, `external`, `report-only`, `runtime` |
| `aliases` | no | alternative names accepted in `--services`/`add` |
| `summary`, `notes` | no | `dock list` line / guidance in report |
| `provider`, `providerValue`, `providerEnvKey` | per kind | emulation/stub |
| `requires`, `companions` | no | dependency graph |
| `detect.{dependencies,patterns,files,env}` | no | detection rules |
| `extract` | no | regex `(?<v>)` or `(?<block>)` |
| `compose` | `service` | compose fragment (image required) |
| `env` | no | defaults written to `.dock/.env` |
| `seeds[]` | no | `{ path, template, executable? }` |
| `appEnv`, `appEnvInternal` | no | host view / inside network view |

---

## 7. Development Conventions

- **Port Mapping:** Always use environment variable references for host ports (`${X_PORT}`) with defaults in `env` section — enables resolving port conflicts by editing `.dock/.env` without regenerating Docker Compose files.
- **Volume Strategy:** Use named Docker volumes for persistent data (`<id>-data:/var/lib/...`); bind-mounts only for read-only seed initialization scripts (`./init/**:ro`).
- **Health Checks:** Define health check for every service that has dependents (enables `depends_on: service_healthy` orchestration dependency and `dock up --wait` blocking). One-shot initialization jobs use `restart: "no"` and transition to `service_completed_successfully` state for `app` service dependency.
- **Idempotent Provisioning:** All seed scripts must be idempotent using conditional creation (`CREATE IF NOT EXISTS`, `--if-not-exists`, `aws s3 head-bucket || aws s3 mb`).
- **Security:** Never commit real secrets, API keys, or credentials in catalog defaults, seed templates, or test fixtures.
- **Code Quality:** Strict TypeScript with ESM modules, minimal runtime dependencies (only `commander`, `yaml`, `fast-glob`, `picocolors`). Prefer declarative catalog YAML rules over imperative TypeScript `if` statements.

---

## 8. Design Decisions (Rationale)

- **Deterministic CLI + thin AI skill**: LLM infrastructure analysis is computationally expensive and non-reproducible; the AI agent only reports deterministic `dock` command output. Compact `--json` output and `-q` quiet mode minimize LLM context consumption.
- **Ministack consolidation** instead of separate containers per AWS service: Single lightweight container image, single exposed port, single calculated `SERVICES` environment variable. Maintains LocalStack API compatibility (`/_localstack/health` endpoint, initialization hooks in `docker-entrypoint-initaws.d/ready.d`, `awslocal` CLI wrapper).
- **WireMock HTTP stubbing** for services that can't run locally (Apigee API Gateway, mainframe SOAP services, partner REST APIs): Enables validating end-to-end integration flows with deterministic controlled HTTP responses.
- **Docker Hub as default registry**: Public Docker Hub is the default container registry. Override using `--registry` CLI flag or `DOCK_REGISTRY` environment variable for corporate mirrors or private registries.
- **Version-controlled `.dock/` directory**: Infrastructure-as-code approach — team shares local development environment configuration and seed data via Git commits.

---

## 9. Suggested Development Roadmap

- **Detection Tuning:** Run on real production repositories and iteratively adjust detection rules to eliminate false positives/negatives — each tuning adjustment is a single line of YAML configuration.
- **Dependency Precision:** Replace wildcard dependency patterns from internal framework/foundation components with exact Maven coordinates `groupId:artifactId` for higher detection accuracy.
- **Heavy Image Validation:** Validate successful container startup and seed provisioning of resource-intensive images (Oracle Database, IBM Db2, IBM MQ, SQL Server) on development machines with adequate disk space and initialization time.
- **Companion Expansion:** Add additional optional management/UI companions (Kafka Connect UI, pgAdmin database manager, Mongo Express web UI) available via `dock add` command.
