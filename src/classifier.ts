import type { ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import type { SubagentRouterConfig } from "./config";

export type Tier = "cheap" | "high";

const SYSTEM_PROMPT =
  "You are Jev, a specialized System One judge. " +
  "Classify this task for an AI subagent into HIGH or CHEAP complexity. " +
  "Criteria:\n" +
  "- HIGH: Complex architectural decisions, multi-file refactoring, concurrency, security audits, algorithm design, hard debugging.\n" +
  "- CHEAP: Mechanical edits, simple bug fixes, docs/comments, routine unit tests, simple scripts, formatting.\n" +
  "Reply strictly with a single word: HIGH or CHEAP.";

async function judgeViaOpenRouter(
  taskPrompt: string,
  apiKey: string
): Promise<Tier | undefined> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const body = {
    model: "~typesafe/jev-latest",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Task: ${taskPrompt.slice(0, 1500)}` },
    ],
    max_tokens: 16,
    temperature: 0,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/mohammadraufzahed/omp-smart-subagent",
      "X-Title": "omp-smart-subagent",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return undefined;
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "";
  if (text.includes("HIGH")) return "high";
  if (text.includes("CHEAP")) return "cheap";
  return undefined;
}

async function judgeViaTypeSafe(
  taskPrompt: string,
  apiKey: string
): Promise<Tier | undefined> {
  const url = "https://api.typesafe.ai/v1/systemone";
  const body = {
    model: "jev-latest",
    prompt: `${SYSTEM_PROMPT}\n\nTask: ${taskPrompt.slice(0, 1500)}`,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return undefined;
  }

  const json = (await res.json()) as { answer?: string; text?: string };
  const text = (json.answer ?? json.text ?? "").trim().toUpperCase();
  if (text.includes("HIGH")) return "high";
  if (text.includes("CHEAP")) return "cheap";
  return undefined;
}

export async function classifyTaskWithJev(
  taskPrompt: string,
  ctx: ExtensionContext,
  config: SubagentRouterConfig
): Promise<{ tier: Tier; reason: string }> {
  // 1. Direct API call to OpenRouter if openrouterApiKey is present
  const orKey = config.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const decision = await judgeViaOpenRouter(taskPrompt, orKey);
      if (decision) {
        return {
          tier: decision,
          reason: `Jev Judge (OpenRouter ~typesafe/jev-latest) classified task as ${decision.toUpperCase()}`,
        };
      }
    } catch {
      // Fall through to other Jev channels
    }
  }

  // 2. Direct API call to TypeSafe if typesafeApiKey is present
  const tsKey = config.typesafeApiKey || process.env.TYPESAFE_API_KEY;
  if (tsKey) {
    try {
      const decision = await judgeViaTypeSafe(taskPrompt, tsKey);
      if (decision) {
        return {
          tier: decision,
          reason: `Jev Judge (TypeSafe native jev-latest) classified task as ${decision.toUpperCase()}`,
        };
      }
    } catch {
      // Fall through to ephemeral turn
    }
  }

  // 3. In-session judge using runEphemeralTurn if available
  if (ctx.runEphemeralTurn) {
    try {
      const res = await ctx.runEphemeralTurn({
        promptText: `${SYSTEM_PROMPT}\n\nTask: ${taskPrompt.slice(0, 1500)}`,
        tools: false,
        maxTokens: 16,
      });

      const reply = (res?.replyText ?? "").trim().toUpperCase();
      if (reply.includes("HIGH")) {
        return {
          tier: "high",
          reason: "Jev Judge (in-session ephemeral evaluation) classified task as HIGH",
        };
      }
      if (reply.includes("CHEAP")) {
        return {
          tier: "cheap",
          reason: "Jev Judge (in-session ephemeral evaluation) classified task as CHEAP",
        };
      }
    } catch {
      // Ephemeral turn unavailable or failed
    }
  }

  // 4. Default fallback when Jev credentials are completely missing
  return {
    tier: "cheap",
    reason: "Jev Judge uncontactable (no key configured via /subagent setup) -> defaulted to CHEAP",
  };
}
