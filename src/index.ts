import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { loadConfig } from "./config";
import { classifyTaskWithJev } from "./classifier";
import { registerSubagentCommands } from "./commands";

export default function (pi: ExtensionAPI): void {
  pi.setLabel("Jev SubAgent Router");

  // Register /subagent slash command
  registerSubagentCommands(pi);

  // Inform session and inject instructions into context
  pi.on("session_start", async (_event, ctx) => {
    if (ctx.agent?.kind === "main") {
      ctx.ui.notify("Jev SubAgent Router active (architect, coder, researcher ready)", "info");
    }
  });

  // Intercept sub-agent spawn before model patterns resolve
  pi.on("before_subagent_spawn", async (event, ctx) => {
    const config = loadConfig();
    const available = ctx.models.list();

    if (!available || available.length === 0) {
      return {};
    }

    // Extract task text safely
    let taskInput = "";
    if (event && typeof event === "object" && "task" in event) {
      const raw = (event as Record<string, unknown>)["task"];
      if (typeof raw === "string") {
        taskInput = raw;
      }
    }

    // Rely exclusively on Jev judge for classification
    const { tier, reason } = await classifyTaskWithJev(taskInput, ctx, config);

    // Prioritize OpenRouter candidates when available
    const candidates = [
      ...available.filter((m) => m.provider.toLowerCase() === "openrouter"),
      ...available.filter((m) => m.provider.toLowerCase() !== "openrouter"),
    ];

    const matchModel = (patterns: string[]): string | undefined => {
      for (const pattern of patterns) {
        const p = pattern.toLowerCase();
        const found = candidates.find((m) => {
          const fullId = `${m.provider}/${m.id}`.toLowerCase();
          const bareId = m.id.toLowerCase();
          return fullId.includes(p) || bareId.includes(p);
        });
        if (found) {
          return `${found.provider}/${found.id}`;
        }
      }
      return undefined;
    };

    let selectedModel: string | undefined;

    if (tier === "high") {
      selectedModel =
        config.preferredHighModel ??
        matchModel([
          "claude-3-7-sonnet",
          "claude-3-5-sonnet",
          "gpt-5",
          "gpt-4.5",
          "deepseek-reasoner",
          "deepseek/deepseek-r1",
          "deepseek-r1",
          "o3-mini",
        ]);
    } else {
      selectedModel =
        config.preferredCheapModel ??
        matchModel([
          "typesafe/jev-latest",
          "typesafe/jev",
          "jev-latest",
          "gpt-5-mini",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "claude-3-5-haiku",
          "deepseek-chat",
          "deepseek/deepseek-v3",
        ]);
    }

    if (selectedModel) {
      return {
        model: selectedModel,
        note: `JevJudge [${tier.toUpperCase()}]: ${reason} -> ${selectedModel}`,
      };
    }

    return {};
  });
}
