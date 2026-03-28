import { Octokit } from "octokit";
import type { GithubRepoConfig } from "./config";

export async function mergePullRequest(
  cfg: GithubRepoConfig,
  prNumber: number,
): Promise<void> {
  const octokit = new Octokit({ auth: cfg.token });
  await octokit.rest.pulls.merge({
    owner: cfg.owner,
    repo: cfg.repo,
    pull_number: prNumber,
    merge_method: "squash",
  });
}
