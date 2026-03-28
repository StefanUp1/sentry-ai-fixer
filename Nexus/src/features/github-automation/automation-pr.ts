import type { Octokit } from "octokit";

/** GitHub branch name: `nexus/automation/<runId>` (sanitized). */
export function automationBranchName(runId: string): string {
  const safe = runId.replace(/[^a-zA-Z0-9/-]/g, "-").replace(/-+/g, "-");
  return `nexus/automation/${safe}`;
}

/**
 * Create branch at default tip + placeholder file so the branch differs from base (open PR possible).
 */
export async function prepareAutomationBranch(opts: {
  octokit: Octokit;
  owner: string;
  repo: string;
  runId: string;
  /** Markdown body for `.nexus/runs/<runId>.md` */
  fileBody: string;
}): Promise<{ branchName: string; defaultBranch: string }> {
  const { octokit, owner, repo, runId, fileBody } = opts;
  const branchName = automationBranchName(runId);

  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: baseRef } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = baseRef.object.sha;

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `.nexus/runs/${runId}.md`,
    message: `chore(nexus): automation run ${runId}`,
    content: Buffer.from(fileBody, "utf8").toString("base64"),
    branch: branchName,
  });

  return { branchName, defaultBranch };
}

/**
 * Open a pull request from `head` branch to `base` (default branch name).
 */
export async function openAutomationPullRequest(opts: {
  octokit: Octokit;
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
}): Promise<{ prNumber: number; prUrl: string }> {
  const { octokit, owner, repo, head, base, title, body } = opts;
  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body,
  });
  const prUrl = pr.html_url;
  const prNumber = pr.number;
  return { prNumber, prUrl };
}
