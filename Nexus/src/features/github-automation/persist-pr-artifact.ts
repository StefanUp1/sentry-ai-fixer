import { getDb } from "@/lib/db";
import { prArtifacts } from "@/lib/db/schema/automation";

export async function persistPrArtifact(opts: {
  tenantId: string;
  runId: string;
  branch: string;
  prNumber: number;
  prUrl: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(prArtifacts).values({
    tenantId: opts.tenantId,
    runId: opts.runId,
    branch: opts.branch,
    prNumber: opts.prNumber,
    prUrl: opts.prUrl,
    mergeStatus: "open",
  });
}
