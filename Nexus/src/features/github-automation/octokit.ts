import { Octokit } from "octokit";
import type { GithubRepoConfig } from "./config";

export function createOctokit(config: GithubRepoConfig): Octokit {
  return new Octokit({ auth: config.token });
}
