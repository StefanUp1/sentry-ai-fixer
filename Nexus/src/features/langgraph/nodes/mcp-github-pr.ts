import { createOctokit } from "@/features/github-automation/octokit";
import { getGithubRepoConfigFromEnv } from "@/features/github-automation/config";
import { openAutomationPullRequest } from "@/features/github-automation/automation-pr";
import { persistPrArtifact } from "@/features/github-automation/persist-pr-artifact";
import { withRunStep } from "../run-step-audit";
import type { NexusGraphState } from "../state";

function prTitle(state: NexusGraphState): string {
  const t = state.issue?.title?.trim();
  return t ? `Nexus: ${t}` : `Nexus automation (${state.automation_run_id.slice(0, 8)})`;
}

function prBody(state: NexusGraphState): string {
  const parts = [
    "Automated run from **Nexus** (Sentry → LangGraph).",
    "",
    "### Diagnosis",
    "",
    state.diagnosis ?? "_(none)_",
    "",
    "### Fix plan",
    "",
    "```json",
    JSON.stringify(state.fix_plan ?? {}, null, 2),
    "```",
  ];
  return parts.join("\n");
}

async function mcpGithubPr(
  state: NexusGraphState,
): Promise<Record<string, unknown>> {
  const cfg = getGithubRepoConfigFromEnv();
  if (!cfg) {
    return {
      pr_url: null,
      pr_number: null,
      errors: [
        "github_pr: GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO not set — skipping PR",
      ],
    };
  }

  if (!state.branch_name) {
    return {
      pr_url: null,
      pr_number: null,
      errors: ["github_pr: no branch_name (prepare step failed or skipped)"],
    };
  }

  const octokit = createOctokit(cfg);

  try {
    const { data: repoData } = await octokit.rest.repos.get({
      owner: cfg.owner,
      repo: cfg.repo,
    });
    const base = repoData.default_branch;

    const { prNumber, prUrl } = await openAutomationPullRequest({
      octokit,
      owner: cfg.owner,
      repo: cfg.repo,
      head: state.branch_name,
      base,
      title: prTitle(state),
      body: prBody(state),
    });

    await persistPrArtifact({
      tenantId: state.tenant_id,
      runId: state.automation_run_id,
      branch: state.branch_name,
      prNumber,
      prUrl,
    });

    return {
      pr_number: prNumber,
      pr_url: prUrl,
    };
  } catch (e) {
    return {
      pr_url: null,
      pr_number: null,
      errors: [`github_pr: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export const mcpGithubPrNode = withRunStep("mcp_github_pr", mcpGithubPr);
