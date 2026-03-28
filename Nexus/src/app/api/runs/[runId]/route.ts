import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDashboardApiAuth } from "@/lib/dashboard/api-auth";
import { getRunDetail } from "@/lib/dashboard/queries";
import { getServerEnv } from "@/lib/env";

const paramsSchema = z.object({
  runId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const auth = await assertDashboardApiAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.status },
    );
  }

  const raw = await context.params;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const env = getServerEnv();
  const detail = await getRunDetail(parsed.data.runId, env.NEXUS_WEBHOOK_TENANT_SLUG);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
