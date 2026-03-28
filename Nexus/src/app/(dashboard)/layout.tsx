import { Suspense } from "react";
import Link from "next/link";
import { requireDashboardSession } from "@/lib/auth/dashboard-session";
import { logoutDashboard } from "./actions";

export default function DashboardGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardAuthShell>{children}</DashboardAuthShell>
    </Suspense>
  );
}

function DashboardLayoutFallback() {
  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <span className="dashboard-brand">Nexus</span>
      </header>
      <main className="dashboard-main">
        <p className="muted">Loading…</p>
      </main>
    </div>
  );
}

function DashboardPageFallback() {
  return (
    <div className="dashboard-page">
      <p className="muted">Loading…</p>
    </div>
  );
}

async function DashboardAuthShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDashboardSession();

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link href="/dashboard" className="dashboard-brand">
          Nexus
        </Link>
        <nav className="dashboard-nav">
          <Link href="/dashboard">Runs</Link>
          <form action={logoutDashboard}>
            <button type="submit" className="dashboard-logout">
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="dashboard-main">
        <Suspense fallback={<DashboardPageFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
