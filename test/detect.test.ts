import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog/loader.js";
import { detect } from "../src/detect/index.js";
import { buildPlan } from "../src/generate/plan.js";

const fixtures = join(import.meta.dirname, "fixtures");
const byId = (ds: { id: string }[]) => new Set(ds.map((d) => d.id));

describe("catalog", () => {
  it("loads and cross-references cleanly", () => {
    const c = loadCatalog();
    expect(c.entries.length).toBeGreaterThan(40);
    expect(c.resolve("msk")?.id).toBe("kafka");
    expect(c.resolve("elasticache")?.id).toBe("redis");
    for (const e of c.entries) if (e.kind === "service") expect(e.compose?.image, e.id).toBeTruthy();
  });
});

describe("spring fixture", () => {
  it("detects services with evidence and extracts resources", async () => {
    const r = await detect(join(fixtures, "spring-app"));
    const ids = byId(r.detections);
    for (const id of ["postgres", "kafka", "schema-registry", "s3", "secretsmanager", "keycloak", "prometheus", "spring-boot", "h2", "caffeine", "apigee", "external-http", "rds", "docker", "gluon", "dynatrace"])
      expect(ids.has(id), id).toBe(true);
    const d = Object.fromEntries(r.detections.map((x) => [x.id, x]));
    expect(d.postgres!.level).toBe("high");
    expect(d.postgres!.evidence.some((e) => e.type === "dependency" && e.value === "org.postgresql:postgresql")).toBe(true);
    expect(d.postgres!.resources.databases).toEqual(["cards_limits"]);
    expect(d.kafka!.resources.topics).toEqual(expect.arrayContaining(["cards.limit.updated", "cards.limit.requested", "cards.limit.audit"]));
    expect(d.s3!.resources.buckets).toEqual(["cards-limits-documents"]);
    expect(d.secretsmanager!.resources.secrets).toEqual(["prod/cards/limits/db"]);
    expect(d.keycloak!.resources.realms).toEqual(["cards"]);
    expect(d.apigee!.resources.hosts).toEqual(["api.example.com"]);
    expect(d["external-http"]!.resources.hosts).toEqual(expect.arrayContaining(["api.example.com", "auth.example.com"]));
    expect(ids.has("mongodb")).toBe(false);
    expect(ids.has("rabbitmq")).toBe(false);
  });

  it("plans providers, companions and requirements", async () => {
    const r = await detect(join(fixtures, "spring-app"));
    const plan = buildPlan(r.detections, loadCatalog());
    const runnable = plan.runnable.map((e) => e.id);
    expect(runnable).toEqual(expect.arrayContaining(["postgres", "kafka", "kafka-ui", "kafka-init", "schema-registry", "ministack", "keycloak", "prometheus", "grafana", "wiremock"]));
    expect(runnable.indexOf("kafka")).toBeLessThan(runnable.indexOf("schema-registry"));
    expect(plan.consumers.get("ministack")?.map((e) => e.id)).toEqual(expect.arrayContaining(["s3", "secretsmanager"]));
    expect(plan.consumers.get("wiremock")?.map((e) => e.id)).toEqual(expect.arrayContaining(["apigee", "external-http"]));
    expect(plan.reportOnly.map((e) => e.id)).toEqual(expect.arrayContaining(["h2", "caffeine", "spring-boot"]));
    expect(runnable).not.toContain("mongodb");
  });

  it("honours minimal / exclude / include", async () => {
    const r = await detect(join(fixtures, "spring-app"));
    const plan = buildPlan(r.detections, loadCatalog(), { minimal: true, exclude: ["wiremock", "prometheus"], include: ["redis"] });
    const runnable = plan.runnable.map((e) => e.id);
    expect(runnable).not.toContain("kafka-ui");
    expect(runnable).not.toContain("wiremock");
    expect(runnable).not.toContain("grafana");
    expect(runnable).toContain("redis");
  });
});

describe("node fixture", () => {
  it("detects npm dependencies and env-based resources", async () => {
    const r = await detect(join(fixtures, "node-app"));
    const d = Object.fromEntries(r.detections.map((x) => [x.id, x]));
    for (const id of ["mongodb", "redis", "rabbitmq", "sqs", "dynamodb", "nodejs"]) expect(d[id], id).toBeTruthy();
    expect(d.mongodb!.resources.databases).toEqual(["notifications"]);
    expect(d.rabbitmq!.resources.rabbit_queues).toEqual(expect.arrayContaining(["notifications-outbound"]));
    expect(d.sqs!.resources.sqs_queues).toEqual(expect.arrayContaining(["notifications-outbound"]));
    expect(d.dynamodb!.resources.tables).toEqual(["notification-templates"]);
    expect(d.postgres).toBeUndefined();
    expect(d.kafka).toBeUndefined();
  });
});
