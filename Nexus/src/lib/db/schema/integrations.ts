import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

export const integrationSentry = pgTable(
  "integration_sentry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orgSlug: text("org_slug").notNull(),
    authTokenRef: text("auth_token_ref"),
    webhookSecretHash: text("webhook_secret_hash"),
    projectAllowlist: jsonb("project_allowlist")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("integration_sentry_tenant_uidx").on(t.tenantId)],
);

export const integrationSlack = pgTable(
  "integration_slack",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    teamId: text("team_id").notNull(),
    botTokenRef: text("bot_token_ref"),
    appId: text("app_id"),
    signingSecretHash: text("signing_secret_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("integration_slack_tenant_uidx").on(t.tenantId)],
);

export const integrationGithub = pgTable(
  "integration_github",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    installationId: text("installation_id"),
    patRef: text("pat_ref"),
    defaultRepo: text("default_repo"),
    org: text("org"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("integration_github_tenant_uidx").on(t.tenantId)],
);
