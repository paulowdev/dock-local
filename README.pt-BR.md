# dock-local

> **Infraestrutura local multi-stack para qualquer projeto, guiada por detecção automatizada.**  
> *Guiado por detecção automática de dependências em vez de um menu estático.*  
> 
> 🌐 **Idioma:** Português · [English version (README.md)](README.md) · [Guia do Usuário](docs/GUIA-DO-USUARIO.md) · [Guia do Desenvolvedor](docs/GUIA-DO-DESENVOLVEDOR.md)

[![License: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.18-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2%2B-2496ED.svg)](https://www.docker.com/)
[![Plataforma](https://img.shields.io/badge/Plataforma-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()

---

## Visão Geral

O **dock-local** é uma ferramenta de linha de comando (`dock`) que inspeciona qualquer repositório, identifica as dependências de infraestrutura (bancos de dados relacionais e NoSQL, brokers de mensageria, caches distribuídos, serviços de nuvem AWS, provedores de identidade, mocks de APIs externas e plataformas de observabilidade) e gera automaticamente um stack de orquestração **Docker Compose** pronto para execução, pré-populado com schemas de banco de dados e dados iniciais (seeds) extraídos do próprio código.

Elimina o atrito de provisionar ambientes compartilhados (DEV/PRE), buscar strings de conexão ou escrever manualmente arquivos de orquestração `docker-compose.yml`.

### Principais Diferenciais

- 🔍 **Detecção Heurística Automatizada:** Analisa manifestos de dependências (`pom.xml`, `package.json`, `build.gradle`, `requirements.txt`, `go.mod`, `*.csproj`), arquivos de configuração da aplicação (`application.yml`, `.env`, Helm values, definições Terraform IaC) e anotações no código-fonte.
- ⚡ **Auto-Provisionamento Sem Esforço:** Extrai os identificadores reais de recursos direto do seu código (schemas de banco SQL, tópicos Kafka, filas e exchanges RabbitMQ, buckets S3, tabelas DynamoDB, stubs HTTP WireMock) e os provisiona automaticamente na inicialização dos containers.
- ☁️ **Emulação de Serviços de Nuvem Integrada:** Consolida dependências de serviços AWS (S3 armazenamento de objetos, SQS/SNS mensageria, DynamoDB banco NoSQL, Secrets Manager, Systems Manager Parameter Store, Kinesis data streams, EventBridge barramento de eventos, KMS criptografia) em um único container **Ministack** leve com APIs REST compatíveis com LocalStack.
- 🔌 **Mocks de Integrações HTTP Externas:** Detecta integrações HTTP/SOAP de saída (proxies Apigee API Gateway, gateways de mainframe, web services REST/SOAP de parceiros) e provisiona stubs HTTP **WireMock** automaticamente.
- 💻 **Modo de Execução da Aplicação Flexível:**
  - Execute o processo da aplicação no **host** (depurador da IDE, CLI) conectado aos serviços containerizados via variáveis de ambiente geradas `.dock/app.env`.
  - Ou containerize a própria aplicação usando `--app` para construir e orquestrar o `Dockerfile` do seu projeto dentro do mesmo stack Docker Compose.
- 🔒 **100% Offline e Determinístico:** Não consome tokens de IA/LLM nem depende de chamadas a APIs de nuvem externas para detecção de infraestrutura.
- 🤖 **Pronto para Agentes de IA:** Inclui a especificação `SKILL.md` para agentes de código autônomos (Devin, Claude Code, GitHub Copilot Workspace, Windsurf, OpenCode). O agente executa o `dock` de forma determinística sem consumir tokens LLM para análise de infraestrutura.

---

## Requisitos do Sistema

| Componente | Versão Mínima | Recomendado / Observações | Comando de Verificação |
|---|---|---|---|
| **Node.js** | `>= 18.18.0` | Node 20.x ou 22.x LTS | `node -v` |
| **npm** | `>= 9.0.0` | Já incluso no Node.js | `npm -v` |
| **Docker Engine** | `>= 24.0.0` | Docker Desktop, Rancher Desktop, Colima ou Podman (runtime compatível OCI) | `docker --version` |
| **Docker Compose**| `v2.0.0+` | Plugin Compose v2 (comando nativo `docker compose`, não o `docker-compose` standalone) | `docker compose version` |
| **Sistema Operacional** | macOS, Windows 10/11 (WSL2), Linux | Suporte a ARM64 (Apple Silicon) e x86_64 | `uname -s` / `cmd /c ver` |

> 💡 **Apple Silicon (M1/M2/M3/M4):** Imagens nativas ARM64 têm prioridade. Imagens exclusivas AMD64 (ex: SQL Server, Db2, IBM MQ) rodam via emulação Rosetta 2 / QEMU.  
> 💡 **Windows:** Recomenda-se Docker com backend WSL2. Mantenha os projetos no sistema de arquivos do WSL ou em discos compartilhados com permissão de execução.

---

## Instalação e Configuração

O `dock-local` foi concebido para rodar diretamente de um checkout git local, sem necessidade de publicação em registries públicos ou privados. O entrypoint `bin/dock.js` compila o TypeScript automaticamente na primeira execução se `dist/` não existir.

### Opção 1: macOS e Linux

#### Método A: Symlink no Diretório do Usuário (Recomendado — Sem necessidade de sudo)
Se o diretório `~/.local/bin` estiver no seu `$PATH` (padrão no macOS e Linux modernos):

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio> ~/dock-local

# 2. Compilar o projeto
cd ~/dock-local
npm run build

# 3. Dar permissão de execução e criar os links simbólicos
chmod +x bin/dock.js
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock-local

# 4. Validar instalação
dock --version
```

*(Se `~/.local/bin` ainda não estiver no PATH, adicione `export PATH="$HOME/.local/bin:$PATH"` ao seu `~/.zshrc` ou `~/.bashrc`)*.

#### Método B: npm link global
```bash
cd ~/dock-local
npm run link
dock --version
```

---

### Opção 2: Windows (PowerShell ou CMD)

#### Método A: Link Global via npm
Em um terminal PowerShell ou Prompt de Comando (CMD):

```powershell
# 1. Clonar o repositório
git clone <url-do-repositorio> "$HOME\dock-local"
cd "$HOME\dock-local"

# 2. Instalar dependências e compilar
npm install
npm run build

# 3. Criar link global
npm link

# 4. Validar instalação
dock --version
```
*O `npm link` cria os comandos `dock.cmd` e `dock.ps1` no diretório global `%APPDATA%\npm`, que já faz parte do PATH padrão do Windows.*

#### Método B: Execução Direta (Sem Instalação Global)
Você pode executar o script diretamente sem registrar no PATH:

```powershell
node "$HOME\dock-local\bin\dock.js" doctor
```

---

## Início Rápido (Fluxo em 30 Segundos)

Navegue até o diretório do projeto que você quer executar:

```bash
cd /caminho/do/seu/projeto

# 1. Analisa dependências e mostra o plano de execução sem alterar nada
dock detect --plan

# 2. Gera a pasta .dock/, cria dados de seed, sobe containers e monitora saúde
dock init -y --up

# 3. Verifica a saúde dos containers e acessa interfaces web de gerenciamento (Kafka UI, Console de Gerenciamento RabbitMQ, Grafana, etc.)
dock status

# 4. Conecta sua aplicação rodando no host ao stack de infraestrutura local
source .dock/app.env
npm start # ou: ./mvnw spring-boot:run, python main.py, dotnet run

# 5. Para o stack de orquestração preservando volumes persistentes
dock down
```

Deseja rodar **a própria aplicação containerizada** junto com os serviços?
```bash
dock init -y --up --app
```

---

## O que é Gerado (Arquitetura `.dock/`)

Ao executar `dock init`, é criada a pasta `.dock/` na raiz do seu projeto:

```text
.dock/
├── docker-compose.yml       # Definição do stack de orquestração (regenerado automaticamente em alterações)
├── .env                     # Mapeamentos de porta, credenciais e configuração de runtime (edições do usuário SÃO PRESERVADAS entre regenerações)
├── app.env                  # Strings de conexão e endpoints de serviços prontos para exportar no runtime da aplicação host
├── dock.json                # Arquivo de estado: serviços ativos, registry de containers e metadados de infraestrutura detectados
└── init/                    # Scripts de seed e hooks de provisionamento de dados (preservados entre regenerações)
    ├── postgres/01-databases.sql         # Schemas de banco detectados em URLs de conexão JDBC
    ├── kafka/create-topics.sh            # Nomes de tópicos extraídos do código da aplicação e properties Spring
    ├── rabbitmq/definitions.json         # Definições de filas e exchanges detectadas no projeto
    ├── ministack/init.sh                 # Provisionamento de recursos AWS: buckets S3, filas SQS, tópicos SNS, tabelas DynamoDB
    ├── keycloak/dock-realm.json          # Realm OIDC pré-configurado com client OAuth2 e usuário de teste dev/dev
    ├── wiremock/mappings/dock-stubs.json # Mapeamentos de stubs HTTP para URLs de serviços externos de saída
    └── prometheus/ grafana/ otel/        # Configuração de scraping de métricas, dashboards pré-construídos e pipelines do OpenTelemetry Collector
```

> 💡 **Recomendação:** Versione a pasta `.dock/` no repositório Git do projeto. Seus colegas de equipe só precisarão rodar `dock up`.

---

## Referência de Comandos

### `dock detect [dir]`
Escaneia a base de código do repositório e relata dependências de infraestrutura detectadas, pontuações de confiança (0.0-1.0), trilhas de evidências e identificadores de recursos extraídos.
- `--plan`: Exibe o plano completo de orquestração Docker Compose que o `init` geraria.
- `--json`: Saída em formato JSON compacto (ideal para automação CI/CD e consumo por agentes de IA).
- `-v, --verbose`: Exibe todos os caminhos de arquivos correspondentes e evidências de padrões regex.
- `--docs`: Também escaneia arquivos de documentação Markdown e README (tratados com peso de confiança menor).
- `--threshold <n>`: Limite mínimo de pontuação de confiança para inclusão automática de serviços (padrão: `0.5`, faixa: 0.0-1.0).

### `dock init [dir]`
Gera a estrutura de diretórios `.dock/` e prepara o ambiente de desenvolvimento local.
- `-y, --yes`: Ignora prompts interativos e aceita automaticamente as seleções de serviços sugeridas.
- `--up`: Inicia imediatamente o stack de orquestração e monitora health checks dos containers.
- `--app [Dockerfile]`: Adiciona a própria imagem de container da aplicação ao stack de orquestração usando o Dockerfile especificado.
- `--app-port <porta>`: Sobrescreve a porta HTTP interna da aplicação (padrão para diretiva `EXPOSE` do Dockerfile ou `8080`).
- `-s, --services <ids>`: Força a inclusão de IDs de serviços separados por vírgula (ex: `-s postgres,kafka`).
- `-x, --exclude <ids>`: Exclui IDs de serviços específicos do stack gerado.
- `--minimal`: Exclui containers de gerenciamento/companheiros como Kafka UI, Kibana ou dashboards Grafana.
- `--force`: Sobrescreve arquivos de seed customizados pelo usuário dentro de `.dock/init/`.
- `--registry <prefixo>`: Prefixo de mirror de registry de containers (padrão para registry público oficial Docker Hub).

### `dock up [services...]`
Inicia os serviços de container e aguarda os health checks passarem (estado pronto).
- `--app`: Também constrói e inicia o serviço da aplicação containerizada (usando profile `app` do Docker Compose).
- `--build`: Força a reconstrução das imagens de container antes de iniciar os serviços.
- `--foreground`: Executa containers anexados em modo foreground em vez de modo daemon desanexado.
- `--pull`: Força o pull de imagens de container atualizadas do registry remoto antes de iniciar.

### `dock down`
Para todos os containers do stack de orquestração em execução de forma graciosa.
- `-v, --volumes`: Remove volumes nomeados persistentes do Docker (reseta bancos de dados e filas de mensagens para estado limpo).

### `dock status`
Imprime o status de saúde operacional dos containers, mapeamentos de porta host-para-container e links clicáveis de UI web de gerenciamento.

### `dock logs [services...]`
Exibe os logs dos containers.
- `-f, --follow`: Acompanha a saída em tempo real.
- `--tail <n>`: Quantidade de linhas para exibir (padrão: `100`).

### `dock env`
Imprime variáveis de ambiente de conexão formatadas para apontar o runtime da sua aplicação para o stack de infraestrutura local.
- `--export`: Adiciona o prefixo `export ` para avaliação direta no shell bash/zsh.

### `dock add <services...>` e `dock remove <services...>`
Modifica dinamicamente o stack de orquestração ativo e regenera de forma limpa o `docker-compose.yml` preservando customizações do usuário nos arquivos `.env` e `init/` de seed:
```bash
dock add redis kibana
dock remove wiremock
dock add app
```

### `dock list`
Lista todos os serviços suportados pelo catálogo.
- `-c, --category <nome>`: Filtra por categoria (`database`, `messaging`, `cache`, `aws`, `security`, `observability`, `integration`).
- `-a, --all`: Inclui itens informativos de runtime e plataforma.

### `dock doctor`
Diagnóstico completo do ambiente local:
1. Instalação e versão do Docker CLI.
2. Comunicação com o Docker Daemon e arquitetura do host.
3. Compatibilidade com Docker Compose v2+.
4. Detecção de conflitos de portas no host.
5. Conectividade com o registry de containers.
6. Validação de compartilhamento de bind mounts.
7. Alertas de emulação de arquitetura em processadores Apple Silicon.

### `dock share`
Gera um snippet de documentação Markdown pronto para copiar e colar formatado para o `README.md` do seu projeto, documentando exatamente como os membros da equipe podem inicializar e interagir com o stack de infraestrutura local.

---

## Catálogo de Serviços Suportados

| Categoria | ID do Serviço | Imagem de Container / Emulação | Provisionamento e Comportamentos Automáticos |
|---|---|---|---|
| **Bancos Relacionais** | `postgres` | PostgreSQL 16 Alpine | Schemas de banco extraídos de URLs de conexão JDBC criados na inicialização do container |
| | `mysql` | MySQL 8.4 (compatível com protocolo de rede MariaDB) | Schemas de banco criados automaticamente de URLs JDBC/conexão detectadas |
| | `oracle` | Oracle Database Free 23c (`gvenzl/oracle-free`) | Usuário de banco da aplicação e tablespace auto-provisionados |
| | `sqlserver` | MS SQL Server 2022 Developer Edition | Executa sob emulação x86_64 (Rosetta 2/QEMU) em hosts Apple Silicon ARM64 |
| | `db2` | IBM Db2 Community Edition | Emulação local de DB2 de mainframe para z/OS |
| **Bancos NoSQL** | `mongodb` | MongoDB 7 | Substituto local para AWS DocumentDB; instâncias de banco pré-criadas de strings de conexão |
| | `cassandra` | Apache Cassandra 4.1 | Keyspaces e tabelas criados via script CQL `.dock/init/cassandra/init.cql` |
| **Cache & Busca** | `redis` | Redis 7 Alpine | Substituto local para AWS ElastiCache Redis e casos de uso Valkey |
| | `hazelcast` | Hazelcast IMDG 5 | Grade de dados distribuída em memória; também serve como substituto local para Red Hat Infinispan |
| | `elasticsearch` | Elasticsearch 8 | Cluster de nó único com segurança desabilitada para desenvolvimento local |
| | `opensearch` | OpenSearch 2.x | Substituto local para AWS OpenSearch Service |
| **Brokers de Mensageria** | `kafka` | Apache Kafka 3.8 (modo KRaft, sem ZooKeeper) | Auto-cria nomes de tópicos detectados; incluído com console de gerenciamento Kafka UI |
| | `rabbitmq` | RabbitMQ 3.13 com Plugin de Gerenciamento | Declarações de filas e exchanges auto-aplicadas na inicialização do container |
| | `ibm-mq` | IBM MQ Advanced for Developers | Queue Manager QM1 pré-configurado com definições de canal de desenvolvedor |
| | `activemq` | Apache ActiveMQ Artemis | Broker de mensagens completo JMS 2.0 / AMQP 1.0 com console web de gerenciamento |
| **Serviços de Nuvem AWS** | `ministack` | Endpoint de API REST compatível com LocalStack | Emulador consolidado de serviços AWS: S3 armazenamento de objetos, SQS/SNS mensageria, DynamoDB NoSQL, Secrets Manager, Systems Manager Parameter Store, Kinesis data streams, EventBridge barramento de eventos, KMS criptografia, CloudWatch logs/métricas |
| **Identidade & Segurança** | `keycloak` | Keycloak (Modo Dev) | Realm OIDC pré-importado, client OAuth2 `app` e credenciais de usuário de teste `dev/dev` |
| | `vault` | HashiCorp Vault (Modo Dev) | Engine de segredos KV v2 habilitado com token root de dev `root` |
| **Observabilidade** | `prometheus` | Prometheus Time-Series Database | Faz scraping do endpoint de métricas da aplicação via `APP_PORT` configurado |
| | `grafana` | Grafana Analytics & Visualization | Dashboards pré-provisionados para métricas Prometheus e traces distribuídos Jaeger |
| | `otel-collector` | OpenTelemetry Collector | Endpoints receptores OTLP: gRPC (porta 4317) e HTTP (porta 4318) para traces, métricas e logs |
| | `jaeger` | Jaeger Distributed Tracing UI | Recebe e visualiza traces distribuídos do OpenTelemetry Collector |
| **Integrações Externas** | `wiremock` | WireMock HTTP Mock Server | Gera mapeamentos de stub HTTP/HTTPS para endpoints de serviços externos (Apigee API Gateway, serviços SOAP de mainframe, APIs REST de parceiros) |

---

## Conectando a Aplicação Host

- **Spring Boot (Java / Kotlin):** Variáveis de ambiente sobrescrevem automaticamente a configuração Spring em `application.yml` / `application.properties`:
  ```bash
  source .dock/app.env
  ./mvnw spring-boot:run
  ```
  *Dica: Desabilite autenticação IAM do AWS MSK ou SSO empresarial no seu perfil Spring local (`SPRING_PROFILES_ACTIVE=local`).*

- **Node.js (TypeScript / JavaScript):** Carregamento nativo de variáveis de ambiente (Node.js 20+):
  ```bash
  node --env-file=.dock/app.env index.js
  # Ou com npm run-script:
  env $(cat .dock/app.env | xargs) npm run dev
  ```
- **Python (FastAPI / Django / Flask):**
  ```bash
  export $(grep -v '^#' .dock/app.env | xargs)
  python main.py
  ```
- **.NET / C#:**
  ```bash
  export $(cat .dock/app.env | xargs)
  dotnet run
  ```

---

## Uso com Agentes de IA (Modo Agent Skill)

O `dock-local` foi projetado para ser nativo para agentes de IA. Inclui uma especificação [`SKILL.md`](SKILL.md) que permite agentes de código autônomos (como Devin CLI, GitHub Copilot Workspace, Windsurf ou Claude Code) usar o `dock` de forma determinística:

1. **Configure o agente de IA:**
   Crie um link simbólico do `dock-local` para o diretório de skills global ou específico do projeto do seu agente:
   ```bash
   ln -s ~/dock-local ~/.config/devin/skills/dock
   ```
2. **Invoque via linguagem natural:**
   > *"Configure a infraestrutura de desenvolvimento local para este repositório usando `/dock`."*
3. O agente executa `dock init -y --up` de forma determinística e relata status de saúde dos containers, mapeamentos de porta e endpoints de UI web de volta ao usuário sem consumir tokens LLM ou gerar alterações alucinadas de infrastructure-as-code.

---

## Desenvolvimento e Testes

```bash
# Instalar dependências
npm install

# Checagem de tipos
npm run typecheck

# Bateria de testes (Vitest com fixtures reais)
npm test

# Compilação
npm run build
```

### Adicionando Novos Serviços de Infraestrutura

Adicionar um novo serviço de infraestrutura ao catálogo é simples e requer **nenhum código TypeScript**:
1. Adicione uma entrada de serviço ao arquivo de categoria correspondente em `catalog/*.yaml`.
2. Defina regras de detecção heurística (`dependencies`, `patterns`, `files`, `env`).
3. Adicione arquivos de template de dados de seed em `templates/<service>/` se necessário.
4. Execute `npm test` para verificar a lógica de detecção e geração.

---

## Licença

Distribuído sob a licença [MIT](LICENSE).
