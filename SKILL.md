---
name: dock-local
description: Run a project's infrastructure locally with Docker. Detects databases, brokers, caches, AWS services (ministack), OAuth (Keycloak), observability and external APIs (WireMock stubs), generates a Docker Compose stack in .dock/ with seed data, and can run the project's own image inside it (--app).
argument-hint: "[detect|init|up|status|add <service>|doctor]"
category: operate
tags: [docker, docker-compose, local-development, catalog-driven, devops, detection]
allowed-tools:
  - read
  - grep
  - glob
  - exec
permissions:
  allow:
    - Exec(dock)
    - Exec(node)
  ask:
    - Exec(dock down -v)
---

The `dock` CLI does all detection and generation deterministically. Your job is to run
it and relay results — do NOT scan the repo or write compose files yourself.

**CLI**: `dock` if on PATH, else `node <directory of this SKILL.md>/bin/dock.js` (self-builds on first run; no registry needed).

## Default path (zero analysis)

```
dock init -y --up            # detect → generate .dock/ → start → status
dock init -y --up --app      # same, plus the project's own Dockerfile running in the stack
```

Relay the printed status (services, ports, UI links) and the `Notes` lines. Stop there
unless something failed or the user asks for more.

## Only if needed

- Failure → `dock doctor`, then `dock logs <service> --tail 50`. Fix, re-run `dock up`.
- User wants to review first → `dock detect --plan`; adjust with `dock init -y --services a,b --exclude c` or `dock add/remove <id>`.
- Nothing detected → `dock list`, ask which services, `dock init -y --services ...`.
- Wiring the app on the host → `dock env`; prefer env vars / IDE run config over editing committed config.

## Rules

- Values live in `.dock/.env`, seeds in `.dock/init/**` (kept on regeneration; `--force` overwrites). Never hand-edit `docker-compose.yml`.
- `dock down -v` deletes data — confirm first.
- Keep output small: `--json`, `-q`, `--tail`. Don't paste raw logs.
- Detection wrong or missing? Add the service explicitly; if it recurs, propose a rule in `catalog/*.yaml`.
