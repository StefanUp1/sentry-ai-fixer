import { cookies } from "next/headers";
import {
  DASHBOARD_COOKIE,
  verifyDashboardSession,
} from "@/lib/auth/dashboard-session";
import { getServerEnv } from "@/lib/env";

export async function assertDashboardApiAuth(): Promise<
  { ok: true } | { ok: false; status: number; message: string }
> {
  const env = getServerEnv();
  const secret = env.NEXUS_DASHBOARD_SECRET?.trim();
  if (!secret) {
    return { ok: false, status: 503, message: "Dashboard not configured" };
  }
  const jar = await cookies();
  const raw = jar.get(DASHBOARD_COOKIE)?.value;
  if (!raw || !verifyDashboardSession(raw, secret)) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  return { ok: true };
}
