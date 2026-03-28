import { getServerEnv } from "@/lib/env";
import { ollamaChat } from "@/lib/ollama";
import { fixPlanSchema } from "../fix-plan";
import { withRunStep } from "../run-step-audit";
import type { NexusGraphState } from "../state";

function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

async function planFix(state: NexusGraphState): Promise<Record<string, unknown>> {
  const diagnosis = state.diagnosis?.trim() ?? "";
  if (!diagnosis) {
    return {
      fix_plan: {
        summary: "No diagnosis available; cannot propose a structured plan.",
        suggested_files: [],
        risk: "high" as const,
      },
    };
  }

  const env = getServerEnv();
  if (!env.OLLAMA_URL?.trim()) {
    return {
      fix_plan: {
        summary:
          "Stub plan (set OLLAMA_URL for LLM-generated plans). Review Sentry stack trace and add tests.",
        suggested_files: [],
        risk: "medium" as const,
      },
    };
  }

  const prompt = [
    "Given this diagnosis, respond with a single JSON object only (no markdown), shape:",
    '{"summary": string, "suggested_files": [{"path": string, "change": string}], "risk": "low"|"medium"|"high"}',
    "",
    "Diagnosis:",
    diagnosis,
  ].join("\n");

  try {
    const raw = await ollamaChat({
      baseUrl: env.OLLAMA_URL.trim(),
      model: env.OLLAMA_MODEL,
      messages: [
        {
          role: "system",
          content: "Output valid JSON only. No code fences.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = extractJsonObject(raw);
    const validated = fixPlanSchema.safeParse(parsed);
    if (validated.success) {
      return { fix_plan: validated.data as Record<string, unknown> };
    }

    return {
      fix_plan: {
        summary: raw.slice(0, 8000),
        suggested_files: [],
        risk: "medium" as const,
        parse_note: "fallback: model output was not valid fix_plan JSON",
      },
    };
  } catch (e) {
    return {
      fix_plan: null,
      errors: [`ollama plan_fix: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export const planFixNode = withRunStep("plan_fix", planFix);
