import { createOctokit } from "@/features/github-automation/octokit";
import { getGithubRepoConfigFromEnv } from "@/features/github-automation/config";
import { prepareAutomationBranch } from "@/features/github-automation/automation-pr";
import { withRunStep } from "../run-step-audit";
import type { NexusGraphState } from "../state";

function buildPlaceholderMarkdown(state: NexusGraphState): string {
  const lines = [
    `# Nexus automation`,
    "",
    `- **Run ID:** \`${state.automation_run_id}\``,
    `- **Sentry issue:** ${state.issue?.sentry_issue_id ?? "(unknown)"}`,
    "",
    `## Diagnosis`,
    "",
    state.diagnosis ?? "_(none)_",
    "",
    `## Fix plan`,
    "",
    "```json",
    JSON.stringify(state.fix_plan ?? {}, null, 2),
    "```",
    "",
  ];
  return lines.join("\n");
}

async function mcpGithubPrepare(
  state: NexusGraphState,
): Promise<Record<string, unknown>> {
  const cfg = getGithubRepoConfigFromEnv();
  if (!cfg) {
    return {
      branch_name: null,
      errors: [
        "github_prepare: GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO not set — skipping branch",
      ],
    };
  }

  const octokit = createOctokit(cfg);
  try {
    const { branchName } = await prepareAutomationBranch({
      octokit,
      owner: cfg.owner,
      repo: cfg.repo,
      runId: state.automation_run_id,
      fileBody: buildPlaceholderMarkdown(state),
    });
    return { branch_name: branchName };
  } catch (e) {
    return {
      branch_name: null,
      errors: [
        `github_prepare: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }
}

export const mcpGithubPrepareNode = withRunStep(
  "mcp_github_prepare",
  mcpGithubPrepare,
);
