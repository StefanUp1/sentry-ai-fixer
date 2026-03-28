import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { listRunsForTenantSlug } from "@/lib/dashboard/queries";
import { getServerEnv } from "@/lib/env";

export default function DashboardRunsPage() {
  return (
    <Suspense fallback={<ListFallback />}>
      <DashboardRunsInner />
    </Suspense>
  );
}

function ListFallback() {
  return (
    <div className="dashboard-page">
      <h1>Automation runs</h1>
      <p className="muted">Loading…</p>
    </div>
  );
}

async function DashboardRunsInner() {
  await connection();
  const env = getServerEnv();
  const runs = await listRunsForTenantSlug(env.NEXUS_WEBHOOK_TENANT_SLUG);

  return (
    <div className="dashboard-page">
      <h1>Automation runs</h1>
      <p className="muted">
        Tenant slug: <code>{env.NEXUS_WEBHOOK_TENANT_SLUG}</code>
      </p>
      {runs.length === 0 ? (
        <p>No runs yet. Trigger the Sentry webhook to create one.</p>
      ) : (
        <ul className="run-list">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/dashboard/runs/${r.id}`} className="run-link">
                <span className={`run-status run-status--${r.status}`}>
                  {r.status}
                </span>
                <span className="run-id">{r.id.slice(0, 8)}…</span>
                <span className="muted">
                  {r.createdAt.toISOString().slice(0, 19)}Z
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
