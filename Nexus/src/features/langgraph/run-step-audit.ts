import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { runSteps } from "@/lib/db/schema/automation";
import type { NexusGraphState } from "./state";

function stateSnapshot(state: NexusGraphState): Record<string, unknown> {
  return {
    tenant_id: state.tenant_id,
    sentry_event_id: state.sentry_event_id,
    has_issue: state.issue != null,
    diagnosis_len: state.diagnosis?.length ?? 0,
    has_fix_plan: state.fix_plan != null,
  };
}

function summarizeUpdate(update: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (k === "diagnosis" && typeof v === "string" && v.length > 4000) {
      out[k] = `${v.slice(0, 4000)}…`;
      out[`${k}_truncated`] = true;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Wrap a graph node to insert `run_steps` rows (audit trail).
 */
export function withRunStep(
  nodeName: string,
  run: (state: NexusGraphState) => Promise<Record<string, unknown>>,
): (state: NexusGraphState) => Promise<Record<string, unknown>> {
  return async (state) => {
    const db = getDb();
    const runId = state.automation_run_id;

    const [step] = await db
      .insert(runSteps)
      .values({
        runId,
        nodeName,
        inputRef: stateSnapshot(state),
        startedAt: new Date(),
      })
      .returning({ id: runSteps.id });

    if (!step) {
      throw new Error(`run_steps insert failed for ${nodeName}`);
    }

    try {
      const update = await run(state);
      await db
        .update(runSteps)
        .set({
          outputRef: summarizeUpdate(update),
          endedAt: new Date(),
        })
        .where(eq(runSteps.id, step.id));
      return update;
    } catch (err) {
      await db
        .update(runSteps)
        .set({
          outputRef: {
            error: err instanceof Error ? err.message : String(err),
          },
          endedAt: new Date(),
        })
        .where(eq(runSteps.id, step.id));
      throw err;
    }
  };
}
