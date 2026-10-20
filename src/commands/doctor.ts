import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import pc from "picocolors";
import { parse } from "yaml";
import { readState } from "../generate/state.js";
import { parseEnv } from "../generate/writer.js";
import { capture } from "../util/exec.js";
import { log } from "../util/log.js";
import { dockDir } from "../util/paths.js";
import { context } from "./context.js";

export async function doctorCommand(): Promise<void> {
  const ctx = context();
  let failures = 0;
  const check = (ok: boolean, label: string, hint?: string) => {
    log.info(`${ok ? pc.green("✔") : pc.red("✖")} ${label}${!ok && hint ? pc.dim(`  → ${hint}`) : ""}`);
    if (!ok) failures++;
  };

  const docker = capture("docker", ["--version"]);
  check(docker.ok, `docker cli ${pc.dim(docker.out.split("\n")[0] ?? "")}`, "install Docker Desktop / Rancher Desktop / colima");
  const daemon = capture("docker", ["info", "--format", "{{.ServerVersion}} {{.OSType}}/{{.Architecture}}"]);
  check(daemon.ok, `docker daemon ${pc.dim(daemon.ok ? daemon.out : "")}`, "start Docker");
  const comp = capture("docker", ["compose", "version", "--short"]);
  check(comp.ok && Number(comp.out.split(".")[0]?.replace(/^v/, "")) >= 2, `docker compose v2 ${pc.dim(comp.out)}`, "Compose v2 is required");

  const state = readState(ctx.projectDir);
  const dir = dockDir(ctx.projectDir);
  if (!state || !existsSync(join(dir, "docker-compose.yml"))) {
    log.info(pc.dim("no .dock/ stack yet — run `dock init`"));
  } else {
    const env = parseEnv(readFileSync(join(dir, ".env"), "utf8"));
    const doc = parse(readFileSync(join(dir, "docker-compose.yml"), "utf8")) as { services: Record<string, { ports?: string[]; image: string }> };
    const running = capture("docker", ["compose", "-f", join(dir, "docker-compose.yml"), "--env-file", join(dir, ".env"), "ps", "-q"], dir);
    const isUp = running.ok && running.out.trim().length > 0;
    for (const [name, svc] of Object.entries(doc.services)) {
      for (const p of svc.ports ?? []) {
        const host = Number(p.split(":")[0]!.replace(/\$\{(\w+)\}/, (_, k) => env[k] ?? ""));
        if (!host) continue;
        const free = await portFree(host);
        check(free || isUp, `port ${host} for ${name}${!free && isUp ? pc.dim(" (in use by the stack)") : ""}`, `change ${portVar(p)} in .dock/.env`);
      }
    }
    const alpine = state.registry ? `${state.registry}/alpine:3.20` : "alpine:3.20";
    if (state.registry) {
      const probe = capture("docker", ["manifest", "inspect", alpine]);
      check(probe.ok, `registry ${state.registry} reachable`, "docker login, or `dock init --registry \"\"` for Docker Hub");
    }
    if (daemon.ok) {
      const mount = capture("docker", ["run", "--rm", "-v", `${dir}:/probe:ro`, alpine, "test", "-f", "/probe/dock.json"]);
      check(mount.ok, "bind mounts from .dock/ visible inside containers", "share this path with Docker (Settings → Resources → File sharing); /tmp is often not shared");
    }
    const amd64 = Object.entries(doc.services).filter(([, s]) => (s as { platform?: string }).platform === "linux/amd64").map(([n]) => n);
    if (amd64.length && /arm64|aarch64/.test(daemon.out)) log.warn(`${amd64.join(", ")} run under amd64 emulation on this host (slower; enable Rosetta/QEMU in Docker settings)`);
  }
  log.info(failures ? pc.red(`\n${failures} problem(s) found`) : pc.green("\nall good"));
  if (failures) process.exitCode = 1;
}

function portFree(port: number): Promise<boolean> {
  return new Promise((res) => {
    const srv = createServer();
    srv.once("error", () => res(false));
    srv.once("listening", () => srv.close(() => res(true)));
    srv.listen(port, "127.0.0.1");
  });
}

const portVar = (p: string) => /\$\{(\w+)\}/.exec(p)?.[1] ?? "the port";
