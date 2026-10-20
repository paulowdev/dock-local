import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog/loader.js";
import { detect } from "../src/detect/index.js";
import { buildCompose, internalAppEnv, qualifyImage } from "../src/generate/compose.js";
import { buildPlan } from "../src/generate/plan.js";
import { DEFAULT_REGISTRY, type DockState } from "../src/generate/state.js";
import { writeStack } from "../src/generate/writer.js";
import { render } from "../src/util/template.js";

const fixtures = join(import.meta.dirname, "fixtures");
const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) rmSync(d, { recursive: true, force: true }); });

const state = (project: string, overrides: Partial<DockState> = {}): DockState => ({
  version: 1, project, registry: DEFAULT_REGISTRY, services: [], exclude: [], minimal: false, resources: {}, updatedAt: "", ...overrides,
});

describe("template renderer", () => {
  it("supports vars, each, nested if/else and leaves triple braces alone", () => {
    const tpl = "{{#if a}}{{#each xs}}[{{this}}:{{index}}]{{/each}}{{#if none}}no{{else}}yes{{/if}}{{else}}skip{{/if}} {{{request.path}}} {{env.K}}";
    expect(render(tpl, { a: true, xs: ["p", "q"], env: { K: "v" } })).toBe("[p:0][q:1]yes {{{request.path}}} v");
    expect(render(tpl, { a: false, env: {} })).toBe("skip {{{request.path}}} ");
  });
});

describe("compose generation", () => {
  it("prefixes only Docker Hub images", () => {
    expect(qualifyImage("postgres:16-alpine", DEFAULT_REGISTRY)).toBe(`${DEFAULT_REGISTRY}/postgres:16-alpine`);
    expect(qualifyImage("ministackorg/ministack:1.4.14", DEFAULT_REGISTRY)).toBe(`${DEFAULT_REGISTRY}/ministackorg/ministack:1.4.14`);
    expect(qualifyImage("mcr.microsoft.com/mssql/server:2022-latest", DEFAULT_REGISTRY)).toBe("mcr.microsoft.com/mssql/server:2022-latest");
    expect(qualifyImage("postgres:16", "")).toBe("postgres:16");
  });

  it("wires providers, volumes and depends_on", async () => {
    const catalog = loadCatalog();
    const r = await detect(join(fixtures, "spring-app"));
    const doc = buildCompose(buildPlan(r.detections, catalog), "cards", DEFAULT_REGISTRY);
    expect(doc.name).toBe("cards-dock");
    expect(doc.services.ministack!.environment!.SERVICES!.split(",").sort()).toEqual(["s3", "secretsmanager"]);
    expect(doc.services.ministack!.image).toBe(`${DEFAULT_REGISTRY}/ministackorg/ministack:1.4.14`);
    expect(doc.volumes).toHaveProperty("postgres-data");
    expect(doc.volumes).not.toHaveProperty("./init/postgres");
    expect(doc.services["schema-registry"]!.depends_on).toEqual({ kafka: { condition: "service_healthy" } });
    for (const s of Object.values(doc.services)) expect(s.networks).toEqual(["dock"]);
  });
});

describe("writeStack", () => {
  it("writes compose, env, seeds and app.env with resources rendered", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dock-")); tmp.push(dir);
    const catalog = loadCatalog();
    const r = await detect(join(fixtures, "spring-app"));
    const plan = buildPlan(r.detections, catalog);
    const w = writeStack(dir, plan, state("cards", { services: plan.selected.map((e) => e.id), resources: plan.resources }));
    const dock = join(dir, ".dock");
    for (const f of ["docker-compose.yml", ".env", "app.env", "dock.json", "init/postgres/01-databases.sql", "init/kafka/create-topics.sh", "init/ministack/init.sh", "init/keycloak/dock-realm.json", "init/wiremock/mappings/dock-stubs.json"])
      expect(existsSync(join(dock, f)), f).toBe(true);
    expect(w.files).toContain("docker-compose.yml");

    const compose = parse(readFileSync(join(dock, "docker-compose.yml"), "utf8"));
    expect(Object.keys(compose.services)).toEqual(expect.arrayContaining(["postgres", "kafka", "ministack", "keycloak", "wiremock"]));

    expect(readFileSync(join(dock, "init/postgres/01-databases.sql"), "utf8")).toContain('CREATE DATABASE "cards_limits"');
    const topics = readFileSync(join(dock, "init/kafka/create-topics.sh"), "utf8");
    expect(topics).toContain('"cards.limit.updated"');
    expect(topics).toContain('"cards.limit.audit"');
    const aws = readFileSync(join(dock, "init/ministack/init.sh"), "utf8");
    expect(aws).toContain("create-bucket --bucket \"cards-limits-documents\"");
    expect(aws).toContain("create-secret --name \"prod/cards/limits/db\"");
    expect(aws).not.toContain("sqs create-queue");
    const stubs = JSON.parse(readFileSync(join(dock, "init/wiremock/mappings/dock-stubs.json"), "utf8"));
    expect(stubs.mappings.some((m: { name: string }) => m.name === "stub for api.example.com")).toBe(true);
    expect(JSON.stringify(stubs)).toContain("{{{request.path}}}");
    JSON.parse(readFileSync(join(dock, "init/keycloak/dock-realm.json"), "utf8"));

    expect(w.appEnv.SPRING_DATASOURCE_URL).toBe("jdbc:postgresql://localhost:5432/app");
    expect(w.appEnv.AWS_ENDPOINT_URL).toBe("http://localhost:4566");
    expect(w.appEnv.SPRING_KAFKA_BOOTSTRAP_SERVERS).toBe("localhost:9092");
  });

  it("adds the project's app behind a profile with in-network addresses", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dock-")); tmp.push(dir);
    const catalog = loadCatalog();
    const r = await detect(join(fixtures, "node-app"));
    const plan = buildPlan(r.detections, catalog);
    writeStack(dir, plan, state("notif", { services: plan.selected.map((e) => e.id), resources: plan.resources, app: { dockerfile: "Dockerfile", port: "3000" } }));
    const compose = parse(readFileSync(join(dir, ".dock", "docker-compose.yml"), "utf8"));
    const app = compose.services.app;
    expect(app.profiles).toEqual(["app"]);
    expect(app.build).toEqual({ context: "..", dockerfile: "Dockerfile", args: { DOCK_REGISTRY: DEFAULT_REGISTRY } });
    expect(app.ports).toEqual(["${APP_PORT}:3000"]);
    expect(app.environment.MONGODB_URI).toContain("@mongodb:27017/");
    expect(app.environment.REDIS_URL).toBe("redis://redis:6379");
    expect(app.environment.AWS_ENDPOINT_URL).toBe("http://ministack:4566");
    expect(app.environment.PORT).toBe("3000");
    expect(app.depends_on.mongodb).toEqual({ condition: "service_healthy" });
    expect(readFileSync(join(dir, ".dock", ".env"), "utf8")).toContain("APP_PORT=3000");
    // host view stays on localhost
    expect(readFileSync(join(dir, ".dock", "app.env"), "utf8")).toContain("redis://localhost:6379");
  });

  it("uses catalog appEnvInternal overrides (kafka internal listener)", async () => {
    const catalog = loadCatalog();
    const r = await detect(join(fixtures, "spring-app"));
    const plan = buildPlan(r.detections, catalog);
    const env = { KAFKA_PORT: "9092", POSTGRES_PORT: "5432", POSTGRES_DB: "app" };
    const internal = internalAppEnv(plan, env, { SPRING_KAFKA_BOOTSTRAP_SERVERS: "localhost:9092", SPRING_DATASOURCE_URL: "jdbc:postgresql://localhost:5432/app" });
    expect(internal.SPRING_KAFKA_BOOTSTRAP_SERVERS).toBe("kafka:29092");
    expect(internal.SPRING_DATASOURCE_URL).toBe("jdbc:postgresql://postgres:5432/app");
  });

  it("keeps user .env edits and customised seeds on regeneration", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dock-")); tmp.push(dir);
    const catalog = loadCatalog();
    const r = await detect(join(fixtures, "node-app"));
    const plan = buildPlan(r.detections, catalog);
    const st = state("notif", { services: plan.selected.map((e) => e.id), resources: plan.resources });
    writeStack(dir, plan, st);
    const env = join(dir, ".dock", ".env");
    writeFileSync(env, readFileSync(env, "utf8").replace("MONGO_PORT=27017", "MONGO_PORT=27018"));
    const seed = join(dir, ".dock", "init/mongodb/01-databases.js");
    writeFileSync(seed, "// custom\n");
    const w = writeStack(dir, plan, st);
    expect(readFileSync(env, "utf8")).toContain("MONGO_PORT=27018");
    expect(readFileSync(seed, "utf8")).toBe("// custom\n");
    expect(w.appEnv.MONGODB_URI).toContain("localhost:27018/");
    writeStack(dir, plan, st, { force: true });
    expect(readFileSync(seed, "utf8")).toContain("notifications");
  });
});
