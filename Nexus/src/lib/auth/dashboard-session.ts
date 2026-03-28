import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";

export const DASHBOARD_COOKIE = "nexus_dashboard";

const SESSION_DAYS = 7;

function signPayload(payload: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function signDashboardSession(secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return signPayload(payload, secret);
}

/** Exported for API routes that read the cookie without `redirect`. */
export function verifyDashboardSession(value: string, secret: string): boolean {
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) {
    return false;
  }
  const payload = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig.length !== expected.length) {
    return false;
  }
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    const { exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp: number };
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function getDashboardSession(): Promise<boolean> {
  const env = getServerEnv();
  const secret = env.NEXUS_DASHBOARD_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const jar = await cookies();
  const raw = jar.get(DASHBOARD_COOKIE)?.value;
  if (!raw) {
    return false;
  }
  return verifyDashboardSession(raw, secret);
}

export async function requireDashboardSession(): Promise<void> {
  const env = getServerEnv();
  if (!env.NEXUS_DASHBOARD_SECRET?.trim()) {
    redirect("/login?error=config");
  }
  const ok = await getDashboardSession();
  if (!ok) {
    redirect("/login");
  }
}
