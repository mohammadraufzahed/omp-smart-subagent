import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import { loadConfig, saveConfig, type SubagentRouterConfig } from "./config";

export function registerSubagentCommands(pi: ExtensionAPI): void {
  pi.registerCommand("subagent", {
    description: "Manage Jev-powered subagent model router (/subagent setup|status)",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const subcmd = args.trim().split(/\s+/)[0]?.toLowerCase();

      if (subcmd === "setup") {
        await runSetupWizard(ctx);
        return;
      }

      // Default: show status
      const cfg = loadConfig();
      const orMasked = cfg.openrouterApiKey
        ? `${cfg.openrouterApiKey.slice(0, 8)}...`
        : "(not set)";
      const tsMasked = cfg.typesafeApiKey
        ? `${cfg.typesafeApiKey.slice(0, 8)}...`
        : "(not set)";

      ctx.ui.notify(
        `[Jev SubAgent Router Status]\n` +
          `• OpenRouter Key: ${orMasked}\n` +
          `• TypeSafe Key: ${tsMasked}\n` +
          `• Preferred High Model: ${cfg.preferredHighModel ?? "(Auto-Detect)"}\n` +
          `• Preferred Cheap Model: ${cfg.preferredCheapModel ?? "(Auto-Detect)"}\n\n` +
          `Run '/subagent setup' to configure API tokens and preferred models.`,
        "info"
      );
    },
  });
}

async function runSetupWizard(ctx: ExtensionCommandContext): Promise<void> {
  const current = loadConfig();
  const models = ctx.models.list();

  ctx.ui.notify("Starting Jev SubAgent Router setup wizard...", "info");

  // 1. Prompt for OpenRouter API Token
  const orPrompt = current.openrouterApiKey
    ? `Enter OpenRouter API Key [Press Enter to keep existing ${current.openrouterApiKey.slice(0, 8)}...]:`
    : "Enter OpenRouter API Key (sk-or-...):";

  const enteredOrKey = await ctx.ui.input(orPrompt);
  const openrouterApiKey = enteredOrKey && enteredOrKey.trim().length > 0
    ? enteredOrKey.trim()
    : current.openrouterApiKey;

  // 2. Prompt for TypeSafe API Token (optional direct Jev access)
  const tsPrompt = current.typesafeApiKey
    ? `Enter TypeSafe API Key [Press Enter to keep existing ${current.typesafeApiKey.slice(0, 8)}...]:`
    : "Enter TypeSafe API Key (optional, press Enter to skip):";

  const enteredTsKey = await ctx.ui.input(tsPrompt);
  const typesafeApiKey = enteredTsKey && enteredTsKey.trim().length > 0
    ? enteredTsKey.trim()
    : current.typesafeApiKey;

  // 3. Select preferred models from active session
  let preferredHighModel = current.preferredHighModel;
  let preferredCheapModel = current.preferredCheapModel;

  if (models && models.length > 0) {
    const modelOptions = [
      "(Auto-Detect)",
      ...models.map((m) => `${m.provider}/${m.id}`),
    ];

    const highPick = await ctx.ui.select(
      `Select Preferred HIGH-tier Model [Current: ${preferredHighModel ?? "Auto"}]:`,
      modelOptions
    );
    if (highPick) {
      preferredHighModel = highPick !== "(Auto-Detect)" ? highPick : undefined;
    }

    const cheapPick = await ctx.ui.select(
      `Select Preferred CHEAP/FAST Model [Current: ${preferredCheapModel ?? "Auto"}]:`,
      modelOptions
    );
    if (cheapPick) {
      preferredCheapModel = cheapPick !== "(Auto-Detect)" ? cheapPick : undefined;
    }
  }

  const updated: SubagentRouterConfig = {
    openrouterApiKey,
    typesafeApiKey,
    preferredHighModel,
    preferredCheapModel,
  };

  saveConfig(updated);
  ctx.ui.notify("Jev SubAgent Router configuration saved successfully to ~/.omp/subagent-router.json!", "info");
}
