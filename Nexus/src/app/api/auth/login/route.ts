import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  DASHBOARD_COOKIE,
  signDashboardSession,
} from "@/lib/auth/dashboard-session";
import { getServerEnv } from "@/lib/env";

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export async function POST(request: Request) {
  const env = getServerEnv();
  const secret = env.NEXUS_DASHBOARD_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "NEXUS_DASHBOARD_SECRET is not configured" },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!safeEqualString(password, secret)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signDashboardSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DASHBOARD_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
