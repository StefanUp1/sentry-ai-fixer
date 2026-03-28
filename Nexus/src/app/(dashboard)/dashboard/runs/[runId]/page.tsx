import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getRunDetail } from "@/lib/dashboard/queries";
import { getServerEnv } from "@/lib/env";
import { RunActions } from "@/features/generative-ui/run-actions";
import { RunStreamPanel } from "@/features/generative-ui/run-stream-panel";

export default function DashboardRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  return (
    <Suspense fallback={<RunDetailFallback />}>
      <DashboardRunDetailInner params={params} />
    </Suspense>
  );
}

function RunDetailFallback() {
  return (
    <div className="dashboard-page">
      <p>
        <Link href="/dashboard">← Runs</Link>
      </p>
      <h1>Run</h1>
      <p className="muted">Loading…</p>
    </div>
  );
}

async function DashboardRunDetailInner({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await connection();
  const { runId } = await params;
  const env = getServerEnv();
  const detail = await getRunDetail(runId, env.NEXUS_WEBHOOK_TENANT_SLUG);
  if (!detail) {
    notFound();
  }

  const { run, sentryEvent, pr } = detail;
  const awaiting = run.status === "awaiting_approval";

  return (
    <div className="dashboard-page">
      <p>
        <Link href="/dashboard">← Runs</Link>
      </p>
      <h1>Run {run.id}</h1>
      <p>
        <span className={`run-status run-status--${run.status}`}>
          {run.status}
        </span>
      </p>

      <section className="run-section">
        <h2>Summary</h2>
        <pre className="run-pre">{run.summary ?? "—"}</pre>
      </section>

      <section className="run-section">
        <h2>Error</h2>
        <pre className="run-pre">{run.error ?? "—"}</pre>
      </section>

      <section className="run-section">
        <h2>Sentry</h2>
        {sentryEvent ? (
          <ul>
            <li>Issue: {sentryEvent.sentryIssueId}</li>
            <li>Title: {sentryEvent.title ?? "—"}</li>
            <li>Culprit: {sentryEvent.culprit ?? "—"}</li>
          </ul>
        ) : (
          <p>—</p>
        )}
      </section>

      <section className="run-section">
        <h2>Pull request</h2>
        {pr?.prUrl ? (
          <p>
            <a href={pr.prUrl} target="_blank" rel="noreferrer">
              #{pr.prNumber} — {pr.prUrl}
            </a>
            {pr.mergeStatus ? (
              <span className="muted"> ({pr.mergeStatus})</span>
            ) : null}
          </p>
        ) : (
          <p>—</p>
        )}
      </section>

      <section className="run-section">
        <h2>Actions</h2>
        <RunActions runId={run.id} canAct={awaiting} />
      </section>

      <section className="run-section">
        <h2>AI stream (Ollama)</h2>
        <p className="muted">
          Streams from <code>/api/runs/…/stream</code>. Without{" "}
          <code>OLLAMA_URL</code>, returns a static summary.
        </p>
        <RunStreamPanel runId={run.id} />
      </section>
    </div>
  );
}
