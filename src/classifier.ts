import type { ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import type { SubagentRouterConfig } from "./config";

export type Tier = "cheap" | "high";

export async function classifyTaskDifficulty(
  taskPrompt: string,
  agentName: string,
  ctx: ExtensionContext,
  config: SubagentRouterConfig
): Promise<{ tier: Tier; reason: string }> {
  // 1. Direct agent-role affinities
  if (agentName === "architect" || agentName === "security-reviewer" || agentName === "reviewer") {
    return { tier: "high", reason: `Agent role '${agentName}' requires deep reasoning` };
  }
  if (agentName === "researcher" || agentName === "scout") {
    return { tier: "cheap", reason: `Agent role '${agentName}' is fast read-only scouting` };
  }

  // 2. Fixed policy overrides
  if (config.mode === "always_cheap") {
    return { tier: "cheap", reason: "Policy: forced cheap mode" };
  }
  if (config.mode === "always_high") {
    return { tier: "high", reason: "Policy: forced high mode" };
  }

  // 3. AI Classifier via Jev or Ephemeral Turn
  if (config.useJevJudge && ctx.runEphemeralTurn) {
    try {
      const evaluationPrompt = `You are a task complexity classifier for an AI sub-agent.
Analyze the following sub-agent task:
"""
${taskPrompt.slice(0, 1500)}
"""

Classification criteria:
- "HIGH": Complex architectural decisions, multi-file refactoring, concurrency/race conditions, security auditing, novel algorithm design, ambiguous debugging.
- "CHEAP": Mechanical code changes, simple bug fixes, documentation/comments, routine unit tests, simple scripts, formatting.

Reply strictly with a single word: "HIGH" or "CHEAP".`;

      const res = await ctx.runEphemeralTurn({
        promptText: evaluationPrompt,
        tools: false,
        maxTokens: 16,
      });

      const reply = (res?.replyText ?? "").trim().toUpperCase();
      if (reply.includes("HIGH")) {
        return { tier: "high", reason: "AI classifier determined task is HIGH complexity" };
      }
      if (reply.includes("CHEAP")) {
        return { tier: "cheap", reason: "AI classifier determined task is CHEAP/mechanical" };
      }
    } catch {
      // Fallback to heuristic if ephemeral inference fails or is unavailable
    }
  }

  // 4. Heuristic evaluation fallback
  const highKeywords = [
    "architect",
    "architecture",
    "refactor",
    "redesign",
    "security",
    "vulnerability",
    "concurrency",
    "deadlock",
    "race condition",
    "memory leak",
    "performance",
    "optimize",
    "audit",
    "benchmark",
  ];

  const lower = taskPrompt.toLowerCase();
  const matchedKeyword = highKeywords.find((kw) => lower.includes(kw));

  if (matchedKeyword) {
    return { tier: "high", reason: `Heuristic: detected keyword '${matchedKeyword}'` };
  }

  return { tier: "cheap", reason: "Heuristic: standard execution/mechanical task" };
}
