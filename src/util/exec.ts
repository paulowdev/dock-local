import { spawn, spawnSync } from "node:child_process";

export function run(cmd: string, args: string[], opts: { cwd?: string; inherit?: boolean } = {}): Promise<number> {
  return new Promise((res) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: opts.inherit === false ? "pipe" : "inherit", shell: process.platform === "win32" });
    child.on("close", (code) => res(code ?? 1));
    child.on("error", () => res(127));
  });
}

export function capture(cmd: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}
