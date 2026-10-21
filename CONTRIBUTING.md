# Contributing to dock-local

Thank you for your interest in contributing to **dock-local**! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Adding New Services to the Catalog](#adding-new-services-to-the-catalog)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

- **Check existing issues** to see if the bug has already been reported
- **Use the bug report template** when creating a new issue
- **Include details**: OS, Docker version, Node.js version, steps to reproduce
- **Attach logs** when possible (use `dock doctor` output)

### Suggesting Enhancements

- **Check the [CATALOG-RECOMMENDATIONS.md](CATALOG-RECOMMENDATIONS.md)** to see if your suggestion is already listed
- **Open a feature request issue** with a clear description
- **Explain the use case** and why it would benefit other users

### Adding New Services

This is one of the most valuable contributions! See the detailed guide below.

## Development Setup

### Prerequisites

- Node.js >= 18.18
- Docker >= 24.0
- Docker Compose v2+
- Git

### Setup Steps

```bash
# Clone the repository
git clone https://github.com/<paulowdev>/dock-local.git
cd dock-local

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run type checking
npm run typecheck

# Link locally for testing
npm link
```

### Project Structure

```
dock-local/
├── bin/                    # CLI entrypoint
├── src/                    # TypeScript source
│   ├── catalog/            # Catalog loader
│   ├── commands/           # CLI command implementations
│   ├── detect/             # Detection engine
│   ├── generate/           # Compose & seed generation
│   └── util/               # Utilities
├── catalog/                # Service definitions (YAML)
│   ├── 10-databases.yaml
│   ├── 20-cache-search.yaml
│   ├── 30-messaging.yaml
│   ├── 40-aws.yaml
│   ├── 50-security.yaml
│   ├── 60-observability.yaml
│   ├── 70-integration.yaml
│   └── 80-platform.yaml
├── templates/              # Seed file templates
└── test/                   # Tests and fixtures
    └── fixtures/           # Sample projects for testing
```

## Adding New Services to the Catalog

Adding a service requires **no TypeScript code**—everything is declarative YAML!

### Step 1: Choose the Right Catalog File

Add your service entry to the appropriate category:

- `10-databases.yaml` - Relational, NoSQL, document stores
- `20-cache-search.yaml` - Redis, Memcached, Elasticsearch, etc.
- `30-messaging.yaml` - Kafka, RabbitMQ, message brokers
- `40-aws.yaml` - AWS service emulators
- `50-security.yaml` - OAuth, secrets management
- `60-observability.yaml` - Metrics, tracing, logging
- `70-integration.yaml` - API mocking, external integrations
- `80-platform.yaml` - Runtimes, orchestration

### Step 2: Define the Service Entry

Here's a complete example for adding **Valkey** (Redis alternative):

```yaml
- id: valkey
  kind: service
  category: cache
  name: Valkey
  description: "Redis-compatible in-memory data store (Linux Foundation fork)"

  aliases:
    - redis-oss

  detect:
    dependencies:
      - valkey
      - valkey-client
      - ioredis  # Can also detect Redis clients
    patterns:
      - "valkey://"
      - "VALKEY_URL"
      - "VALKEY_HOST"
    env:
      - VALKEY_URL
      - VALKEY_HOST
      - VALKEY_PORT
    confidence:
      dependency: 0.9
      pattern: 0.8
      env: 0.7

  compose:
    image: "valkey/valkey:7-alpine"
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    environment:
      VALKEY_PASSWORD: "devpass"
    volumes:
      - "valkey-data:/data"

  appEnv:
    VALKEY_URL: "valkey://localhost:6379"
    VALKEY_HOST: "localhost"
    VALKEY_PORT: "6379"
    REDIS_URL: "redis://localhost:6379"  # Compatibility
```

### Step 3: Add Templates (Optional)

If your service needs seed data or initialization scripts, create templates:

```bash
mkdir -p templates/valkey
```

**Example:** `templates/valkey/init.sh`

```bash
#!/bin/sh
# Valkey initialization script
valkey-cli SET welcome "Hello from dock-local"
```

Reference the template in your YAML:

```yaml
  seeds:
    - source: init.sh
      dest: init/valkey/init.sh
      mode: "0755"
```

### Step 4: Add Resource Extraction (Optional)

If your service needs to extract resources from code (like database names, topics, queues):

```yaml
  resources:
    databases:
      patterns:
        - 'valkey://[^/]+/(\d+)'  # Extract DB number
      files:
        - "**/*.{js,ts,py,java}"
```

### Step 5: Test Your Addition

Create a test fixture project:

```bash
mkdir -p test/fixtures/valkey-app
cd test/fixtures/valkey-app

# Create a minimal project that uses Valkey
cat > package.json <<EOF
{
  "dependencies": {
    "ioredis": "^5.0.0"
  }
}
EOF

cat > index.js <<EOF
const Redis = require('ioredis');
const client = new Redis('valkey://localhost:6379');
EOF
```

Add a test case in `test/detect.test.ts`:

```typescript
it("detects valkey", async () => {
  const r = await detect(join(fixtures, "valkey-app"));
  const ids = byId(r.detections);
  expect(ids.has("valkey")).toBe(true);
});
```

Run tests:

```bash
npm test
```

### Step 6: Update Documentation

Add your service to the README.md catalog table:

```markdown
| **Cache & Search** | `valkey` | Valkey 7 Alpine | Redis-compatible, Linux Foundation fork |
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type checking only
npm run typecheck
```

### Manual Testing

```bash
# Test detection
dock detect test/fixtures/your-app

# Test full workflow
cd test/fixtures/your-app
dock init -y --up
dock status
dock down -v
```

## Submitting Changes

### Branch Naming

- `feature/add-valkey-support`
- `fix/postgres-seed-generation`
- `docs/update-contributing-guide`

### Commit Messages

Follow conventional commits:

```
feat: add Valkey support to cache catalog
fix: correct RabbitMQ queue detection pattern
docs: update catalog recommendations
test: add fixture for Temporal workflow
```

### Pull Request Process

1. **Fork** the repository
2. **Create a feature branch** from `main`
3. **Make your changes** following the style guide
4. **Run tests** and ensure they pass
5. **Update documentation** as needed
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open a Pull Request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots/logs if applicable
   - Checklist of what was changed

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Documentation updated (README, catalog docs)
- [ ] New files added to `package.json` `files` array if needed
- [ ] Catalog entry follows the schema
- [ ] Templates are well-documented
- [ ] Fixtures added for new detection rules

## Style Guidelines

### YAML Style

```yaml
# Use 2-space indentation
# Prefer double quotes for strings
# Keep entries alphabetically sorted within categories
# Use descriptive comments

- id: service-name
  kind: service
  category: database
  name: "Service Display Name"
  description: "Clear, concise description"
```

### TypeScript Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters and returns
- Follow existing code patterns
- Keep functions focused and small

### Shell Script Style

All shell scripts in `templates/` are automatically checked with **Shellcheck** and **shfmt** in pull requests.

**Required:**
- Use `#!/bin/bash` or `#!/bin/sh` shebang
- Include `set -euo pipefail` for error handling
- Use 2-space indentation (enforced by shfmt)
- Quote all variable expansions: `"$var"` not `$var`
- Use `[[` instead of `[` for conditionals (in bash)

**Tools:**
```bash
# Install tools
brew install shellcheck shfmt  # macOS
apt install shellcheck shfmt   # Ubuntu/Debian

# Check your scripts
shellcheck templates/**/*.sh

# Format your scripts
shfmt -w -i 2 -ci -bn templates/**/*.sh
```

**shfmt flags:**
- `-i 2`: 2-space indentation
- `-ci`: Switch cases indent
- `-bn`: Binary operators at start of line

### Documentation Style

- Use clear, concise language
- Include code examples where helpful
- Keep line length <= 100 characters
- Use proper markdown formatting
- Add links to relevant docs

## Questions?

- Open a **Discussion** on GitHub for questions
- Check existing **Issues** for similar topics
- Read the **[Developer Guide](docs/DEVELOPER-GUIDE.md)** for architecture details

Thank you for contributing to dock-local! 🚀
