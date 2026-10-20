import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { parseEnv } from "../generate/writer.js";
import { dockDir } from "../util/paths.js";
import { context, planFromState, requireState } from "./context.js";

/** Markdown onboarding snippet for the project's README: how a teammate runs this stack. */
export function shareCommand(): void {
  const ctx = context();
  const state = requireState(ctx.projectDir);
  const dir = dockDir(ctx.projectDir);
  const env = parseEnv(readFileSync(join(dir, ".env"), "utf8"));
  const doc = parse(readFileSync(join(dir, "docker-compose.yml"), "utf8")) as { services: Record<string, { ports?: string[] }> };
  const plan = planFromState(state, ctx.catalog);
  const port = (p: string) => p.split(":")[0]!.replace(/\$\{(\w+)\}/g, (_, k) => env[k] ?? k);
  const rows = plan.runnable.map((e) => {
    const ports = (doc.services[e.id]?.ports ?? []).map(port).join(", ") || "-";
    const role = plan.consumers.get(e.id)?.map((c) => c.name).join(", ");
    return `| \`${e.id}\` | ${ports} | ${role ? `emulates ${role}` : e.summary ?? e.name} |`;
  });
  const appEnv = parseEnv(readFileSync(join(dir, "app.env"), "utf8"));
  const urls = Object.entries(appEnv).filter(([k]) => /_UI_URL$|^(GRAFANA|PROMETHEUS|JAEGER|KEYCLOAK|WIREMOCK)_URL$/.test(k));

  console.log([
    "## Ambiente local (dock-local)",
    "",
    "Pré-requisitos: Docker (Compose v2) e Node.js 18+. Instale o `dock` uma vez:",
    "",
    "```bash",
    "git clone <repo-do-dock-local> ~/dock-local && (cd ~/dock-local && npm run link)",
    "```",
    "",
    "Subir a infraestrutura deste projeto:",
    "",
    "```bash",
    "dock up            # sobe tudo em .dock/ e aguarda ficar saudável",
    "dock status        # saúde dos containers + links das UIs",
    "source .dock/app.env   # aponta a aplicação para o stack local",
    state.app ? "dock up --app --build  # ou rode a própria aplicação dentro do stack" : "",
    "dock down          # para (dados preservados; `dock down -v` apaga)",
    "```",
    "",
    "| serviço | porta(s) no host | papel |",
    "|---|---|---|",
    ...rows,
    "",
    ...(urls.length ? ["UIs: " + urls.map(([k, v]) => `[${k.replace(/_URL$/, "").toLowerCase()}](${v})`).join(" · "), ""] : []),
    "Valores (portas, senhas) em `.dock/.env`; dados iniciais em `.dock/init/`. Não edite `docker-compose.yml` à mão — use `dock add/remove`.",
  ].filter((l) => l !== undefined).join("\n").replace(/\n\n\n+/g, "\n\n"));
}
