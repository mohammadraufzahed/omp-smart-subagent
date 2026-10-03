import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { loadConfig } from "./config";
import { classifyTaskDifficulty } from "./classifier";
import { registerSubagentCommands } from "./commands";

export default function (pi: ExtensionAPI): void {
  pi.setLabel("Smart SubAgent Router");

  // Register /subagent slash command
  registerSubagentCommands(pi);

  // Intercept sub-agent spawn before model patterns resolve
  pi.on("before_subagent_spawn", async (event, ctx) => {
    const config = loadConfig();
    const agentName = (event.agent?.name ?? "task").toLowerCase();
    const available = ctx.models.list();

    if (!available || available.length === 0) {
      return {};
    }

    // Extract task text if available via property check
    let taskInput = "";
    if (event && typeof event === "object" && "task" in event) {
      const raw = (event as Record<string, unknown>)["task"];
      if (typeof raw === "string") {
        taskInput = raw;
      }
    }

    // 1. Determine intelligence tier (high vs cheap)
    const { tier, reason } = await classifyTaskDifficulty(
      taskInput,
      agentName,
      ctx,
      config
    );

    // 2. Helper to find candidate models based on priority list
    const findModel = (patterns: string[]): string | undefined => {
      let candidates = available;

      // When preferOpenRouter is true, sort openrouter models first
      if (config.preferOpenRouter) {
        candidates = [
          ...available.filter((m) => m.provider.toLowerCase() === "openrouter"),
          ...available.filter((m) => m.provider.toLowerCase() !== "openrouter"),
        ];
      }

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

    // 3. Resolve model according to tier and configuration
    if (tier === "high") {
      selectedModel =
        config.preferredHighModel ??
        findModel([
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
        findModel([
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
        note: `SmartRouter [${tier.toUpperCase()}]: ${reason} -> ${selectedModel}`,
      };
    }

    return {};
  });
}
