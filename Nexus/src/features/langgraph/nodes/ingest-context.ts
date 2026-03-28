import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sentryEvents } from "@/lib/db/schema/automation";
import { withRunStep } from "../run-step-audit";
import type { NexusGraphState, NexusIssueContext } from "../state";

async function ingestContext(state: NexusGraphState): Promise<{
  issue: NexusIssueContext | null;
  errors?: string[];
}> {
  const db = getDb();
  const [event] = await db
    .select({
      sentryIssueId: sentryEvents.sentryIssueId,
      title: sentryEvents.title,
      culprit: sentryEvents.culprit,
      fingerprint: sentryEvents.fingerprint,
    })
    .from(sentryEvents)
    .where(
      and(
        eq(sentryEvents.id, state.sentry_event_id),
        eq(sentryEvents.tenantId, state.tenant_id),
      ),
    )
    .limit(1);

  if (!event) {
    return {
      issue: null,
      errors: ["sentry event not found for tenant"],
    };
  }

  const issue: NexusIssueContext = {
    sentry_issue_id: event.sentryIssueId,
    title: event.title,
    culprit: event.culprit,
    fingerprint: event.fingerprint,
  };

  return { issue };
}

export const ingestContextNode = withRunStep("ingest_context", ingestContext);
