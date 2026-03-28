import { getServerEnv } from "@/lib/env";
import { ollamaChat } from "@/lib/ollama";
import { withRunStep } from "../run-step-audit";
import type { NexusGraphState } from "../state";

async function diagnoseOllama(
  state: NexusGraphState,
): Promise<Record<string, unknown>> {
  const issue = state.issue;
  if (!issue) {
    return { diagnosis: null, errors: ["missing issue context"] };
  }

  const env = getServerEnv();
  const prompt = [
    "Sentry issue (concise diagnosis, 2–5 sentences):",
    `Issue ID: ${issue.sentry_issue_id}`,
    `Title: ${issue.title ?? "(none)"}`,
    `Culprit: ${issue.culprit ?? "(none)"}`,
  ].join("\n");

  if (!env.OLLAMA_URL?.trim()) {
    return {
      diagnosis: `[OLLAMA_URL unset] Stub: inspect issue ${issue.sentry_issue_id} and reproduce locally.`,
    };
  }

  try {
    const text = await ollamaChat({
      baseUrl: env.OLLAMA_URL.trim(),
      model: env.OLLAMA_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior backend engineer. Diagnose likely root cause; no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    });
    return { diagnosis: text.trim() || null };
  } catch (e) {
    return {
      diagnosis: null,
      errors: [`ollama diagnose: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export const diagnoseOllamaNode = withRunStep("diagnose_ollama", diagnoseOllama);
