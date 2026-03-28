import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (postgresql:// or postgres://)"),
  /** Sentry Internal Integration — Client Secret (webhook HMAC). */
  SENTRY_WEBHOOK_CLIENT_SECRET: z.string().optional(),
  /** Tenant slug to attach webhook deliveries to (seed default: dev). */
  NEXUS_WEBHOOK_TENANT_SLUG: z.string().min(1).optional().default("dev"),
  /**
   * Ollama base URL (e.g. http://user:pass@127.0.0.1:11435 via docker/nginx).
   * Optional: graph uses stub diagnosis/plan when unset.
   */
  OLLAMA_URL: z.string().min(1).optional(),
  /** Ollama model name for /api/chat. */
  OLLAMA_MODEL: z.string().default("llama3.2"),
  /**
   * GitHub REST (Phase 6). Fine-grained PAT or classic PAT with `contents` + `pull_requests`.
   * Together with GITHUB_OWNER + GITHUB_REPO enables branch + PR automation.
   */
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  /** Shared secret for dashboard login (POST `/api/auth/login`). Min 8 chars in production. */
  NEXUS_DASHBOARD_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/** Validated server-side env. Call from server code and scripts only. */
export function getServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}
