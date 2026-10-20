# dock-local — Guia do Desenvolvedor

Este guia explica como o `dock` funciona por dentro, como rodar e testar o projeto e —
principalmente — como **adicionar ou ajustar serviços**, que é 90% da manutenção e não exige
TypeScript.

---

## 1. Princípio: uma única fonte de verdade

Tudo que o `dock` sabe sobre um serviço está em **uma entrada YAML** em `catalog/*.yaml`:

```
detecção  ──►  plano  ──►  compose + .env + seeds + app.env
   ▲                             ▲
   └───── catalog/*.yaml ────────┘
```

A mesma entrada diz *como detectar* (dependências, regex, arquivos, variáveis), *como rodar*
(fragmento compose), *o que semear* (templates) e *como a aplicação enxerga o serviço*
(`appEnv`). Detecção, geração, `dock list` e o relatório derivam dela. Não há código por
serviço.

---

## 2. Estrutura do repositório

```
bin/dock.js            entrypoint; compila dist/ sozinho na primeira execução
src/
  cli.ts               comandos (commander)
  catalog/             types.ts (schema), loader.ts (carrega + valida catalog/*.yaml)
  detect/              scanner.ts (varre arquivos, extrai dependências), matcher.ts (pontua + extrai recursos)
  generate/            plan.ts (seleção → providers/companions/requires), compose.ts, writer.ts (.dock/), state.ts (dock.json)
  commands/            detect, init, stack (up/down/status/logs/env), manage (add/remove/list), doctor, share, report
  util/                template.ts (mini-mustache), exec.ts, log.ts, paths.ts
catalog/               10-databases, 20-cache-search, 30-messaging, 40-aws, 50-security, 60-observability, 70-integration, 80-platform, 90-runtimes
templates/             seeds renderizados para .dock/init/**
test/                  vitest + fixtures (spring-app, node-app)
docs/                  este guia e o guia do usuário
reference-files/       inventário de recursos por projeto (insumo do catálogo)
```

---

## 3. Rodando localmente

### No macOS e Linux
```bash
npm install
npm run typecheck
npm test                    # vitest
npm run build               # tsc → dist/
node bin/dock.js detect test/fixtures/spring-app --plan
npx tsx src/cli.ts detect test/fixtures/node-app      # execução direta sem compilar
npm run link                # ou crie symlink: ln -sf $(pwd)/bin/dock.js ~/.local/bin/dock
```

### No Windows (PowerShell)
```powershell
npm install
npm run typecheck
npm test
npm run build
node bin\dock.js detect test\fixtures\spring-app --plan
npm link                    # disponibiliza `dock` no PATH do usuário
```

### Teste ponta a ponta (com Docker)

```bash
cp -R test/fixtures/node-app ~/dock-e2e && cd ~/dock-e2e     # dentro de $HOME (não /tmp)
dock init -y --minimal --app --up
curl localhost:3000          # a app fixture testa a conectividade com cada serviço
dock down -v && cd .. && rm -rf ~/dock-e2e
```

---

## 4. Como funciona a detecção

`scanner.ts` coleta arquivos em três classes (docs só com `--docs`):

| classe | exemplos | uso |
|---|---|---|
| manifest | `pom.xml`, `build.gradle(.kts)`, `package.json`, `requirements*.txt`, `pyproject.toml`, `go.mod`, `*.csproj`, `Gemfile` | dependências normalizadas (`group:artifact`, nome npm/pip…) |
| config | `application*.yml/properties`, `.env*`, `*.tf`, `Dockerfile*`, `values*.yaml`, `.gluon/**`, `.github/workflows/*`, `template.yaml`, `apiproxy/**` | regex + extração de recursos |
| source | `*.java,kt,ts,js,py,go,cs,…` | regex com peso reduzido |

Ignora `node_modules`, `target`, `build`, `dist`, `.git`, `.dock`… Limite padrão: 2 500
arquivos, 512 KB cada.

`matcher.ts` aplica as regras de cada entrada e combina os sinais (noisy-or):

| evidência | peso |
|---|---|
| dependência declarada | 0.90 |
| arquivo presente (`files`) | 0.80 |
| regex em config | 0.65 |
| regex em código-fonte | 0.65 × 0.85 |
| nome de variável (`env`) | 0.50 |

Confiança ≥ 0.8 = alta, ≥ 0.5 = média (selecionada por padrão), abaixo = baixa.
`dependencies` aceita `*` (ex.: `org.apache.kafka:*`, `*kafka-starter*`) e casa tanto o id
completo quanto só o artefato.

### Extração de recursos

`extract` é um mapa `chave → regex`. A regex precisa de um grupo nomeado:

- `(?<v>...)` — um valor por match (`jdbc:postgresql://host/(?<v>[a-z_]+)`).
- `(?<block>...)` — um bloco YAML indentado; cada linha `chave: valor` ou `- valor` vira um
  valor (útil para `topics:` / `queues:` aninhados).

Valores com `${...}`, muito longos ou "ruído" (hosts de schema, registries, `localhost`…)
são descartados (`NOISE` em `matcher.ts`). Use chaves distintas por serviço quando o
significado difere (`rabbit_queues` vs `sqs_queues`), porque recursos são mesclados por chave
e usados nos templates.

---

## 5. Como funciona a geração

`plan.ts` — `buildPlan` pega detecções ≥ limiar (ou `--services`), remove `--exclude`, e
`expand` resolve:

- `provider` → o serviço que emula/stubba (S3 → `ministack`, Apigee → `wiremock`);
  `providerValue` alimenta `providerEnvKey` do provider (`SERVICES=s3,sqs`).
- `requires` → dependências rígidas (schema-registry → kafka), em ordem topológica.
- `companions` → opcionais (kafka → kafka-ui, kafka-init); `--minimal` os omite.

`compose.ts` — clona o fragmento `compose` de cada serviço executável, prefixa imagens do
Docker Hub com o registry (imagens totalmente qualificadas como `icr.io/...` ficam intactas),
coleta volumes nomeados, filtra `depends_on` para serviços presentes, adiciona a rede `dock`.
Com `--app`, gera o serviço `app` (profile `app`) com `appEnv` reescrito para
`serviço:porta` e overrides `appEnvInternal`.

`writer.ts` — escreve `.dock/`:

| arquivo | política |
|---|---|
| `docker-compose.yml`, `app.env`, `dock.json` | sempre regenerados |
| `.env` | mescla: valores existentes vencem os padrões do catálogo |
| `init/**` (seeds) | só cria se não existir; `--force` sobrescreve |

Templates usam um mini-mustache (`util/template.ts`): `{{a.b}}`, `{{#each lista}}{{this}}{{/each}}`,
`{{#if x}}…{{else}}…{{/if}}` (aninháveis). `{{{x}}}` é preservado (templating do WireMock).
Contexto disponível: `project`, `registry`, `env` (o `.env` mesclado), `resources`
(extraídos, mesclados), `services` (ids selecionados com `-` → `_`, ex. `services.otel_collector`).

---

## 6. Adicionando um serviço (passo a passo)

Exemplo: adicionar **Memcached**.

1. Escolha o arquivo pela categoria (`catalog/20-cache-search.yaml`) e acrescente:

```yaml
- id: memcached
  name: Memcached
  category: cache
  kind: service
  summary: Memcached 1.6.
  detect:
    dependencies: [memcached, pymemcache, net.spy:spymemcached, "*:spring-boot-starter-cache-memcached"]
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

2. Se precisar de seed, crie `templates/memcached/<arquivo>` e declare em `seeds:` com o
   `path` relativo a `.dock/`.
3. Se for emulado por outro serviço, use `kind: provider-backed` + `provider` +
   `providerValue`; se não puder rodar localmente, `kind: external` + `provider: wiremock`;
   se for só informativo, `kind: report-only` + `notes`.
4. Adicione uma asserção nas fixtures de `test/` (ou uma nova fixture) e rode `npm test`.
   O `loader.ts` valida o schema ao carregar — ids inválidos, referências quebradas e regex
   inválidas falham cedo.
5. Se a imagem não estiver no Docker Hub, confirme que o host é acessível na rede corporativa
   (`docker manifest inspect <imagem>`); quay.io tem CDN bloqueada.

### Campos do schema (`src/catalog/types.ts`)

| campo | obrigatório | descrição |
|---|---|---|
| `id`, `name`, `category`, `kind` | sim | `kind`: `service`, `provider-backed`, `external`, `report-only`, `runtime` |
| `aliases` | não | nomes alternativos aceitos em `--services`/`add` |
| `summary`, `notes` | não | linha do `dock list` / orientação no relatório |
| `provider`, `providerValue`, `providerEnvKey` | conforme kind | emulação/stub |
| `requires`, `companions` | não | grafo de dependências |
| `detect.{dependencies,patterns,files,env}` | não | regras de detecção |
| `extract` | não | regex `(?<v>)` ou `(?<block>)` |
| `compose` | `service` | fragmento compose (imagem obrigatória) |
| `env` | não | padrões gravados em `.dock/.env` |
| `seeds[]` | não | `{ path, template, executable? }` |
| `appEnv`, `appEnvInternal` | não | visão do host / visão de dentro da rede |

---

## 7. Convenções

- Portas do host sempre via variável (`${X_PORT}`) com padrão em `env` — permite resolver
  conflitos em `.dock/.env` sem regenerar.
- Volumes nomeados para dados (`<id>-data:/...`); bind mounts só para `./init/**` (`:ro`).
- Healthcheck em todo serviço do qual outros dependem (permite `depends_on: service_healthy`
  e `dock up --wait`). Jobs one-shot usam `restart: "no"` e viram
  `service_completed_successfully` para o `app`.
- Seeds idempotentes (`IF NOT EXISTS`, `--if-not-exists`, `head-bucket || create-bucket`).
- Nada de segredos reais em catálogo, templates ou fixtures.
- Código: TypeScript estrito, ESM, sem dependências além de `commander`, `yaml`, `fast-glob`,
  `picocolors`. Prefira uma regra de catálogo a um `if` no código.

---

## 8. Decisões de design (por quê)

- **CLI determinística + skill fina**: análise por LLM é cara e não reproduzível; o modelo só
  relata a saída do `dock`. `--json` e `-q` mantêm o contexto pequeno.
- **Ministack** em vez de um container por serviço AWS: uma imagem, uma porta, um
  `SERVICES` calculado. Compatível com LocalStack (`/_localstack/health`, hooks em
  `docker-entrypoint-initaws.d/ready.d`, `awslocal`).
- **WireMock** para o que não roda localmente (Apigee, mainframe, parceiros): permite validar
  fluxos ponta a ponta com respostas controladas.
- **Mirror JFrog por padrão**: a rede corporativa bloqueia partes do Docker Hub/quay.io;
  `--registry ""` ou `DOCK_REGISTRY` para outros ambientes.
- **`.dock/` versionável**: o time compartilha o ambiente e os dados iniciais como código.

---

## 9. Roteiro sugerido

- Rodar em repositórios reais e ajustar regras (falsos positivos/negativos) — cada ajuste é
  uma linha de YAML.
- Substituir os curingas dos componentes *Foundation* internos pelos `groupId:artifactId`
  exatos.
- Validar a subida das imagens pesadas (Oracle, Db2, IBM MQ, SQL Server) em uma máquina com
  disco/tempo.
- Companions opcionais adicionais (Kafka Connect UI, pgAdmin, Mongo Express) via `dock add`.
