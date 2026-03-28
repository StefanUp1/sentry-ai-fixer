import { Suspense } from "react";
import Link from "next/link";
import { getServerEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner searchParams={searchParams} />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="container">
      <h1>Nexus dashboard</h1>
      <p className="muted">Loading…</p>
      <p>
        <Link href="/">Home</Link>
      </p>
    </div>
  );
}

async function LoginPageInner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const env = getServerEnv();
  const configured = Boolean(env.NEXUS_DASHBOARD_SECRET?.trim());

  return (
    <div className="container">
      <h1>Nexus dashboard</h1>
      {!configured ? (
        <p className="login-warning">
          Set <code>NEXUS_DASHBOARD_SECRET</code> in the server environment to
          enable login.
        </p>
      ) : null}
      {sp.error === "config" ? (
        <p className="login-warning">
          Dashboard secret is not configured on the server.
        </p>
      ) : null}
      {configured ? <LoginForm /> : null}
      <p>
        <Link href="/">Home</Link>
      </p>
    </div>
  );
}
