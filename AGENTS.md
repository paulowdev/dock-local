# dock-local — notes for agents

- Build: `npm run build` (tsc → dist/). Typecheck: `npm run typecheck`. Tests: `npm test` (vitest, fixtures in test/fixtures).
- Distribution is via git checkout (no npm registry publishing required). `bin/dock.js` self-builds when dist/ is missing; `npm run link` puts `dock` on PATH.
- `--app` e2e: `dock init -y --minimal --app --up` in a copy of test/fixtures/node-app, then `curl localhost:3000` shows in-network reachability.
- Run without building: `npx tsx src/cli.ts <cmd>`; after building: `node bin/dock.js <cmd>`.
- Behaviour lives in `catalog/*.yaml` (detection rules, compose fragments, seeds, app hints) and `templates/`.
  Prefer adding/adjusting catalog entries over adding TypeScript branches.
- End-to-end check: copy a fixture somewhere under $HOME (not /tmp — the Docker VM may not share it),
  run `dock init --yes`, `dock up`, verify seeds, then `dock down -v`.
- Ministack: LocalStack-compatible (`/_localstack/health`, `docker-entrypoint-initaws.d/ready.d` hooks, `awslocal` inside the container).
  Use `awslocal` in seed scripts — the plain `aws` CLI with `AWS_ENDPOINT_URL` fails auth for SQS.
- Prefer widely-available Docker Hub images for better compatibility and accessibility.
