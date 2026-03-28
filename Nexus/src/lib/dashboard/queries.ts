import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  automationRuns,
  prArtifacts,
  sentryEvents,
} from "@/lib/db/schema/automation";
import { getTenantIdBySlug } from "@/features/sentry-listener/persist";

export async function listRunsForTenantSlug(slug: string, limit = 50) {
  const db = getDb();
  const tenantId = await getTenantIdBySlug(db, slug);
  if (!tenantId) {
    return [];
  }
  return db
    .select({
      id: automationRuns.id,
      status: automationRuns.status,
      summary: automationRuns.summary,
      error: automationRuns.error,
      createdAt: automationRuns.createdAt,
    })
    .from(automationRuns)
    .where(eq(automationRuns.tenantId, tenantId))
    .orderBy(desc(automationRuns.createdAt))
    .limit(limit);
}

export type RunDetail = {
  run: typeof automationRuns.$inferSelect;
  sentryEvent: typeof sentryEvents.$inferSelect | null;
  pr: typeof prArtifacts.$inferSelect | null;
};

export async function getRunDetail(
  runId: string,
  tenantSlug: string,
): Promise<RunDetail | null> {
  const db = getDb();
  const tenantId = await getTenantIdBySlug(db, tenantSlug);
  if (!tenantId) {
    return null;
  }

  const [run] = await db
    .select()
    .from(automationRuns)
    .where(
      and(
        eq(automationRuns.id, runId),
        eq(automationRuns.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!run) {
    return null;
  }

  let sentryEvent: typeof sentryEvents.$inferSelect | null = null;
  if (run.sentryEventId) {
    const ev = await db
      .select()
      .from(sentryEvents)
      .where(eq(sentryEvents.id, run.sentryEventId))
      .limit(1);
    sentryEvent = ev[0] ?? null;
  }

  const [pr] = await db
    .select()
    .from(prArtifacts)
    .where(eq(prArtifacts.runId, runId))
    .limit(1);

  return {
    run,
    sentryEvent,
    pr: pr ?? null,
  };
}
