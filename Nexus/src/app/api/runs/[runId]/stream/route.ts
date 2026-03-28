import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";
import { assertDashboardApiAuth } from "@/lib/dashboard/api-auth";
import { getRunDetail } from "@/lib/dashboard/queries";
import { getServerEnv } from "@/lib/env";

const paramsSchema = z.object({
  runId: z.string().uuid(),
});

function buildOperatorPrompt(detail: NonNullable<Awaited<ReturnType<typeof getRunDetail>>>): string {
  const lines = [
    "You are summarizing an automation run for an operator. Be concise (markdown).",
    "",
    `**Run ID:** ${detail.run.id}`,
    `**Status:** ${detail.run.status}`,
    `**Summary:** ${detail.run.summary ?? "(none)"}`,
    `**Error:** ${detail.run.error ?? "(none)"}`,
    "",
    "**Sentry issue:**",
    detail.sentryEvent
      ? `- title: ${detail.sentryEvent.title ?? "?"}\n- culprit: ${detail.sentryEvent.culprit ?? "?"}`
      : "(none)",
    "",
    "**Pull request:**",
    detail.pr?.prUrl
      ? `${detail.pr.prUrl} (branch ${detail.pr.branch})`
      : "(none)",
  ];
  return lines.join("\n");
}

function staticTextStream(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const auth = await assertDashboardApiAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.status },
    );
  }

  const raw = await context.params;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const env = getServerEnv();
  const detail = await getRunDetail(parsed.data.runId, env.NEXUS_WEBHOOK_TENANT_SLUG);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prompt = buildOperatorPrompt(detail);
  const ollamaUrl = env.OLLAMA_URL?.trim();

  if (!ollamaUrl) {
    return staticTextStream(
      `# Run summary (offline)\n\n${prompt}\n\n_Set OLLAMA_URL for LLM streaming._`,
    );
  }

  const baseURL = `${ollamaUrl.replace(/\/$/, "")}/api`;
  const ollama = createOllama({ baseURL });

  const result = streamText({
    model: ollama(env.OLLAMA_MODEL),
    system:
      "You help operators review Nexus automation runs. Use short markdown sections.",
    prompt,
  });

  return result.toTextStreamResponse();
}
