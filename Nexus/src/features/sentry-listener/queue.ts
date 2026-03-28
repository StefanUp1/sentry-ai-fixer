import { executeAutomationRun } from "@/features/langgraph/execute-automation-run";

/**
 * Kick off LangGraph for this run (in-process). Phase 6+: swap for BullMQ / Inngest / SQS + worker.
 */
export async function enqueueAutomationRun(runId: string): Promise<void> {
  void executeAutomationRun(runId).catch((err) => {
    console.error("[nexus:queue] automation run failed", runId, err);
  });
  console.info("[nexus:queue] automation run scheduled", { runId });
}
