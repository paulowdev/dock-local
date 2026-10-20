# dock-local

> **Multi-stack local infrastructure for any project, driven by automated detection.**  
> *Guiado por detecção automática de dependências em vez de um menu estático.*  
> 
> 🌐 **Language:** English · [Versão em Português (README.pt-BR.md)](README.pt-BR.md)
> 📚 **Documentation:** [User Guide](docs/USER-GUIDE.md) · [Developer Guide](docs/DEVELOPER-GUIDE.md) · [Guia do Usuário (PT)](docs/GUIA-DO-USUARIO.md) · [Guia do Desenvolvedor (PT)](docs/GUIA-DO-DESENVOLVEDOR.md)

[![CI](https://github.com/paulowdev/dock-local/workflows/CI/badge.svg)](https://github.com/paulowdev/dock-local/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D26.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2%2B-2496ED.svg)](https://www.docker.com/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![GitHub issues](https://img.shields.io/github/issues/paulowdev/dock-local)](https://github.com/paulowdev/dock-local/issues)
[![GitHub stars](https://img.shields.io/github/stars/paulowdev/dock-local)](https://github.com/paulowdev/dock-local/stargazers)

---

## Overview

**dock-local** is a developer tool and CLI (`dock`) that inspects any repository, identifies the backing infrastructure dependencies (relational and NoSQL databases, message brokers, distributed caches, AWS cloud services, identity providers, external API mocks, and observability platforms), and automatically synthesizes a ready-to-run **Docker Compose** orchestration stack pre-populated with initial data seeds and database schemas.

It eliminates the overhead of provisioning shared DEV/PRE environments, hunting down connection strings, or manually crafting `docker-compose.yml` orchestration files.

### Key Capabilities

- 🔍 **Automated Heuristic Detection:** Scans dependency manifests (`pom.xml`, `package.json`, `build.gradle`, `requirements.txt`, `go.mod`, `*.csproj`), application configuration files (`application.yml`, `.env`, Helm values, Terraform IaC definitions), and source code annotations.
- ⚡ **Zero-Overhead Auto-Seeding:** Extracts real resource identifiers from your codebase (SQL database schemas, Kafka topics, RabbitMQ queues and exchanges, S3 buckets, DynamoDB tables, WireMock HTTP stubs) and provisions them automatically at container startup.
- ☁️ **Built-in Cloud Service Emulation:** Consolidates AWS service dependencies (S3 object storage, SQS/SNS messaging, DynamoDB NoSQL database, Secrets Manager, Systems Manager Parameter Store, Kinesis data streams, EventBridge event bus, KMS encryption) into a single lightweight **Ministack** container with LocalStack-compatible REST APIs.
- 🔌 **External API Mocking:** Detects outbound HTTP/SOAP integrations (Apigee API Gateway proxies, mainframe gateways, partner REST/SOAP web services) and provisions **WireMock** HTTP stubs automatically.
- 💻 **Flexible Application Runtime Mode:**
  - Run the application process on your **host machine** (IDE debugger, CLI) connected to containerized services via generated `.dock/app.env` environment variables.
  - Or containerize the application itself using `--app` to build and orchestrate your project's `Dockerfile` within the same Docker Compose stack.
- 🔒 **100% Offline & Deterministic:** No AI/LLM tokens or external cloud API calls required for infrastructure detection.
- 🤖 **AI Agent-Ready Skill:** Ships with `SKILL.md` specification for AI coding agents (Devin, Claude Code, GitHub Copilot Workspace, OpenCode, Windsurf). The agent executes `dock` deterministically without consuming LLM prompt tokens for infrastructure analysis.

---

## System Requirements

| Component | Minimum Version | Recommended / Notes | Verification Command |
|---|---|---|---|
| **Node.js** | `>= 26.0.0` | Node 26.x LTS | `node -v` |
| **npm** | `>= 10.0.0` | Included with Node.js 26+ | `npm -v` |
| **Docker Engine** | `>= 24.0.0` | Docker Desktop, Rancher Desktop, Colima, or Podman (OCI-compatible runtime) | `docker --version` |
| **Docker Compose**| `v2.0.0+` | Compose v2 plugin (native `docker compose` command, not standalone `docker-compose`) | `docker compose version` |
| **Operating System** | macOS, Windows 10/11 (WSL2), Linux | Apple Silicon (arm64) and x86_64 supported | `uname -s` / `cmd /c ver` |

> 💡 **Apple Silicon (M1/M2/M3/M4):** Native ARM64 images are prioritized. AMD64-only images (e.g. SQL Server, Db2, IBM MQ) run automatically using Rosetta 2 or QEMU emulation.  
> 💡 **Windows:** Run Docker with WSL2 backend. Ensure projects reside inside the WSL filesystem or a shared drive mounted with proper execute permissions.

---

## Installation & Setup

`dock-local` is designed for friction-free local execution straight from a git checkout—no npm registry publishing required. The entrypoint `bin/dock.js` automatically builds TypeScript sources into `dist/` on its first run.

### Option 1: macOS & Linux

#### Method A: User Bin Symlink (Recommended — No Root / Sudo Required)
If you have `~/.local/bin` in your `$PATH` (standard on modern macOS and Linux):

```bash
# Clone the repository
git clone <repository-url> ~/dock-local

# Build the project
cd ~/dock-local
npm run build

# Make the CLI executable and link to ~/.local/bin
chmod +x bin/dock.js
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock-local

# Verify installation
dock --version
```

*(If `~/.local/bin` is not yet in your PATH, add `export PATH="$HOME/.local/bin:$PATH"` to your `~/.zshrc` or `~/.bashrc`)*.

#### Method B: npm link
```bash
cd ~/dock-local
npm run link
dock --version
```

---

### Option 2: Windows (PowerShell or CMD)

#### Method A: Global Link via npm
In an elevated PowerShell or Command Prompt terminal:

```powershell
# Clone the repository
git clone <repository-url> "$HOME\dock-local"
cd "$HOME\dock-local"

# Install dependencies and build
npm install
npm run build

# Register global link
npm link

# Verify installation
dock --version
```
*`npm link` generates `dock.cmd` and `dock.ps1` inside your user's `%APPDATA%\npm` folder, which is already in the default Windows PATH.*

#### Method B: Direct Execution (Zero Installation)
You can also run the CLI directly without adding to PATH:

```powershell
node "$HOME\dock-local\bin\dock.js" doctor
```

---

## Quick Start (30-Second Workflow)

Navigate to any existing application project directory:

```bash
cd /path/to/your/project

# 1. Inspect what dock detects without making changes
dock detect --plan

# 2. Generate .dock/, create seed data, start containers, and monitor health
dock init -y --up

# 3. Check container health and access web management interfaces (Kafka UI, RabbitMQ Management Console, Grafana, etc.)
dock status

# 4. Connect your host application to the local stack
source .dock/app.env
npm start # or: mvn spring-boot:run, python app.py, etc.

# 5. Stop the orchestration stack when done (preserves persistent volumes)
dock down
```

Want to run the application containerized alongside its infrastructure?
```bash
dock init -y --up --app
```

---

## What Gets Generated (`.dock/` Architecture)

Running `dock init` creates a self-contained `.dock/` directory inside your project root:

```text
.dock/
├── docker-compose.yml       # Deterministic orchestration stack definition (auto-regenerated on changes)
├── .env                     # Port mappings, credentials, and runtime configuration (user edits are PRESERVED across regenerations)
├── app.env                  # Connection strings & service endpoints ready to export into host application runtime
├── dock.json                # State file: active services, container registry, and detected infrastructure metadata
└── init/                    # Initial seed scripts & data provisioning hooks (preserved across regenerations)
    ├── postgres/01-databases.sql         # Database schemas detected in JDBC connection URLs
    ├── kafka/create-topics.sh            # Topic names extracted from application code & Spring properties
    ├── rabbitmq/definitions.json         # Queue and exchange definitions detected in project
    ├── ministack/init.sh                 # AWS resource provisioning: S3 buckets, SQS queues, SNS topics, DynamoDB tables
    ├── keycloak/dock-realm.json          # Pre-configured OIDC realm with OAuth2 client & dev/dev test user
    ├── wiremock/mappings/dock-stubs.json # HTTP stub mappings for outbound external service URLs
    └── prometheus/ grafana/ otel/        # Metrics scraping configuration, pre-built dashboards, and OpenTelemetry Collector pipelines
```

> 💡 **Best Practice:** Commit the `.dock/` directory into your Git repository. Teammates only need to run `dock up` to get the entire project environment running identically.

---

## CLI Command Reference

### `dock detect [dir]`
Scans the repository codebase and outputs detected infrastructure dependencies, confidence scores (0.0-1.0), evidence trails, and extracted resource identifiers.

| Flag | Description |
|---|---|
| `--plan` | Shows the complete Docker Compose orchestration plan that `init` would generate |
| `--json` | Outputs compact JSON format (ideal for CI/CD automation and AI agent consumption) |
| `-v, --verbose` | Displays all matching file paths and regex pattern evidence |
| `--docs` | Also scans Markdown documentation and README files (treated with lower confidence weight) |
| `--threshold <n>` | Minimum confidence score threshold for automatic service inclusion (default: `0.5`, range: 0.0-1.0) |

### `dock init [dir]`
Generates the `.dock/` directory structure and prepares the local development environment.

| Flag | Description |
|---|---|
| `-y, --yes` | Skips interactive prompts and auto-accepts suggested service selections |
| `--up` | Immediately starts the orchestration stack and monitors container health checks |
| `--app [Dockerfile]` | Adds the application's own container image to the orchestration stack using the specified Dockerfile |
| `--app-port <port>` | Overrides the internal application HTTP port (defaults to Dockerfile `EXPOSE` directive or `8080`) |
| `-s, --services <ids>` | Force-includes comma-separated service IDs (e.g. `-s postgres,kafka`) |
| `-x, --exclude <ids>` | Excludes specific service IDs from the generated stack |
| `--minimal` | Excludes companion/management containers like Kafka UI, Kibana, or Grafana dashboards |
| `--force` | Overwrites user-customized seed files inside `.dock/init/` |
| `--registry <prefix>` | Custom container registry mirror prefix (defaults to official Docker Hub public registry) |

### `dock up [services...]`
Starts the container services and waits for health checks to pass (ready state).

| Flag | Description |
|---|---|
| `--app` | Also builds and starts the containerized application service (using Docker Compose `app` profile) |
| `--build` | Forces a rebuild of container images before starting services |
| `--foreground` | Runs containers attached in foreground mode instead of detached daemon mode |
| `--pull` | Forces pulling updated container images from remote registry before starting |

### `dock down`
Stops all running orchestration stack containers gracefully.

| Flag | Description |
|---|---|
| `-v, --volumes` | Removes persistent Docker named volumes (resets databases and message queues to clean slate) |

### `dock status`
Prints container operational health status, host-to-container port mappings, and clickable web management UI links.

### `dock logs [services...]`
Streams logs from stack containers.
- `-f, --follow`: Streams logs continuously.
- `--tail <n>`: Number of lines to show (default: `100`).

### `dock env`
Prints connection environment variables formatted to point your application runtime to the local infrastructure stack.
- `--export`: Prefixes variables with `export ` for direct bash/zsh shell evaluation.

### `dock add <services...>` & `dock remove <services...>`
Dynamically modifies the active orchestration stack and cleanly regenerates `docker-compose.yml` while preserving user customizations in `.env` and `init/` seed files.
```bash
dock add redis kibana
dock remove wiremock
dock add app
```

### `dock list`
Lists all infrastructure services supported by the catalog, including service categories, ID aliases, and cloud emulation details.
- `-c, --category <name>`: Filters by category (`database`, `messaging`, `cache`, `aws`, `security`, `observability`, `integration`).
- `-a, --all`: Includes runtime information and report-only utilities.

### `dock doctor`
Runs comprehensive diagnostics on the local development environment:
1. Docker CLI installation and client API version.
2. Docker daemon responsiveness and host OS/architecture (x86_64 vs ARM64).
3. Docker Compose v2 plugin availability.
4. TCP port collision detection on host for planned service port mappings.
5. Container registry connectivity and image pull access.
6. Bind-mount filesystem visibility from host into container volumes.
7. CPU architecture emulation warnings for Apple Silicon (ARM64 → x86_64 via Rosetta/QEMU).

### `dock share`
Generates a copy-pasteable Markdown documentation snippet formatted for your project's `README.md`, documenting exactly how team members can bootstrap and interact with the local infrastructure stack.

---

## Supported Services Catalog

| Category | Service ID | Container Image / Emulation | Automatic Provisioning & Behaviors |
|---|---|---|---|
| **Relational Databases** | `postgres` | PostgreSQL 16 Alpine | Database schemas extracted from JDBC connection URLs created at container startup |
| | `mysql` | MySQL 8.4 (MariaDB wire-protocol compatible) | Database schemas created automatically from detected JDBC/connection URLs |
| | `oracle` | Oracle Database Free 23c (`gvenzl/oracle-free`) | Application database user and tablespace auto-provisioned |
| | `sqlserver` | MS SQL Server 2022 Developer Edition | Runs under x86_64 emulation (Rosetta 2/QEMU) on Apple Silicon ARM64 hosts |
| | `db2` | IBM Db2 Community Edition | Local emulation of mainframe DB2 for z/OS |
| **NoSQL Databases** | `mongodb` | MongoDB 7 | Local substitute for AWS DocumentDB; database instances pre-created from connection strings |
| | `cassandra` | Apache Cassandra 4.1 | Keyspaces and tables created via `.dock/init/cassandra/init.cql` CQL script |
| **Cache & Search** | `redis` | Redis 7 Alpine | Local substitute for AWS ElastiCache Redis and Valkey use cases |
| | `hazelcast` | Hazelcast IMDG 5 | Distributed in-memory data grid; also serves as local substitute for Red Hat Infinispan |
| | `elasticsearch` | Elasticsearch 8 | Single-node cluster with security disabled for local development |
| | `opensearch` | OpenSearch 2.x | Local substitute for AWS OpenSearch Service |
| **Message Brokers** | `kafka` | Apache Kafka 3.8 (KRaft mode, ZooKeeper-less) | Auto-creates detected topic names; bundled with Kafka UI management console |
| | `rabbitmq` | RabbitMQ 3.13 with Management Plugin | Queue and exchange declarations auto-applied at container startup |
| | `ibm-mq` | IBM MQ Advanced for Developers | Pre-configured Queue Manager QM1 with developer channel definitions |
| | `activemq` | Apache ActiveMQ Artemis | Full JMS 2.0 / AMQP 1.0 message broker with web management console |
| **AWS Cloud Services** | `ministack` | LocalStack-compatible REST API endpoint | Consolidated AWS service emulator: S3 object storage, SQS/SNS messaging, DynamoDB NoSQL, Secrets Manager, Systems Manager Parameter Store, Kinesis data streams, EventBridge event bus, KMS encryption, CloudWatch logs/metrics |
| **Identity & Security** | `keycloak` | Keycloak (Dev Mode) | Pre-imported OIDC realm, OAuth2 client `app`, and test user credentials `dev/dev` |
| | `vault` | HashiCorp Vault (Dev Mode) | KV v2 secret engine enabled with dev root token `root` |
| **Observability** | `prometheus` | Prometheus Time-Series Database | Scrapes application metrics endpoint via configured `APP_PORT` |
| | `grafana` | Grafana Analytics & Visualization | Pre-provisioned dashboards for Prometheus metrics & Jaeger distributed traces |
| | `otel-collector` | OpenTelemetry Collector | OTLP receiver endpoints: gRPC (port 4317) & HTTP (port 4318) for traces, metrics, and logs |
| | `jaeger` | Jaeger Distributed Tracing UI | Receives and visualizes distributed traces from OpenTelemetry Collector |
| **External Integrations** | `wiremock` | WireMock HTTP Mock Server | Generates HTTP/HTTPS stub mappings for external service endpoints (Apigee API Gateway, mainframe SOAP services, partner REST APIs) |

---

## Connecting Your Application

### 1. Spring Boot (Java / Kotlin)
Environment variables override `application.yml` / `application.properties` Spring configuration automatically:
```bash
source .dock/app.env
./mvnw spring-boot:run
```
*Tip: Disable AWS MSK IAM authentication or enterprise SSO in your local Spring profile (`SPRING_PROFILES_ACTIVE=local`).*

### 2. Node.js (TypeScript / JavaScript)
Native environment variable loading (Node.js 20+):
```bash
node --env-file=.dock/app.env dist/main.js
# Or with npm run-script:
env $(cat .dock/app.env | xargs) npm run dev
```

### 3. Python (FastAPI / Django / Flask)
```bash
export $(grep -v '^#' .dock/app.env | xargs)
python main.py
```

### 4. .NET / C#
```bash
# In bash / WSL:
export $(cat .dock/app.env | xargs)
dotnet run
```

---

## Using with AI Coding Agents (Agent Skill Mode)

`dock-local` is built AI agent-native. It includes a [`SKILL.md`](SKILL.md) specification that allows autonomous AI coding agents (such as Devin CLI, GitHub Copilot Workspace, Windsurf, or Claude Code) to use `dock` deterministically:

1. **Configure the AI agent:**
   Symlink `dock-local` to your agent's global or project-specific skills directory:
   ```bash
   ln -s ~/dock-local ~/.config/devin/skills/dock
   ```
2. **Invoke via natural language:**
   > *"Configure the local development infrastructure for this repository using `/dock`."*
3. The agent executes `dock init -y --up` deterministically and relays container health status, port mappings, and web UI endpoints back to the user without consuming LLM tokens or generating hallucinated infrastructure-as-code changes.

---

## Contributing & Development

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

```bash
# Clone and enter repo
git clone <repository-url> dock-local
cd dock-local

# Install dependencies
npm install

# Run typechecker
npm run typecheck

# Run test suite (Vitest against real project fixtures)
npm test

# Build TypeScript to dist/
npm run build
```

### Adding New Infrastructure Services

Adding a new infrastructure service to the catalog is simple and requires **no TypeScript code**:
1. Add a service entry to the corresponding category file in `catalog/*.yaml`.
2. Define heuristic detection rules (`dependencies`, `patterns`, `files`, `env`).
3. Add seed data template files in `templates/<service>/` if needed.
4. Run `npm test` to verify detection and generation logic.

See [CATALOG-RECOMMENDATIONS.md](CATALOG-RECOMMENDATIONS.md) for a list of services we'd love to support!

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
