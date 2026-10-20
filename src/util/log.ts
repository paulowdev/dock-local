import pc from "picocolors";

let quiet = false;
export const setQuiet = (q: boolean): void => { quiet = q; };

export const log = {
  info: (msg: string): void => { if (!quiet) console.log(msg); },
  step: (msg: string): void => { if (!quiet) console.log(pc.cyan("›"), msg); },
  ok: (msg: string): void => { if (!quiet) console.log(pc.green("✔"), msg); },
  warn: (msg: string): void => console.warn(pc.yellow("!"), msg),
  error: (msg: string): void => console.error(pc.red("✖"), msg),
  dim: (msg: string): string => pc.dim(msg),
  bold: (msg: string): string => pc.bold(msg),
};

export function table(rows: string[][], header?: string[]): string {
  const all = header ? [header, ...rows] : rows;
  const widths = all[0]!.map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  const fmt = (r: string[]) => r.map((c, i) => (c ?? "").padEnd(widths[i]!)).join("  ").trimEnd();
  const lines = all.map(fmt);
  if (header) lines.splice(1, 0, widths.map((w) => "-".repeat(w)).join("  "));
  return lines.join("\n");
}
