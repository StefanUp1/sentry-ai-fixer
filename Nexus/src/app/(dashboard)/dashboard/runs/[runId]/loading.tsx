import Link from "next/link";

export default function RunDetailLoading() {
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
