import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { tenants } from "@/lib/db/schema/core";
import { automationRuns, sentryEvents } from "@/lib/db/schema/automation";
import type { NormalizedSentryIssue } from "./normalize";

export type PersistSentryWebhookResult = {
  sentryEventId: string;
  automationRunId: string;
};

/**
 * Upsert `sentry_events` on (tenant_id, sentry_issue_id), insert `automation_runs` (queued).
 */
export async function persistSentryWebhookEvent(
  db: Database,
  tenantId: string,
  normalized: NormalizedSentryIssue,
  fullPayload: Record<string, unknown>,
): Promise<PersistSentryWebhookResult> {
  const [eventRow] = await db
    .insert(sentryEvents)
    .values({
      tenantId,
      sentryIssueId: normalized.sentryIssueId,
      fingerprint: normalized.fingerprint,
      title: normalized.title,
      culprit: normalized.culprit,
      payload: fullPayload,
    })
    .onConflictDoUpdate({
      target: [sentryEvents.tenantId, sentryEvents.sentryIssueId],
      set: {
        fingerprint: normalized.fingerprint,
        title: normalized.title,
        culprit: normalized.culprit,
        payload: fullPayload,
        receivedAt: sql`now()`,
      },
    })
    .returning({ id: sentryEvents.id });

  if (!eventRow) {
    throw new Error("Failed to upsert sentry_events");
  }

  const [runRow] = await db
    .insert(automationRuns)
    .values({
      tenantId,
      status: "queued",
      sentryEventId: eventRow.id,
    })
    .returning({ id: automationRuns.id });

  if (!runRow) {
    throw new Error("Failed to insert automation_runs");
  }

  return {
    sentryEventId: eventRow.id,
    automationRunId: runRow.id,
  };
}

export async function getTenantIdBySlug(
  db: Database,
  slug: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}
