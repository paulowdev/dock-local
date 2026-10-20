# dock-local — User Guide

`dock` is a command-line tool that **discovers what your project needs** (relational and NoSQL databases, message queues, distributed caches, AWS cloud services, identity providers, external API mocks, observability platforms) and **generates a ready-to-run Docker Compose orchestration environment**, with initial seed data, so you can run, test, and validate workflows locally — without depending on shared DEV/PRE environments or cloud credentials.

---

## 1. System Prerequisites

| Requirement | Minimum Version | Platforms | How to Check |
|---|---|---|---|
| **Node.js** | `>= 18.18.0` (recommended 20.x or 22.x LTS) | macOS, Windows, Linux | `node -v` |
| **npm** | `>= 9.0.0` | macOS, Windows, Linux | `npm -v` |
| **Docker Engine** | `>= 24.0.0` (Docker Desktop, Rancher Desktop, Colima or Podman - OCI-compatible runtime) | macOS, Windows, Linux | `docker --version` |
| **Docker Compose** | `v2.0.0+` (native `docker compose` plugin, not standalone `docker-compose`) | macOS, Windows, Linux | `docker compose version` |

### Platform-Specific Notes

#### macOS (Apple Silicon M1/M2/M3/M4 & Intel)
- **File Sharing:** In Docker Desktop or Rancher Desktop, ensure that your projects folder is shared in `Settings → Resources → File sharing` (e.g., `/Users`). Directories in `/tmp` are typically not shared by default for bind-mount volumes.
- **ARM64 Architecture:** Most container images in the catalog already have native ARM64 multi-architecture builds. Legacy AMD64-only images (such as MS SQL Server, IBM Db2, and IBM MQ) run automatically under Rosetta 2 / QEMU x86_64 emulation.

#### Windows 10 / 11 (PowerShell & WSL2)
- **WSL2 Backend:** It is highly recommended to enable WSL2 integration in Docker Desktop / Rancher Desktop (`Settings → Resources → WSL Integration`) for optimal performance.
- **Project Location:** Prefer cloning your repositories in the Linux WSL filesystem (`\\wsl$\Ubuntu\home\...`) or on drives with execution permissions to avoid slow bind-mount I/O performance on NTFS.
- **Line Endings (CRLF vs LF):** Since containers execute bash seed scripts (`.dock/init/**/init.sh`), ensure Git doesn't convert line endings to CRLF (`git config core.autocrlf input`).

---

## 2. Installation and Local Configuration (Without Registry)

`dock` doesn't need to be published to public npm registries. It runs directly from the cloned code.

### On macOS and Linux

#### Recommended Method: Symlink in User Directory (No Sudo)
```bash
# 1. Clone to your home folder
git clone <repository-url> ~/dock-local

# 2. Enter the folder and build
cd ~/dock-local
npm run build

# 3. Make the script executable and link it in ~/.local/bin
chmod +x bin/dock.js
mkdir -p ~/.local/bin
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock-local

# 4. Validate
dock --version
```
*(Make sure you have `~/.local/bin` in your `$PATH`, adding `export PATH="$HOME/.local/bin:$PATH"` to your `~/.zshrc` or `~/.bashrc` if necessary)*.

#### Alternative Method: npm link
```bash
cd ~/dock-local
npm run link
dock --version
```

---

### On Windows (PowerShell / CMD)

#### Global Method via npm:
Open PowerShell or Command Prompt:
```powershell
# 1. Clone the repository
git clone <repository-url> "$HOME\dock-local"
cd "$HOME\dock-local"

# 2. Install dependencies and build
npm install
npm run build

# 3. Register the command globally
npm link

# 4. Validate
dock --version
```
*`npm link` automatically generates the `dock.cmd` and `dock.ps1` executables in your user's global directory.*

#### Method Without Installation (Direct Execution):
```powershell
node "$HOME\dock-local\bin\dock.js" doctor
```

---

## 3. Quick Start (Direct Flow)

Inside the project folder you want to test:

```bash
dock init -y --up
```

This command performs in sequence:
1. **Detection:** Identifies infrastructure dependencies (databases, message brokers, AWS cloud services, etc.).
2. **Generation:** Creates the `.dock/` folder with `docker-compose.yml` orchestration file, `.env` configuration, `app.env` connection variables, and seed provisioning scripts.
3. **Initialization:** Starts all container services and waits for each container's health check to pass.
4. **Report:** Displays consolidated container status and clickable links to web management interfaces (UIs).

### Also running the application itself in a container:
If your project has a `Dockerfile`:
```bash
dock init -y --up --app
```

---

## 4. Detailed Step-by-Step

### 4.1 Inspect the Project Before Starting (`detect`)
To visualize what `dock` discovered without changing any files:
```bash
dock detect --plan
```

The output displays:
- **Services to run locally:** Detected infrastructure services with confidence level (0.0 to 1.0) and evidence found in code/dependency manifests.
- **Context (nothing to run):** Informational components (e.g., H2 embedded database, Caffeine in-memory cache, Dynatrace APM, CI/CD pipelines).
- **Resources extracted:** Real resource identifiers of databases, Kafka topics, message queues, and S3 buckets that will be auto-provisioned.
- **Stack plan:** TCP ports that will be exposed on the host and the infrastructure role of each container service.

### 4.2 Adjust Service Selection
```bash
# Force inclusion of specific services
dock init -y --services postgres,kafka

# Exclude detected services you don't want to run
dock init -y --exclude wiremock,prometheus

# Minimal mode (without web interfaces or auxiliary jobs)
dock init -y --minimal

# Query the complete catalog and supported aliases
dock list
```

### 4.3 Start, Stop, and Monitor
```bash
# Start the infrastructure stack
dock up

# Start infrastructure + containerized application (rebuilding the image)
dock up --app --build

# View container health status and port mappings
dock status

# Stream logs from a specific service
dock logs kafka -f

# Stop containers while preserving persistent volume data
dock down

# Stop and DELETE all Docker volumes (clean slate - resets databases and queues)
dock down -v
```

### 4.4 Add and Remove Services in the Existing Environment
You can dynamically modify the orchestration stack composition at any time without losing your customized port mappings or seed file edits:
```bash
dock add redis kibana
dock remove wiremock
dock add app
```

### 4.5 Local Environment Diagnostics (`doctor`)
```bash
dock doctor
```
Comprehensive diagnostics check:
- Docker CLI and daemon installation, API version, and connectivity.
- Presence of Docker Compose v2 plugin.
- TCP port conflicts on the host (e.g., port 5432 already occupied by another local PostgreSQL instance).
- Container registry connectivity and image pull access.
- Bind-mount filesystem visibility from the `.dock/` folder inside container volumes.

---

## 5. Structure Generated in `.dock/`

```text
.dock/
├── docker-compose.yml       # Docker Compose orchestration stack (auto-regenerated; don't edit manually)
├── .env                     # Port mappings and credentials (EDIT here — your changes are preserved across regenerations)
├── app.env                  # Connection environment variables ready to export in the host application runtime
├── dock.json                # State file: selected services, container registry, and mapped resource identifiers
└── init/                    # Initial seed data and database schemas (preserved between regenerations)
    ├── postgres/01-databases.sql         # Database schemas extracted from JDBC connection URLs
    ├── kafka/create-topics.sh            # Topic names extracted from application code and Spring properties
    ├── rabbitmq/definitions.json         # Queue and exchange definitions configured for auto-provisioning
    ├── ministack/init.sh                 # AWS resource provisioning: S3 buckets, SQS queues, SNS topics, DynamoDB tables
    ├── keycloak/dock-realm.json          # Pre-configured OIDC realm with OAuth2 client and dev/dev test user
    ├── wiremock/mappings/dock-stubs.json # HTTP stub mappings for external service integrations
    └── prometheus/ grafana/ otel/        # Prometheus metrics scraping configuration and OpenTelemetry Collector trace pipelines
```

---

## 6. How to Connect Your Application to the Stack

### Running on the Host (IDE Debugger or Terminal)

The necessary connection environment variables are saved in `.dock/app.env`.

- **In Bash / Zsh:**
  ```bash
  source .dock/app.env
  ./mvnw spring-boot:run   # or: npm start, python main.py, dotnet run
  ```
- **In PowerShell (Windows):**
  ```powershell
  Get-Content .dock/app.env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
  mvn spring-boot:run
  ```
- **In VS Code:**
  Add `"envFile": "${workspaceFolder}/.dock/app.env"` to your `launch.json` configuration.
- **In IntelliJ IDEA:**
  In the *Run/Debug Configurations* menu, add the `.dock/app.env` file to the *EnvFile* field or import the variables.

---

## 7. Common Troubleshooting Table

| Symptom | Most Frequent Cause | What to Do |
|---|---|---|
| `port XXXX in use` in `dock doctor` | Another local process is already binding to the default port | Edit the corresponding `*_PORT` variable in the `.dock/.env` file and run `dock up` |
| `docker daemon not running` | Docker Desktop / Rancher Desktop daemon is not started | Start the Docker application and wait for daemon initialization to complete |
| Failed to pull images with 403 / Forbidden | Container image is outside corporate registry mirror (e.g., quay.io blocked) | Change to an equivalent image on Docker Hub or configure `--registry` |
| Seed scripts in `.dock/init/` don't execute | Bind-mount folder sharing permission issue in Docker | Keep the project within `$HOME` filesystem and verify `dock doctor` output |
| CRLF error in bash scripts inside container (Windows) | Git auto-converted `.sh` seed files to Windows CRLF line endings | Run `git config core.autocrlf input` and re-checkout the repository |
| I want to completely reset the environment to clean slate | Corrupted Docker volumes or major database schema changes | Run `dock down -v && rm -rf .dock && dock init -y --up` |

---

## 8. Integration with AI Coding Agents

The project root contains a `SKILL.md` specification file. When you use AI coding assistants like Devin, Claude Code, GitHub Copilot Workspace, or Windsurf:
- Simply symlink `dock-local` in the agent's skills directory (`~/.config/devin/skills/dock`).
- The agent recognizes the `/dock` command and deterministically executes `dock init -y --up`, providing infrastructure status reports without consuming LLM tokens or attempting to manually generate `docker-compose.yml` files.
