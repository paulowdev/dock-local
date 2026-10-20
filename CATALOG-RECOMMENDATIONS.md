# Catalog Service Recommendations

This document contains recommendations for additional services to add to the dock-local catalog, expanding its capabilities and coverage of modern infrastructure patterns.

## Priority 1: High-Demand Services

### 1. **Valkey** (Redis Alternative)
- **Category:** Cache & Search
- **Rationale:** Valkey is the Linux Foundation fork of Redis, providing a truly open-source alternative
- **Detection Hints:**
  - Dependencies: `valkey`, `valkey-client`
  - Environment variables: `VALKEY_URL`, `VALKEY_HOST`
- **Image:** `valkey/valkey:latest`
- **Benefits:** Community-driven, compatible with Redis clients, no licensing concerns

### 2. **Minio** (S3-Compatible Object Storage)
- **Category:** AWS / Storage
- **Rationale:** Standalone S3-compatible storage, lighter than full LocalStack for S3-only use cases
- **Detection Hints:**
  - Dependencies: `minio`, `@aws-sdk/client-s3`
  - Environment: `S3_ENDPOINT`, `MINIO_ENDPOINT`
- **Image:** `minio/minio:latest`
- **Benefits:** Faster startup than LocalStack, dedicated S3 UI, production-grade features

### 3. **NATS** (Lightweight Messaging)
- **Category:** Messaging
- **Rationale:** Cloud-native messaging system, alternative to Kafka for simpler use cases
- **Detection Hints:**
  - Dependencies: `nats`, `nats.js`, `asyncio-nats`
  - Patterns: `nats://`, `NATS_URL`
- **Image:** `nats:latest`
- **Benefits:** Extremely lightweight, built-in JetStream for persistence, Kubernetes-friendly

### 4. **Temporal** (Workflow Orchestration)
- **Category:** Platform
- **Rationale:** Increasingly popular for durable execution and workflow orchestration
- **Detection Hints:**
  - Dependencies: `@temporalio/client`, `temporalio`
  - Patterns: `temporal.NewClient`, `temporal_client`
- **Image:** `temporalio/auto-setup:latest`
- **Benefits:** Built-in UI, handles long-running workflows, fault-tolerant

### 5. **QuestDB** (Time-Series Database)
- **Category:** Database
- **Rationale:** High-performance time-series DB with SQL compatibility
- **Detection Hints:**
  - Dependencies: `questdb`, `psycopg2` (with QuestDB patterns)
  - Patterns: InfluxDB Line Protocol, Postgres wire protocol
- **Image:** `questdb/questdb:latest`
- **Benefits:** Faster than InfluxDB, SQL interface, excellent for metrics/IoT

## Priority 2: Modern Alternatives

### 6. **SurrealDB** (Multi-Model Database)
- **Category:** NoSQL
- **Rationale:** Next-gen multi-model database (document, graph, relational)
- **Detection Hints:**
  - Dependencies: `surrealdb`, `surrealdb.js`
  - Patterns: `surreal://`, `.surql` files
- **Image:** `surrealdb/surrealdb:latest`
- **Benefits:** GraphQL-like queries, real-time subscriptions, embedded mode

### 7. **Meilisearch** (Search Engine)
- **Category:** Cache & Search
- **Rationale:** Fast, typo-tolerant search alternative to Elasticsearch
- **Detection Hints:**
  - Dependencies: `meilisearch`, `meilisearch-php`, `meilisearch-js`
  - Environment: `MEILI_MASTER_KEY`, `MEILI_URL`
- **Image:** `getmeili/meilisearch:latest`
- **Benefits:** Zero-config, instant search, smaller footprint than Elasticsearch

### 8. **Dgraph** (Native GraphQL Database)
- **Category:** NoSQL
- **Rationale:** Built-for-GraphQL graph database
- **Detection Hints:**
  - Dependencies: `pydgraph`, `dgraph-js`
  - Files: `*.graphql` schema files
- **Image:** `dgraph/standalone:latest`
- **Benefits:** Native GraphQL support, built-in full-text search, distributed

### 9. **Camunda Platform 8** (Process Orchestration)
- **Category:** Platform
- **Rationale:** BPMN-based workflow engine (Zeebe)
- **Detection Hints:**
  - Dependencies: `camunda-cloud`, `zeebe-client`
  - Files: `*.bpmn` files
- **Image:** `camunda/zeebe:latest`
- **Benefits:** Visual workflow modeling, enterprise-grade, cloud-native

### 10. **Apache Pulsar** (Distributed Messaging)
- **Category:** Messaging
- **Rationale:** Multi-tenancy pub/sub alternative to Kafka
- **Detection Hints:**
  - Dependencies: `pulsar-client`, `pulsar-client-python`
  - Patterns: `pulsar://`, `PULSAR_SERVICE_URL`
- **Image:** `apachepulsar/pulsar:latest`
- **Benefits:** Built-in multi-tenancy, geo-replication, tiered storage

## Priority 3: Specialized Use Cases

### 11. **ClickHouse** (Columnar OLAP Database)
- **Category:** Database
- **Rationale:** Fast analytical queries, popular for data warehousing
- **Detection Hints:**
  - Dependencies: `clickhouse-driver`, `clickhouse-connect`
  - JDBC: `jdbc:clickhouse://`
- **Image:** `clickhouse/clickhouse-server:latest`

### 12. **CockroachDB** (Distributed SQL)
- **Category:** Database
- **Rationale:** Postgres-compatible distributed SQL database
- **Detection Hints:**
  - Dependencies: Same as Postgres but with CockroachDB-specific configs
  - JDBC: `jdbc:postgresql://` with CockroachDB patterns
- **Image:** `cockroachdb/cockroach:latest`

### 13. **Redpanda** (Kafka Alternative)
- **Category:** Messaging
- **Rationale:** Kafka-compatible but simpler, no JVM/Zookeeper
- **Detection Hints:**
  - Same as Kafka but can be explicit alternative
  - Environment: `REDPANDA_BROKERS`
- **Image:** `redpandadata/redpanda:latest`
- **Benefits:** 10x faster setup, lower resource usage, Kafka API compatible

### 14. **Loki** (Log Aggregation)
- **Category:** Observability
- **Rationale:** Lightweight logs aggregation (pairs with Grafana)
- **Detection Hints:**
  - Dependencies: `grafana-loki`, Promtail
  - Patterns: LogQL queries
- **Image:** `grafana/loki:latest`

### 15. **Victoria Metrics** (Prometheus Alternative)
- **Category:** Observability
- **Rationale:** Prometheus-compatible but more performant
- **Detection Hints:**
  - Same as Prometheus patterns
  - Can be drop-in replacement
- **Image:** `victoriametrics/victoria-metrics:latest`

## Implementation Priority Matrix

| Service | Demand | Complexity | Impact | Priority |
|---------|--------|------------|--------|----------|
| Valkey | High | Low | High | **P0** |
| Minio | High | Low | High | **P0** |
| NATS | Medium | Low | Medium | **P1** |
| Temporal | High | Medium | High | **P1** |
| QuestDB | Medium | Low | Medium | **P1** |
| Meilisearch | Medium | Low | Medium | **P1** |
| Redpanda | Medium | Low | High | **P1** |
| SurrealDB | Low | Medium | Medium | **P2** |
| Dgraph | Low | Medium | Low | **P2** |
| Camunda | Low | High | Medium | **P2** |
| Pulsar | Low | High | Medium | **P2** |
| ClickHouse | Medium | Medium | Medium | **P2** |
| CockroachDB | Low | Medium | Low | **P3** |
| Loki | Medium | Low | Medium | **P3** |
| Victoria Metrics | Low | Low | Low | **P3** |

## Next Steps for Implementation

1. **Start with P0 services** (Valkey, Minio) - Easy wins with high demand
2. **Add catalog entries** in appropriate `catalog/*.yaml` files
3. **Create templates** in `templates/<service>/` for seed scripts
4. **Update tests** with fixture projects that use these services
5. **Document** in README service catalog table

## Community Engagement Ideas

- Create GitHub issues for each recommended service
- Allow community voting on which services to prioritize
- Accept PRs from community for catalog additions
- Maintain a "requested services" board

---

*This document should be updated as new infrastructure patterns emerge and user feedback is received.*
