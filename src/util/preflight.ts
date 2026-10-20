import { capture } from "./exec.js";
import { log } from "./log.js";
import pc from "picocolors";

export interface PreflightCheck {
  id: string;
  name: string;
  check: () => Promise<{ ok: boolean; message?: string }>;
  critical?: boolean;
}

export interface PreflightResult {
  id: string;
  name: string;
  ok: boolean;
  message?: string;
  duration: number;
  critical: boolean;
}

/**
 * Run preflight checks in parallel without blocking the main execution.
 * Returns immediately with a Promise that can be awaited later.
 */
export async function runPreflightChecks(checks: PreflightCheck[]): Promise<PreflightResult[]> {
  const startTime = Date.now();

  // Run all checks in parallel
  const results = await Promise.all(
    checks.map(async (check): Promise<PreflightResult> => {
      const checkStart = Date.now();
      try {
        const result = await check.check();
        return {
          id: check.id,
          name: check.name,
          ok: result.ok,
          message: result.message,
          duration: Date.now() - checkStart,
          critical: check.critical ?? false,
        };
      } catch (error) {
        return {
          id: check.id,
          name: check.name,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - checkStart,
          critical: check.critical ?? false,
        };
      }
    })
  );

  const totalDuration = Date.now() - startTime;
  log.debug(pc.dim(`preflight checks completed in ${totalDuration}ms`));

  return results;
}

/**
 * Display preflight results in a formatted way
 */
export function displayPreflightResults(results: PreflightResult[], verbose = false): boolean {
  const failures = results.filter((r) => !r.ok);
  const criticalFailures = failures.filter((r) => r.critical);

  if (verbose || failures.length > 0) {
    for (const result of results) {
      if (!verbose && result.ok) continue;

      const icon = result.ok ? pc.green("✔") : pc.red("✖");
      const hint = result.message ? pc.dim(`  → ${result.message}`) : "";
      const duration = result.duration > 100 ? pc.dim(` (${result.duration}ms)`) : "";

      log.info(`${icon} ${result.name}${hint}${duration}`);
    }
  }

  if (criticalFailures.length > 0) {
    log.error(pc.red(`\n${criticalFailures.length} critical issue(s) found`));
    return false;
  } else if (failures.length > 0) {
    log.warn(pc.yellow(`\n${failures.length} warning(s) found`));
    return true;
  } else {
    if (verbose) log.info(pc.green("\nall checks passed"));
    return true;
  }
}

/**
 * Standard Docker preflight checks
 */
export function getDockerPreflightChecks(): PreflightCheck[] {
  return [
    {
      id: "docker-cli",
      name: "Docker CLI installed",
      critical: true,
      check: async () => {
        const result = capture("docker", ["--version"]);
        return {
          ok: result.ok,
          message: result.ok ? result.out.split("\n")[0] : "install Docker Desktop / Rancher Desktop / Colima",
        };
      },
    },
    {
      id: "docker-daemon",
      name: "Docker daemon running",
      critical: true,
      check: async () => {
        const result = capture("docker", ["info", "--format", "{{.ServerVersion}} {{.OSType}}/{{.Architecture}}"]);
        return {
          ok: result.ok,
          message: result.ok ? result.out.trim() : "start Docker daemon",
        };
      },
    },
    {
      id: "docker-compose",
      name: "Docker Compose v2 available",
      critical: true,
      check: async () => {
        const result = capture("docker", ["compose", "version", "--short"]);
        const version = Number(result.out.split(".")[0]?.replace(/^v/, ""));
        const ok = result.ok && version >= 2;
        return {
          ok,
          message: ok ? result.out.trim() : "Compose v2 is required (bundled with Docker Desktop)",
        };
      },
    },
    {
      id: "docker-connectivity",
      name: "Docker Hub connectivity",
      critical: false,
      check: async () => {
        const result = capture("docker", ["pull", "--quiet", "--platform", "linux/amd64", "alpine:3.20"], undefined, { timeout: 10000 });
        return {
          ok: result.ok,
          message: result.ok ? "registry reachable" : "check network connection or use --registry flag",
        };
      },
    },
  ];
}

/**
 * Background preflight runner that doesn't block main execution
 */
export class BackgroundPreflight {
  private promise: Promise<PreflightResult[]>;
  private completed = false;
  private results: PreflightResult[] = [];

  constructor(checks: PreflightCheck[]) {
    this.promise = this.runInBackground(checks);
  }

  private async runInBackground(checks: PreflightCheck[]): Promise<PreflightResult[]> {
    const results = await runPreflightChecks(checks);
    this.results = results;
    this.completed = true;
    return results;
  }

  /**
   * Check if preflight checks are complete (non-blocking)
   */
  isComplete(): boolean {
    return this.completed;
  }

  /**
   * Get results if available, otherwise return empty array (non-blocking)
   */
  getResults(): PreflightResult[] {
    return this.results;
  }

  /**
   * Wait for preflight checks to complete (blocking)
   */
  async wait(): Promise<PreflightResult[]> {
    return await this.promise;
  }

  /**
   * Display current results (non-blocking)
   */
  displayCurrent(verbose = false): void {
    if (this.results.length > 0) {
      displayPreflightResults(this.results, verbose);
    }
  }
}
