import { loadCatalog } from "../catalog/loader.js";
import { matchProject, type DetectionReport } from "./matcher.js";
import { scanProject, type ScanOptions } from "./scanner.js";

export async function detect(root: string, opts: ScanOptions = {}): Promise<DetectionReport> {
  const scan = await scanProject(root, opts);
  return matchProject(scan, loadCatalog());
}

export type { Detection, DetectionReport, Evidence, Level } from "./matcher.js";
