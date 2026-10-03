import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

export interface SubagentRouterConfig {
  mode: "smart_judge" | "heuristic" | "always_high" | "always_cheap";
  preferredCheapModel?: string;
  preferredHighModel?: string;
  preferOpenRouter: boolean;
  useJevJudge: boolean;
}

const CONFIG_PATH = path.join(os.homedir(), ".omp", "subagent-router.json");

export function loadConfig(): SubagentRouterConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // ignore parse error, fallback to default
  }
  return {
    mode: "smart_judge",
    preferOpenRouter: true,
    useJevJudge: true,
  };
}

export function saveConfig(cfg: SubagentRouterConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}
