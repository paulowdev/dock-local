# Catalog Service Recommendations

This document contains recommendations for additional services to add to the dock-local catalog, expanding its capabilities and coverage of modern infrastructure patterns.

## ✅ Recently Implemented

The following services have been successfully added to the catalog:

**v0.2.0 - Infrastructure Services:**

- **Valkey** - Linux Foundation fork of Redis
- **Minio** - S3-compatible object storage
- **NATS** - Lightweight cloud-native messaging
- **Temporal** - Workflow orchestration platform
- **QuestDB** - High-performance time-series database
- **Meilisearch** - Fast typo-tolerant search engine
- **Redpanda** - Kafka-compatible streaming platform

**v0.3.0 - AI/ML Services:**

- **Ollama** - Run LLMs locally (Llama 3, Mistral, Gemma)
- **LiteLLM Proxy** - Unified API for 100+ LLM providers
- **Qdrant** - High-performance vector database
- **ChromaDB** - Lightweight vector store
- **LocalAI** - OpenAI-compatible local inference

---

## Priority 1: High-Demand Services

### AI/ML & LLM Services

#### 1. **vLLM** (High-Performance LLM Inference)

- **Category:** AI/ML
- **Rationale:** Production-grade LLM serving with PagedAttention for high throughput
- **Detection Hints:**
  - Dependencies: `vllm`, `vllm-client`
  - Patterns: `VLLM_`, `vllm.entrypoints`
- **Image:** `vllm/vllm-openai:latest`
- **Benefits:** 24x faster than HuggingFace Transformers, continuous batching, OpenAI-compatible API

#### 2. **Text Generation WebUI** (Oobabooga)

- **Category:** AI/ML
- **Rationale:** Popular web UI for running LLMs with extensions and API
- **Detection Hints:**
  - Patterns: `text-generation-webui`, `oobabooga`
- **Image:** `atinoda/text-generation-webui:default`
- **Benefits:** User-friendly interface, model switching, chat interface, API mode

#### 3. **Weaviate** (AI-Native Vector Database)

- **Category:** AI/ML
- **Rationale:** Vector database with built-in ML models and hybrid search
- **Detection Hints:**
  - Dependencies: `weaviate-client`, `weaviate-python-client`
  - Patterns: `WEAVIATE_`, `weaviate://`
- **Image:** `semitechnologies/weaviate:latest`
- **Benefits:** Built-in vectorization, multi-modal search, GraphQL API

#### 4. **Milvus** (Scalable Vector Database)

- **Category:** AI/ML
- **Rationale:** Cloud-native vector database for billion-scale similarity search
- **Detection Hints:**
  - Dependencies: `pymilvus`, `milvus-client`
  - Patterns: `MILVUS_`, `milvus.connect`
- **Image:** `milvusdb/milvus:latest`
- **Benefits:** Trillion-vector scale, hybrid search, GPU acceleration support

#### 5. **OpenAI API Mock Server**

- **Category:** AI/ML
- **Rationale:** Mock OpenAI API responses for testing without API costs
- **Detection Hints:**
  - Test files using OpenAI SDK
  - Patterns: `OPENAI_API_KEY`, `openai.Completion`
- **Image:** Custom WireMock configuration
- **Benefits:** Cost-free testing, deterministic responses, offline development

### Quantum Computing Services

#### 6. **Qiskit Runtime Simulator**

- **Category:** Quantum
- **Rationale:** IBM's quantum circuit simulator for local development
- **Detection Hints:**
  - Dependencies: `qiskit`, `qiskit-ibm-runtime`
  - Patterns: `from qiskit import`, `QuantumCircuit`
- **Image:** Custom Python image with Qiskit
- **Benefits:** Test quantum algorithms locally before cloud execution

#### 7. **Amazon Braket Local Simulator**

- **Category:** Quantum
- **Rationale:** AWS quantum simulator for local testing
- **Detection Hints:**
  - Dependencies: `amazon-braket-sdk`, `braket`
  - Patterns: `from braket.`, `LocalSimulator`
- **Image:** `amazon-braket-local-simulator:latest`
- **Benefits:** Simulate quantum circuits locally, compatible with AWS Braket

#### 8. **PennyLane Quantum ML**

- **Category:** Quantum
- **Rationale:** Quantum machine learning framework with simulators
- **Detection Hints:**
  - Dependencies: `pennylane`, `pennylane-qiskit`
  - Patterns: `import pennylane`, `qml.device`
- **Image:** Custom Python image with PennyLane
- **Benefits:** Quantum ML, automatic differentiation, multiple backends

### Infrastructure Services

#### 9. **SurrealDB** (Multi-Model Database)

- **Category:** NoSQL
- **Rationale:** Next-gen multi-model database (document, graph, relational)
- **Detection Hints:**
  - Dependencies: `surrealdb`, `surrealdb.js`
  - Patterns: `surreal://`, `.surql` files
- **Image:** `surrealdb/surrealdb:latest`
- **Benefits:** GraphQL-like queries, real-time subscriptions, embedded mode

#### 10. **Dgraph** (Native GraphQL Database)

- **Category:** NoSQL
- **Rationale:** Built-for-GraphQL graph database
- **Detection Hints:**
  - Dependencies: `pydgraph`, `dgraph-js`
  - Files: `*.graphql` schema files
- **Image:** `dgraph/standalone:latest`
- **Benefits:** Native GraphQL support, built-in full-text search, distributed

## Priority 2: Specialized Use Cases

### 11. **Camunda Platform 8** (Process Orchestration)

- **Category:** Platform
- **Rationale:** BPMN-based workflow engine (Zeebe)
- **Detection Hints:**
  - Dependencies: `camunda-cloud`, `zeebe-client`
  - Files: `*.bpmn` files
- **Image:** `camunda/zeebe:latest`
- **Benefits:** Visual workflow modeling, enterprise-grade, cloud-native

### 12. **Apache Pulsar** (Distributed Messaging)

- **Category:** Messaging
- **Rationale:** Multi-tenancy pub/sub alternative to Kafka
- **Detection Hints:**
  - Dependencies: `pulsar-client`, `pulsar-client-python`
  - Patterns: `pulsar://`, `PULSAR_SERVICE_URL`
- **Image:** `apachepulsar/pulsar:latest`
- **Benefits:** Built-in multi-tenancy, geo-replication, tiered storage

### 13. **ClickHouse** (Columnar OLAP Database)

- **Category:** Database
- **Rationale:** Fast analytical queries, popular for data warehousing
- **Detection Hints:**
  - Dependencies: `clickhouse-driver`, `clickhouse-connect`
  - JDBC: `jdbc:clickhouse://`
- **Image:** `clickhouse/clickhouse-server:latest`

### 14. **CockroachDB** (Distributed SQL)

- **Category:** Database
- **Rationale:** Postgres-compatible distributed SQL database
- **Detection Hints:**
  - Dependencies: Same as Postgres but with CockroachDB-specific configs
  - JDBC: `jdbc:postgresql://` with CockroachDB patterns
- **Image:** `cockroachdb/cockroach:latest`

### 15. **Loki** (Log Aggregation)

- **Category:** Observability
- **Rationale:** Lightweight logs aggregation (pairs with Grafana)
- **Detection Hints:**
  - Dependencies: `grafana-loki`, Promtail
  - Patterns: LogQL queries
- **Image:** `grafana/loki:latest`

### 16. **Victoria Metrics** (Prometheus Alternative)

- **Category:** Observability
- **Rationale:** Prometheus-compatible but more performant
- **Detection Hints:**
  - Same as Prometheus patterns
  - Can be drop-in replacement
- **Image:** `victoriametrics/victoria-metrics:latest`

## Implementation Priority Matrix

| Service | Demand | Complexity | Impact | Priority |
|---------|--------|------------|--------|----------|
| vLLM | High | Medium | High | **P1** |
| Weaviate | Medium | Medium | Medium | **P1** |
| Milvus | Medium | Medium | Medium | **P1** |
| Text Gen WebUI | Medium | Low | Medium | **P2** |
| OpenAI Mock | Medium | Low | Medium | **P2** |
| Qiskit | Low | Medium | Medium | **P2** |
| Braket Simulator | Low | Medium | Low | **P2** |
| PennyLane | Low | Medium | Low | **P2** |
| SurrealDB | Medium | Medium | Medium | **P2** |
| Dgraph | Low | Medium | Low | **P2** |
| Camunda | Low | High | Medium | **P2** |
| Pulsar | Low | High | Medium | **P2** |
| ClickHouse | Medium | Medium | Medium | **P3** |
| CockroachDB | Low | Medium | Low | **P3** |
| Loki | Medium | Low | Medium | **P3** |
| Victoria Metrics | Low | Low | Low | **P3** |

## Next Steps for Implementation

1. **Review community feedback** on which P1-P3 services to prioritize
2. **Add catalog entries** in appropriate `catalog/*.yaml` files
3. **Create templates** in `templates/<service>/` for seed scripts
4. **Update tests** with fixture projects that use these services
5. **Document** in README service catalog table
6. **Announce new services** in release notes

## Community Engagement Ideas

- Create GitHub issues for each recommended service
- Allow community voting on which services to prioritize
- Accept PRs from community for catalog additions
- Maintain a "requested services" board

---

*This document should be updated as new infrastructure patterns emerge and user feedback is received.*
