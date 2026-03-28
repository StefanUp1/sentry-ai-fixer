import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { verifySentryWebhookSignature } from "@/features/sentry-listener/verify";
import {
  isIgnorableSentryResource,
  normalizeSentryWebhookPayload,
} from "@/features/sentry-listener/normalize";
import {
  getTenantIdBySlug,
  persistSentryWebhookEvent,
} from "@/features/sentry-listener/persist";
import { enqueueAutomationRun } from "@/features/sentry-listener/queue";

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.info("[nexus:webhooks/sentry]", ...args);
  }
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const resource = request.headers.get("sentry-hook-resource") ?? undefined;
  const signature = request.headers.get("sentry-hook-signature");

  const env = getServerEnv();
  const skipVerify = process.env.SENTRY_WEBHOOK_SKIP_VERIFY === "true";

  devLog("incoming", {
    resource: resource ?? null,
    bodyBytes: rawBody.length,
    signatureVerifySkipped: skipVerify,
  });

  if (!skipVerify) {
    const secret = env.SENTRY_WEBHOOK_CLIENT_SECRET;
    if (!secret) {
      devLog("reject: missing SENTRY_WEBHOOK_CLIENT_SECRET");
      return NextResponse.json(
        { error: "SENTRY_WEBHOOK_CLIENT_SECRET is not configured" },
        { status: 500 },
      );
    }
    if (!verifySentryWebhookSignature(rawBody, signature, secret)) {
      devLog("reject: invalid Sentry-Hook-Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    devLog("reject: JSON.parse failed");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isIgnorableSentryResource(resource)) {
    devLog("skipped (ignorable resource)", { resource });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "ignorable_resource",
      resource: resource ?? null,
    });
  }

  const normalized = normalizeSentryWebhookPayload(resource, body);
  if (!normalized) {
    devLog("skipped (unsupported payload or missing issue id)", { resource });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "unsupported_or_missing_issue",
      resource: resource ?? null,
    });
  }

  const db = getDb();
  const tenantId = await getTenantIdBySlug(db, env.NEXUS_WEBHOOK_TENANT_SLUG);
  if (!tenantId) {
    devLog("reject: unknown tenant", {
      slug: env.NEXUS_WEBHOOK_TENANT_SLUG,
    });
    return NextResponse.json(
      {
        error: `Unknown tenant slug: ${env.NEXUS_WEBHOOK_TENANT_SLUG}`,
      },
      { status: 404 },
    );
  }

  try {
    const { sentryEventId, automationRunId } = await persistSentryWebhookEvent(
      db,
      tenantId,
      normalized,
      body,
    );
    await enqueueAutomationRun(automationRunId);
    devLog("persisted", {
      sentryIssueId: normalized.sentryIssueId,
      sentryEventId,
      automationRunId,
    });
    return NextResponse.json({
      ok: true,
      sentryEventId,
      automationRunId,
    });
  } catch (err) {
    console.error("[nexus:webhooks/sentry]", err);
    return NextResponse.json(
      { error: "Failed to persist webhook" },
      { status: 500 },
    );
  }
}
