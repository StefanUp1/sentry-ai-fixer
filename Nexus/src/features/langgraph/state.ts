import { Annotation } from "@langchain/langgraph";

/** Normalized issue context loaded from `sentry_events` (graph input). */
export type NexusIssueContext = {
  sentry_issue_id: string;
  title: string | null;
  culprit: string | null;
  fingerprint: string | null;
};

/**
 * LangGraph shared state — mirrors spec §4.1 (subset implemented in Phase 5).
 */
export const NexusStateAnnotation = Annotation.Root({
  tenant_id: Annotation<string>(),
  automation_run_id: Annotation<string>(),
  sentry_event_id: Annotation<string>(),
  issue: Annotation<NexusIssueContext | null>(),
  diagnosis: Annotation<string | null>(),
  fix_plan: Annotation<Record<string, unknown> | null>(),
  errors: Annotation<string[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  /** Phase 7: real interrupt + resume; Phase 5 stub always true after `human_gate`. */
  awaiting_approval: Annotation<boolean | null>(),
  /** Phase 6: GitHub branch + PR (Octokit). */
  branch_name: Annotation<string | null>(),
  pr_url: Annotation<string | null>(),
  pr_number: Annotation<number | null>(),
});

export type NexusGraphState = typeof NexusStateAnnotation.State;
