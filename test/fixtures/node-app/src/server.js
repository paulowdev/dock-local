// Minimal server used by the --app end-to-end check: echoes the stack addresses it received.
import { createServer } from "node:http";
import { connect } from "node:net";

const port = Number(process.env.PORT ?? 3000);
const targets = { mongo: process.env.MONGODB_URI, redis: process.env.REDIS_URL, amqp: process.env.AMQP_URL, aws: process.env.AWS_ENDPOINT_URL };

const probe = (url) => new Promise((res) => {
  const { hostname, port: p } = new URL(url);
  const s = connect({ host: hostname, port: Number(p) }, () => { s.end(); res("reachable"); });
  s.on("error", (e) => res(`error: ${e.code}`));
  s.setTimeout(2000, () => { s.destroy(); res("timeout"); });
});

createServer(async (_req, res) => {
  const checks = {};
  for (const [k, v] of Object.entries(targets)) checks[k] = v ? { url: v, status: await probe(v) } : "unset";
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(checks, null, 2));
}).listen(port, () => console.log(`fixture app on ${port}`));
