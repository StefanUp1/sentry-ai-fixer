"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DASHBOARD_COOKIE } from "@/lib/auth/dashboard-session";

export async function logoutDashboard() {
  (await cookies()).delete(DASHBOARD_COOKIE);
  redirect("/login");
}
