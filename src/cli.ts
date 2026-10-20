import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { detectCommand } from "./commands/detect.js";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { addCommand, listCommand, removeCommand } from "./commands/manage.js";
import { shareCommand } from "./commands/share.js";
import { downCommand, envCommand, logsCommand, statusCommand, upCommand } from "./commands/stack.js";
import { log, setQuiet } from "./util/log.js";
import { packageRoot } from "./util/paths.js";

export async function main(argv: string[]): Promise<void> {
  const pkg = JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as { version: string };
  const program = new Command("dock")
    .description("Detect what a project needs and run it locally with Docker Compose (databases, brokers, AWS via ministack, stubs via WireMock).")
    .version(pkg.version)
    .option("-q, --quiet", "only errors and requested output")
    .hook("preAction", (cmd) => setQuiet(Boolean(cmd.opts().quiet)))
    .showHelpAfterError();

  program.command("detect [dir]")
    .description("scan the project and report detected services, evidence and extracted resources")
    .option("--json", "machine-readable output (compact, agent friendly)")
    .option("--plan", "also show the stack that `init` would generate")
    .option("-v, --verbose", "show all evidence")
    .option("--docs", "also scan README/markdown (weak evidence)")
    .option("--threshold <n>", "min confidence for auto-selection (default 0.5)")
    .action(detectCommand);

  program.command("init [dir]")
    .description("detect + generate .dock/ (docker-compose.yml, .env, seeds, app.env)")
    .option("-y, --yes", "skip confirmation")
    .option("-s, --services <ids>", "comma-separated services to force-include (see `dock list`)")
    .option("-x, --exclude <ids>", "comma-separated services to drop")
    .option("--registry <prefix>", "Docker Hub mirror prefix (\"\" or omit for official Docker Hub)")
    .option("--minimal", "skip optional companions (UIs, seed jobs)")
    .option("--threshold <n>", "min confidence for auto-selection (default 0.5)")
    .option("--force", "overwrite customised seed files")
    .option("--app [dockerfile]", "also run the project's own image (built from its Dockerfile) inside the stack")
    .option("--app-port <port>", "container port the app listens on (default: EXPOSE in Dockerfile, else 8080)")
    .option("--up", "start the stack right after generating (no questions asked)")
    .option("--json", "machine-readable output")
    .option("--docs", "also scan README/markdown")
    .action(initCommand);

  program.command("up [services...]").description("start the stack (waits for health) and show status")
    .option("--app", "also build and start the project's app service (profile `app`)")
    .option("--build", "rebuild images (use with --app after code changes)")
    .option("--foreground", "attach instead of detaching")
    .option("--pull", "always pull images")
    .action(upCommand);
  program.command("down").description("stop the stack").option("-v, --volumes", "also delete data volumes").action(downCommand);
  program.command("status").description("container health and UI links").action(statusCommand);
  program.command("logs [services...]").description("tail logs").option("-f, --follow").option("--tail <n>", "lines", "100").action(logsCommand);
  program.command("env").description("print app.env (variables that point your app at the stack)").option("--export", "prefix with `export`").action(envCommand);

  program.command("add <services...>").description("add services (or `app`) to the stack and regenerate")
    .option("--force", "overwrite customised seeds").option("--app-port <port>", "container port for `app`").action(addCommand);
  program.command("remove <services...>").alias("rm").description("remove services from the stack and regenerate").action(removeCommand);
  program.command("list").alias("ls").description("catalog of known services")
    .option("-c, --category <name>").option("-a, --all", "include report-only and runtimes").option("--json").action(listCommand);
  program.command("doctor").description("check docker, compose, ports and registry access").action(doctorCommand);
  program.command("share").description("print a README-ready onboarding snippet for this project's stack").action(shareCommand);

  try {
    await program.parseAsync(argv);
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
