"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  automationRuns,
  humanApprovals,
  prArtifacts,
} from "@/lib/db/schema/automation";
import { getGithubRepoConfigFromEnv } from "@/features/github-automation/config";
import { mergePullRequest } from "@/features/github-automation/merge-pull-request";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getServerEnv } from "@/lib/env";

async function assertDashboardAuth(): Promise<void> {
  const env = getServerEnv();
  const secret = env.NEXUS_DASHBOARD_SECRET?.trim();
  if (!secret) {
    throw new Error("Dashboard is not configured (NEXUS_DASHBOARD_SECRET).");
  }
  const ok = await getDashboardSession();
  if (!ok) {
    throw new Error("Unauthorized");
  }
}

export async function approveRun(runId: string): Promise<{ ok: true } | { error: string }> {
  try {
    await assertDashboardAuth();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const db = getDb();
  const [run] = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.id, runId))
    .limit(1);

  if (!run) {
    return { error: "Run not found" };
  }

  if (run.status !== "awaiting_approval") {
    return { error: `Run is not awaiting approval (status: ${run.status})` };
  }

  const [prRow] = await db
    .select()
    .from(prArtifacts)
    .where(
      and(
        eq(prArtifacts.runId, runId),
        eq(prArtifacts.tenantId, run.tenantId),
      ),
    )
    .limit(1);

  const gh = getGithubRepoConfigFromEnv();
  if (prRow?.prNumber != null && gh) {
    try {
      await mergePullRequest(gh, prRow.prNumber);
      await db
        .update(prArtifacts)
        .set({ mergeStatus: "merged" })
        .where(eq(prArtifacts.id, prRow.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/runs/${runId}`);
      return { error: `Merge failed: ${msg}` };
    }
  }

  await db.insert(humanApprovals).values({
    runId,
    tenantId: run.tenantId,
    decision: "approve",
    actorUserId: null,
    payload: { source: "dashboard" },
  });

  let nextError: string | null = run.error;
  if (prRow?.prNumber != null && gh) {
    nextError = null;
  } else if (prRow?.prNumber != null && !gh) {
    nextError =
      "Approved; PR not merged (configure GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO).";
  }

  await db
    .update(automationRuns)
    .set({
      status: "completed",
      updatedAt: new Date(),
      error: nextError,
    })
    .where(eq(automationRuns.id, runId));

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/runs/${runId}`);
  return { ok: true };
}

export async function rejectRun(runId: string): Promise<{ ok: true } | { error: string }> {
  try {
    await assertDashboardAuth();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const db = getDb();
  const [run] = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.id, runId))
    .limit(1);

  if (!run) {
    return { error: "Run not found" };
  }

  if (run.status !== "awaiting_approval") {
    return { error: `Run is not awaiting approval (status: ${run.status})` };
  }

  await db.insert(humanApprovals).values({
    runId,
    tenantId: run.tenantId,
    decision: "reject",
    actorUserId: null,
    payload: { source: "dashboard" },
  });

  await db
    .update(automationRuns)
    .set({
      status: "failed",
      error: "Rejected by operator",
      updatedAt: new Date(),
    })
    .where(eq(automationRuns.id, runId));

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/runs/${runId}`);
  return { ok: true };
}
