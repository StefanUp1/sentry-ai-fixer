import { pgEnum } from "drizzle-orm/pg-core";

export const tenantRoleEnum = pgEnum("tenant_role", [
  "owner",
  "admin",
  "member",
]);

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "queued",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
]);

export const humanApprovalDecisionEnum = pgEnum("human_approval_decision", [
  "approve",
  "reject",
]);
