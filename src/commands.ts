import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import { loadConfig, saveConfig, type SubagentRouterConfig } from "./config";

export function registerSubagentCommands(pi: ExtensionAPI): void {
  pi.registerCommand("subagent", {
    description: "Manage smart sub-agent model selection and routing (/subagent setup|status)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const subcmd = args.trim().split(/\s+/)[0]?.toLowerCase();

      if (subcmd === "setup") {
        await runSetupWizard(ctx);
        return;
      }

      // Default: status
      const cfg = loadConfig();
      ctx.ui.notify(
        `[SubAgent Router Status]\n` +
          `• Mode: ${cfg.mode}\n` +
          `• Prefer OpenRouter: ${cfg.preferOpenRouter ? "yes" : "no"}\n` +
          `• Use Jev/AI Judge: ${cfg.useJevJudge ? "yes" : "no"}\n` +
          `• Preferred High Model: ${cfg.preferredHighModel ?? "(Auto-Detect)"}\n` +
          `• Preferred Cheap Model: ${cfg.preferredCheapModel ?? "(Auto-Detect)"}\n\n` +
          `Run '/subagent setup' to reconfigure.`,
        "info"
      );
    },
  });
}

async function runSetupWizard(ctx: ExtensionCommandContext): Promise<void> {
  const current = loadConfig();
  const models = ctx.models.list();

  if (!models || models.length === 0) {
    ctx.ui.notify("No active models detected in the current omp session.", "error");
    return;
  }

  // 1. Choose classification mode
  const modeChoice = await ctx.ui.select("Select Task Classification Mode:", [
    "smart_judge (AI Judge with Jev / Ephemeral evaluates difficulty)",
    "heuristic (Keyword and agent-role heuristics)",
    "always_high (Always route sub-agents to high-tier reasoning models)",
    "always_cheap (Always route sub-agents to lightweight/fast models)",
  ]);

  if (!modeChoice) return;
  const mode = modeChoice.split(" ")[0] as SubagentRouterConfig["mode"];

  // 2. Select preferred models
  const modelOptions = [
    "(Auto-Detect)",
    ...models.map((m) => `${m.provider}/${m.id}`),
  ];

  const highPick = await ctx.ui.select(
    `Select Preferred HIGH-tier Model [Current: ${current.preferredHighModel ?? "Auto"}]:`,
    modelOptions
  );

  const cheapPick = await ctx.ui.select(
    `Select Preferred CHEAP/FAST Model [Current: ${current.preferredCheapModel ?? "Auto"}]:`,
    modelOptions
  );

  // 3. OpenRouter preference
  const preferOR = await ctx.ui.confirm(
    "Prefer OpenRouter models when matching providers?"
  );

  // 4. Jev / AI Judge evaluation
  const useJev = await ctx.ui.confirm(
    "Enable TypeSafe / Jev AI evaluation for classifying task difficulty?"
  );

  const updated: SubagentRouterConfig = {
    mode,
    preferOpenRouter: preferOR,
    useJevJudge: useJev,
    preferredHighModel: highPick && highPick !== "(Auto-Detect)" ? highPick : undefined,
    preferredCheapModel: cheapPick && cheapPick !== "(Auto-Detect)" ? cheapPick : undefined,
  };

  saveConfig(updated);
  ctx.ui.notify("Sub-agent router configuration successfully updated and saved!", "info");
}
