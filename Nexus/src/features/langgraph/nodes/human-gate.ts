import { withRunStep } from "../run-step-audit";

/**
 * Phase 5 stub: always marks run as awaiting human approval.
 * Phase 7: replace with `interrupt()` and resume from dashboard.
 */
export const humanGateNode = withRunStep("human_gate", async () => ({
  awaiting_approval: true,
}));
