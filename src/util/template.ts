/**
 * Tiny mustache-like renderer: {{a.b}}, {{#each list}}{{this}}{{/each}},
 * {{#if x}}...{{else}}...{{/if}}. Blocks nest; triple braces ({{{x}}}) are
 * left untouched so downstream templating (e.g. WireMock) survives.
 */
export type Ctx = Record<string, unknown>;

const get = (ctx: Ctx, path: string): unknown =>
  path === "this" ? ctx["this"] : path.split(".").reduce<unknown>((o, k) => (o as Ctx | undefined)?.[k], ctx);

const truthy = (v: unknown): boolean => (Array.isArray(v) ? v.length > 0 : Boolean(v));
const isObj = (v: unknown): v is Ctx => typeof v === "object" && v !== null && !Array.isArray(v);

const OPEN = /{{#(each|if) ([\w.]+)}}/g;

export function render(tpl: string, ctx: Ctx): string {
  let out = "";
  let pos = 0;
  OPEN.lastIndex = 0;
  for (let m = OPEN.exec(tpl); m; m = OPEN.exec(tpl)) {
    const [tag, type, path] = m as unknown as [string, "each" | "if", string];
    const bodyStart = m.index + tag.length;
    const { end, elseAt } = findClose(tpl, bodyStart, type);
    out += vars(tpl.slice(pos, m.index), ctx);
    const body = tpl.slice(bodyStart, end);
    if (type === "each") {
      const val = get(ctx, path);
      if (Array.isArray(val)) {
        out += val.map((item, i) => render(body, { ...ctx, ...(isObj(item) ? item : {}), this: item, index: i })).join("");
      }
    } else {
      const yes = elseAt >= 0 ? tpl.slice(bodyStart, elseAt) : body;
      const no = elseAt >= 0 ? tpl.slice(elseAt + "{{else}}".length, end) : "";
      out += render(truthy(get(ctx, path)) ? yes : no, ctx);
    }
    pos = end + `{{/${type}}}`.length;
    OPEN.lastIndex = pos;
  }
  return out + vars(tpl.slice(pos), ctx);
}

/** Index of the matching close tag and of a depth-0 {{else}} (or -1). */
function findClose(tpl: string, from: number, type: string): { end: number; elseAt: number } {
  const re = new RegExp(`{{#${type} [\\w.]+}}|{{/${type}}}|{{else}}`, "g");
  re.lastIndex = from;
  let depth = 0;
  let elseAt = -1;
  for (let m = re.exec(tpl); m; m = re.exec(tpl)) {
    if (m[0] === "{{else}}") { if (depth === 0 && elseAt < 0) elseAt = m.index; }
    else if (m[0].startsWith("{{#")) depth++;
    else if (depth === 0) return { end: m.index, elseAt };
    else depth--;
  }
  throw new Error(`template: unclosed {{#${type}}} block`);
}

const vars = (s: string, ctx: Ctx): string =>
  s.replace(/(?<!{){{([\w.]+)}}(?!})/g, (_, p: string) => {
    const v = get(ctx, p);
    return v === undefined || v === null ? "" : String(v);
  });
