import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { automationRuns } from "@/lib/db/schema/automation";
import { getCompiledNexusGraph } from "./graph";

function summaryFromFinalState(state: {
  fix_plan?: Record<string, unknown> | null;
  diagnosis?: string | null;
}): string | null {
  const fp = state.fix_plan;
  if (fp && typeof fp.summary === "string") {
    return fp.summary;
  }
  return state.diagnosis ?? null;
}

/**
 * Load `automation_runs`, run LangGraph (thread_id = run id), update status + summary.
 */
export async function executeAutomationRun(runId: string): Promise<void> {
  const db = getDb();
  const [run] = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.id, runId))
    .limit(1);

  if (!run) {
    console.error("[nexus:langgraph] unknown automation run", runId);
    return;
  }

  if (!run.sentryEventId) {
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        error: "missing sentry_event_id",
        updatedAt: new Date(),
      })
      .where(eq(automationRuns.id, runId));
    return;
  }

  await db
    .update(automationRuns)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(automationRuns.id, runId));

  try {
    const graph = await getCompiledNexusGraph();
    const result = await graph.invoke(
      {
        tenant_id: run.tenantId,
        automation_run_id: runId,
        sentry_event_id: run.sentryEventId,
      },
      { configurable: { thread_id: runId } },
    );

    const summary = summaryFromFinalState(result);
    const softErrors = result.errors?.length
      ? result.errors.join("; ")
      : null;

    await db
      .update(automationRuns)
      .set({
        status: result.awaiting_approval ? "awaiting_approval" : "completed",
        summary: summary?.slice(0, 10000) ?? null,
        graphCheckpointId: runId,
        error: softErrors,
        updatedAt: new Date(),
      })
      .where(eq(automationRuns.id, runId));
  } catch (err) {
    console.error("[nexus:langgraph] run failed", runId, err);
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(automationRuns.id, runId));
  }
}
