import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";
import {
  automationRunStatusEnum,
  humanApprovalDecisionEnum,
} from "./enums";

export const sentryEvents = pgTable(
  "sentry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sentryIssueId: text("sentry_issue_id").notNull(),
    fingerprint: text("fingerprint"),
    title: text("title"),
    culprit: text("culprit"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sentry_events_tenant_issue_uidx").on(
      t.tenantId,
      t.sentryIssueId,
    ),
    index("sentry_events_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: automationRunStatusEnum("status").notNull().default("queued"),
    sentryEventId: uuid("sentry_event_id").references(() => sentryEvents.id, {
      onDelete: "set null",
    }),
    graphCheckpointId: text("graph_checkpoint_id"),
    summary: text("summary"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("automation_runs_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

export const runSteps = pgTable("run_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  nodeName: text("node_name").notNull(),
  inputRef: jsonb("input_ref").$type<Record<string, unknown>>(),
  outputRef: jsonb("output_ref").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const prArtifacts = pgTable("pr_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  branch: text("branch").notNull(),
  prNumber: integer("pr_number"),
  prUrl: text("pr_url"),
  mergeStatus: text("merge_status"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const humanApprovals = pgTable("human_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  decision: humanApprovalDecisionEnum("decision").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
