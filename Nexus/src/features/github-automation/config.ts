import { getServerEnv } from "@/lib/env";

export type GithubRepoConfig = {
  token: string;
  owner: string;
  repo: string;
};

/**
 * Phase 6: single-repo credentials from env. Later: `integration_github` per tenant.
 */
export function getGithubRepoConfigFromEnv(): GithubRepoConfig | null {
  const env = getServerEnv();
  const token = env.GITHUB_TOKEN?.trim();
  const owner = env.GITHUB_OWNER?.trim();
  const repo = env.GITHUB_REPO?.trim();
  if (!token || !owner || !repo) {
    return null;
  }
  return { token, owner, repo };
}
