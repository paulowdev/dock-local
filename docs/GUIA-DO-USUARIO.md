# dock-local — Guia do Usuário

`dock` é uma ferramenta de linha de comando que **descobre o que o seu projeto precisa** (bancos de dados relacionais e NoSQL, filas de mensagens, caches distribuídos, serviços de nuvem AWS, provedor de identidade, mocks de APIs externas, plataformas de observabilidade) e **gera um ambiente de orquestração Docker Compose pronto para rodar**, com dados iniciais (seeds), para você executar, testar e validar fluxos localmente — sem depender de ambientes compartilhados DEV/PRE nem de credenciais de nuvem.

---

## 1. Pré-requisitos do Sistema

| Requisito | Versão Mínima | Plataformas | Como Verificar |
|---|---|---|---|
| **Node.js** | `>= 18.18.0` (recomendado 20.x ou 22.x LTS) | macOS, Windows, Linux | `node -v` |
| **npm** | `>= 9.0.0` | macOS, Windows, Linux | `npm -v` |
| **Docker Engine** | `>= 24.0.0` (Docker Desktop, Rancher Desktop, Colima ou Podman - runtime compatível OCI) | macOS, Windows, Linux | `docker --version` |
| **Docker Compose** | `v2.0.0+` (plugin nativo `docker compose`, não o `docker-compose` standalone) | macOS, Windows, Linux | `docker compose version` |

### Notas Específicas por Plataforma

#### macOS (Apple Silicon M1/M2/M3/M4 & Intel)
- **Compartilhamento de Arquivos:** No Docker Desktop ou Rancher Desktop, certifique-se de que a pasta dos seus projetos está compartilhada em `Settings → Resources → File sharing` (ex: `/Users`). Diretórios em `/tmp` normalmente não estão compartilhados por padrão para volumes de bind-mount.
- **Arquitetura ARM64:** A maioria das imagens de container no catálogo já possui builds multi-arquitetura ARM64 nativos. Imagens legadas exclusivas AMD64 (como MS SQL Server, IBM Db2 e IBM MQ) rodam automaticamente sob emulação x86_64 Rosetta 2 / QEMU.

#### Windows 10 / 11 (PowerShell & WSL2)
- **Backend WSL2:** É altamente recomendado habilitar a integração com o WSL2 no Docker Desktop / Rancher Desktop (`Settings → Resources → WSL Integration`) para desempenho ideal.
- **Localização dos Projetos:** Prefira clonar seus repositórios no filesystem do Linux WSL (`\\wsl$\Ubuntu\home\...`) ou em drives com permissões de execução para evitar lentidão no desempenho de I/O de bind-mount em NTFS.
- **Fim de Linha (CRLF vs LF):** Como os containers executam scripts bash de seed (`.dock/init/**/init.sh`), certifique-se de que o Git não converta finais de linha para CRLF (`git config core.autocrlf input`).

---

## 2. Instalação e Configuração Local (Sem Registry)

O `dock` não precisa de publicação em registries públicos do npm. Ele roda diretamente a partir do código clonado.

### No macOS e Linux

#### Método Recomendado: Symlink no Diretório de Usuário (Sem Sudo)
```bash
# 1. Clonar em sua pasta pessoal
git clone <url-do-repositorio> ~/dock-local

# 2. Entrar na pasta e compilar
cd ~/dock-local
npm run build

# 3. Tornar o script executável e linkar em ~/.local/bin
chmod +x bin/dock.js
mkdir -p ~/.local/bin
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock
ln -sf ~/dock-local/bin/dock.js ~/.local/bin/dock-local

# 4. Validar
dock --version
```
*(Certifique-se de ter `~/.local/bin` no seu `$PATH`, adicionando `export PATH="$HOME/.local/bin:$PATH"` ao seu `~/.zshrc` ou `~/.bashrc` se necessário)*.

#### Método Alternativo: npm link
```bash
cd ~/dock-local
npm run link
dock --version
```

---

### No Windows (PowerShell / CMD)

#### Método Global via npm:
Abra o PowerShell ou Prompt de Comando:
```powershell
# 1. Clonar o repositório
git clone <url-do-repositorio> "$HOME\dock-local"
cd "$HOME\dock-local"

# 2. Instalar dependências e compilar
npm install
npm run build

# 3. Registrar o comando globalmente
npm link

# 4. Validar
dock --version
```
*O `npm link` gera automaticamente os executáveis `dock.cmd` e `dock.ps1` no diretório global do seu usuário.*

#### Método Sem Instalação (Execução Direta):
```powershell
node "$HOME\dock-local\bin\dock.js" doctor
```

---

## 3. Uso Rápido (Fluxo Direto)

Dentro da pasta do projeto que você quer testar:

```bash
dock init -y --up
```

Esse comando realiza em sequência:
1. **Detecção:** Identifica dependências de infraestrutura (bancos de dados, brokers de mensageria, serviços de nuvem AWS, etc.).
2. **Geração:** Cria a pasta `.dock/` com arquivo de orquestração `docker-compose.yml`, configuração `.env`, variáveis de conexão `app.env` e scripts de provisionamento de seed.
3. **Inicialização:** Inicia todos os serviços de container e aguarda o health check de cada container passar.
4. **Relatório:** Exibe o status consolidado dos containers e links clicáveis para interfaces web de gerenciamento (UIs).

### Rodando também a própria aplicação no container:
Se o seu projeto possui um `Dockerfile`:
```bash
dock init -y --up --app
```

---

## 4. Passo a Passo Detalhado

### 4.1 Inspecionar o Projeto Antes de Subir (`detect`)
Para visualizar o que o `dock` descobriu sem alterar nenhum arquivo:
```bash
dock detect --plan
```

A saída exibe:
- **Services to run locally:** Serviços de infraestrutura detectados com nível de confiança (0.0 a 1.0) e evidências encontradas no código/manifestos de dependências.
- **Context (nothing to run):** Componentes informativos (ex: banco embarcado H2, cache em memória Caffeine, APM Dynatrace, pipelines CI/CD).
- **Resources extracted:** Identificadores reais de recursos de bancos de dados, tópicos Kafka, filas de mensagens e buckets S3 que serão auto-provisionados.
- **Stack plan:** Portas TCP que serão expostas no host e o papel de infraestrutura de cada serviço de container.

### 4.2 Ajustar a Seleção de Serviços
```bash
# Forçar inclusão de serviços específicos
dock init -y --services postgres,kafka

# Excluir serviços detectados que você não queira rodar
dock init -y --exclude wiremock,prometheus

# Modo mínimo (sem interfaces web ou jobs auxiliares)
dock init -y --minimal

# Consultar o catálogo completo e apelidos suportados
dock list
```

### 4.3 Subir, Parar e Acompanhar
```bash
# Iniciar o stack de infraestrutura
dock up

# Iniciar infraestrutura + aplicação containerizada (reconstruindo a imagem)
dock up --app --build

# Ver o status de saúde dos containers e mapeamentos de porta
dock status

# Fazer streaming de logs de um serviço específico
dock logs kafka -f

# Parar containers preservando dados de volumes persistentes
dock down

# Parar e APAGAR todos os volumes Docker (estado limpo - reseta bancos e filas)
dock down -v
```

### 4.4 Adicionar e Remover Serviços no Ambiente Existente
Você pode modificar dinamicamente a composição do stack de orquestração a qualquer momento sem perder seus mapeamentos de porta customizados ou edições de arquivos de seed:
```bash
dock add redis kibana
dock remove wiremock
dock add app
```

### 4.5 Diagnóstico do Ambiente Local (`doctor`)
```bash
dock doctor
```
Verificação de diagnósticos abrangente:
- Instalação do Docker CLI e daemon, versão da API e conectividade.
- Presença do plugin Docker Compose v2.
- Conflitos de porta TCP no host (ex: porta 5432 já ocupada por outra instância PostgreSQL local).
- Conectividade do registry de containers e acesso de pull de imagens.
- Visibilidade de sistema de arquivos de bind-mount da pasta `.dock/` dentro de volumes de containers.

---

## 5. Estrutura Gerada em `.dock/`

```text
.dock/
├── docker-compose.yml       # Stack de orquestração Docker Compose (auto-regenerado; não altere manualmente)
├── .env                     # Mapeamentos de porta e credenciais (EDITE aqui — suas alterações são preservadas entre regenerações)
├── app.env                  # Variáveis de ambiente de conexão prontas para exportar no runtime da aplicação host
├── dock.json                # Arquivo de estado: serviços selecionados, registry de containers e identificadores de recursos mapeados
└── init/                    # Dados de seed iniciais e schemas de banco (preservados entre regenerações)
    ├── postgres/01-databases.sql         # Schemas de banco extraídos de URLs de conexão JDBC
    ├── kafka/create-topics.sh            # Nomes de tópicos extraídos do código da aplicação e properties Spring
    ├── rabbitmq/definitions.json         # Definições de filas e exchanges configuradas para auto-provisionamento
    ├── ministack/init.sh                 # Provisionamento de recursos AWS: buckets S3, filas SQS, tópicos SNS, tabelas DynamoDB
    ├── keycloak/dock-realm.json          # Realm OIDC pré-configurado com client OAuth2 e usuário de teste dev/dev
    ├── wiremock/mappings/dock-stubs.json # Mapeamentos de stubs HTTP para integrações de serviços externos
    └── prometheus/ grafana/ otel/        # Configuração de scraping de métricas Prometheus e pipelines de traces do OpenTelemetry Collector
```

---

## 6. Como Conectar Sua Aplicação ao Stack

### Executando no Host (Depurador da IDE ou Terminal)

As variáveis de ambiente de conexão necessárias são gravadas em `.dock/app.env`.

- **No Bash / Zsh:**
  ```bash
  source .dock/app.env
  ./mvnw spring-boot:run   # ou: npm start, python main.py, dotnet run
  ```
- **No PowerShell (Windows):**
  ```powershell
  Get-Content .dock/app.env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
  mvn spring-boot:run
  ```
- **No VS Code:**
  Adicione `"envFile": "${workspaceFolder}/.dock/app.env"` na sua configuração de `launch.json`.
- **No IntelliJ IDEA:**
  No menu *Run/Debug Configurations*, adicione o arquivo `.dock/app.env` no campo *EnvFile* ou importe as variáveis.

---

## 7. Tabela de Resolução de Problemas Comuns

| Sintoma | Causa Mais Frequente | O que Fazer |
|---|---|---|
| `port XXXX in use` no `dock doctor` | Outro processo local já está fazendo bind na porta padrão | Edite a variável `*_PORT` correspondente no arquivo `.dock/.env` e execute `dock up` |
| `docker daemon not running` | Daemon do Docker Desktop / Rancher Desktop não está iniciado | Inicie o aplicativo do Docker e aguarde a inicialização completa do daemon |
| Falha ao fazer pull de imagens com 403 / Forbidden | Imagem de container está fora do mirror de registry corporativo (ex: quay.io bloqueado) | Altere para imagem equivalente no Docker Hub ou configure `--registry` |
| Scripts de seed em `.dock/init/` não executam | Problema de permissão de compartilhamento de pasta de bind-mount no Docker | Mantenha o projeto dentro do filesystem `$HOME` e verifique a saída do `dock doctor` |
| Erro de CRLF em scripts bash dentro do container (Windows) | Git auto-converteu arquivos `.sh` de seed para finais de linha CRLF do Windows | Execute `git config core.autocrlf input` e faça re-checkout do repositório |
| Quero resetar completamente o ambiente para estado limpo | Volumes Docker corrompidos ou mudanças maiores em schemas de banco | Execute `dock down -v && rm -rf .dock && dock init -y --up` |

---

## 8. Integração com Agentes de Código de IA

A raiz do projeto contém um arquivo de especificação `SKILL.md`. Quando você usa assistentes de código de IA como Devin, Claude Code, GitHub Copilot Workspace ou Windsurf:
- Basta criar um link simbólico do `dock-local` no diretório de skills do agente (`~/.config/devin/skills/dock`).
- O agente reconhece o comando `/dock` e executa deterministicamente `dock init -y --up`, fornecendo relatórios de status de infraestrutura sem consumir tokens LLM ou tentar gerar manualmente arquivos `docker-compose.yml`.
