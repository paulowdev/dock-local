# Catalog Service Recommendations

This document contains recommendations for additional services to add to the dock-local catalog, expanding its capabilities and coverage of modern infrastructure patterns.

## ✅ Recently Implemented

The following services have been successfully added to the catalog:

- **Valkey** (v0.2.0) - Linux Foundation fork of Redis
- **Minio** (v0.2.0) - S3-compatible object storage
- **NATS** (v0.2.0) - Lightweight cloud-native messaging
- **Temporal** (v0.2.0) - Workflow orchestration platform
- **QuestDB** (v0.2.0) - High-performance time-series database
- **Meilisearch** (v0.2.0) - Fast typo-tolerant search engine
- **Redpanda** (v0.2.0) - Kafka-compatible streaming platform

---

## Priority 1: High-Demand Services

### 1. **SurrealDB** (Multi-Model Database)
- **Category:** NoSQL
- **Rationale:** Next-gen multi-model database (document, graph, relational)
- **Detection Hints:**
  - Dependencies: `surrealdb`, `surrealdb.js`
  - Patterns: `surreal://`, `.surql` files
- **Image:** `surrealdb/surrealdb:latest`
- **Benefits:** GraphQL-like queries, real-time subscriptions, embedded mode

### 2. **Dgraph** (Native GraphQL Database)
- **Category:** NoSQL
- **Rationale:** Built-for-GraphQL graph database
- **Detection Hints:**
  - Dependencies: `pydgraph`, `dgraph-js`
  - Files: `*.graphql` schema files
- **Image:** `dgraph/standalone:latest`
- **Benefits:** Native GraphQL support, built-in full-text search, distributed

### 3. **Camunda Platform 8** (Process Orchestration)
- **Category:** Platform
- **Rationale:** BPMN-based workflow engine (Zeebe)
- **Detection Hints:**
  - Dependencies: `camunda-cloud`, `zeebe-client`
  - Files: `*.bpmn` files
- **Image:** `camunda/zeebe:latest`
- **Benefits:** Visual workflow modeling, enterprise-grade, cloud-native

### 4. **Apache Pulsar** (Distributed Messaging)
- **Category:** Messaging
- **Rationale:** Multi-tenancy pub/sub alternative to Kafka
- **Detection Hints:**
  - Dependencies: `pulsar-client`, `pulsar-client-python`
  - Patterns: `pulsar://`, `PULSAR_SERVICE_URL`
- **Image:** `apachepulsar/pulsar:latest`
- **Benefits:** Built-in multi-tenancy, geo-replication, tiered storage

## Priority 2: Specialized Use Cases

### 5. **ClickHouse** (Columnar OLAP Database)
- **Category:** Database
- **Rationale:** Fast analytical queries, popular for data warehousing
- **Detection Hints:**
  - Dependencies: `clickhouse-driver`, `clickhouse-connect`
  - JDBC: `jdbc:clickhouse://`
- **Image:** `clickhouse/clickhouse-server:latest`

### 6. **CockroachDB** (Distributed SQL)
- **Category:** Database
- **Rationale:** Postgres-compatible distributed SQL database
- **Detection Hints:**
  - Dependencies: Same as Postgres but with CockroachDB-specific configs
  - JDBC: `jdbc:postgresql://` with CockroachDB patterns
- **Image:** `cockroachdb/cockroach:latest`

### 7. **Loki** (Log Aggregation)
- **Category:** Observability
- **Rationale:** Lightweight logs aggregation (pairs with Grafana)
- **Detection Hints:**
  - Dependencies: `grafana-loki`, Promtail
  - Patterns: LogQL queries
- **Image:** `grafana/loki:latest`

### 8. **Victoria Metrics** (Prometheus Alternative)
- **Category:** Observability
- **Rationale:** Prometheus-compatible but more performant
- **Detection Hints:**
  - Same as Prometheus patterns
  - Can be drop-in replacement
- **Image:** `victoriametrics/victoria-metrics:latest`

## Implementation Priority Matrix

| Service | Demand | Complexity | Impact | Priority |
|---------|--------|------------|--------|----------|
| SurrealDB | Medium | Medium | Medium | **P1** |
| Dgraph | Low | Medium | Low | **P2** |
| Camunda | Low | High | Medium | **P2** |
| Pulsar | Low | High | Medium | **P2** |
| ClickHouse | Medium | Medium | Medium | **P2** |
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
