# Nexus — Implementation plan & phases

This document is the **living roadmap** for Nexus. Update **Status** and **Notes** as work completes. Detailed technical design lives in [`spec.md`](spec.md).

---

## How to use

| Column | Meaning |
|--------|---------|
| **Status** | `Planned` → `In progress` → `Done` (or `Blocked` with note) |
| **Deliverables** | What must exist before the phase is marked Done |
| **Notes** | Decisions, links to PRs, deferrals |

---

## Phase summary

| Phase | Name | Status | Spec reference |
|-------|------|--------|----------------|
| **1** | Architecture, schema, Docker, MCP | **Done** | [`spec.md`](spec.md) (full) |
| **2** | App foundation (Bun + Next.js 15, tooling) | **Done** | §2 directory, §8 Sentry shell |
| **3** | Database (Drizzle) + multi-tenant core | **Done** | §3 |
| **4** | Sentry listener (webhook → persist → enqueue) | **Done** | §5 webhooks, §4 graph ingress |
| **5** | LangGraph + Ollama (diagnose / plan) | **Done** | §4 |
| **6** | GitHub automation (branch / PR via MCP or API) | **Done** | §4 nodes, §7 runtime MCP |
| **7** | Dashboard + Vercel AI SDK (Generative UI, approve / merge) | **Done** | §5 routes, project goals |
| **8** | Slack Bolt (Socket Mode) + notifications | Planned | Stack + §5 |
| **9** | Hardening, E2E, production paths | Planned | §6 Docker / Neon / Supabase |

---

## Phase 1 — Architecture & baseline (Done)

**Goal:** Lock stack, document schema/graph/routes, local infra skeleton.

**Deliverables:**

- [x] [`spec.md`](spec.md) — Drizzle-oriented schema, LangGraph nodes/state, API table, directory tree
- [x] [`docker-compose.yml`](docker-compose.yml) — Postgres, NGINX → Ollama proxy, optional `app` profile
- [x] [`docker/nginx/`](docker/nginx/) — Basic Auth proxy config + htpasswd instructions
- [x] [`.cursor/mcp.json`](.cursor/mcp.json) — Sentry (remote OAuth), GitHub, Filesystem MCP for development
- [x] [`.env.example`](.env.example), [`.gitignore`](.gitignore)

**Notes:** Application source and `package.json` intentionally deferred. `Dockerfile` is a placeholder until Phase 2.

---

## Phase 2 — App foundation

**Goal:** Runnable Next.js 15 app on **Bun** with App Router, Server Actions, **PPR** enabled, and repo layout aligned to [`spec.md`](spec.md) §2.

**Deliverables:**

- [x] `package.json`; scripts: `dev`, `build`, `start`, `lint`, `db:*` (lockfile pending local Bun install)
- [x] `next.config.ts` with PPR via `cacheComponents: true` (replaces `experimental.ppr` in current Next.js)
- [x] `tsconfig.json`, `src/app` skeleton (`layout`, root `page`, `api/health`)
- [x] Sentry Next.js SDK wiring (`instrumentation.ts`, client config) — DSN via env
- [x] Replace placeholder [`Dockerfile`](Dockerfile) for production-style build when ready

**Notes:** No business logic beyond health check and Sentry smoke test.

---

## Phase 3 — Database & multi-tenancy

**Goal:** Drizzle schema matching [`spec.md`](spec.md) §3; migrations; `tenant_id` on all tenant-scoped tables.

**Deliverables:**

- [x] `drizzle.config.ts`, `src/lib/db/schema/*`, `src/lib/db/index.ts`
- [x] Initial migration + optional seed (single dev tenant) — run `db:generate` / `db:migrate` / `db:seed` locally
- [x] Env-validated `DATABASE_URL` ([`.env.example`](.env.example) updated)

**Notes:** Target local Postgres from Compose; production → Neon/Supabase via `DATABASE_URL` only.

---

## Phase 4 — Sentry listener

**Goal:** Ingest Sentry events, normalize payload, write `sentry_events` + `automation_runs`, trigger async work (queue or worker).

**Deliverables:**

- [x] `POST /api/webhooks/sentry` — HMAC (`Sentry-Hook-Signature`, raw body), tenant by `NEXUS_WEBHOOK_TENANT_SLUG` (default `dev`)
- [x] Idempotency — upsert `sentry_events` on `(tenant_id, sentry_issue_id)`; new `automation_runs` row per accepted delivery
- [x] `enqueueAutomationRun` — schedules LangGraph in-process (Phase 5+); replace with real queue/worker when scaling

**Notes:** `SENTRY_WEBHOOK_SKIP_VERIFY=true` for local curl only. Supports `Sentry-Hook-Resource`: `issue`, `event_alert`; ignores `installation` and others without issue payload.

---

## Phase 5 — LangGraph + Ollama

**Goal:** Implement graph from [`spec.md`](spec.md) §4: context → **Ollama** diagnose → structured fix plan; Postgres checkpointer; `run_steps` audit.

**Deliverables:**

- [x] `src/features/langgraph/state.ts`, `graph.ts`, `nodes/*`
- [x] `src/lib/ollama.ts` — calls **NGINX**-protected Ollama URL (`OLLAMA_URL` from env)
- [x] Batch inference (`/api/chat`, `stream: false`) in graph nodes

**Notes:** Human gate can be a stub boolean until Phase 7.

---

## Phase 6 — GitHub automation

**Goal:** From graph tools, create branch and open PR (runtime MCP client and/or GitHub REST); persist `pr_artifacts`.

**Deliverables:**

- [x] **Octokit** (`octokit` package) + env `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` (per-tenant `integration_github` deferred)
- [x] Nodes `mcp_github_prepare` (branch + `.nexus/runs/<runId>.md`), `mcp_github_pr` (open PR + `pr_artifacts` row)
- [x] Graph state: `branch_name`, `pr_url`, `pr_number`; DB: `pr_artifacts` (`merge_status` = `open`)

**Notes:** Cursor MCP is dev-only; production path is in-app credentials per tenant ([`spec.md`](spec.md) §3.2).

---

## Phase 7 — Dashboard & Generative UI

**Goal:** Operator UI with Vercel AI SDK streaming; **Approve & merge** drives `human_approvals` and resumes graph / calls merge API.

**Deliverables:**

- [x] `src/app/(dashboard)/dashboard/*` — run list + run detail; `/login` with `NEXUS_DASHBOARD_SECRET` (signed cookie session)
- [x] `GET /api/runs/[runId]` (JSON), `GET /api/runs/[runId]/stream` (AI SDK `streamText` + Ollama; static fallback without `OLLAMA_URL`); `approveRun` / `rejectRun` Server Actions
- [x] Merge path after approval — Octokit `pulls.merge` + `pr_artifacts.merge_status` ([`merge-pull-request.ts`](src/features/github-automation/merge-pull-request.ts))

**Notes:** Auth is env password + httpOnly cookie (not full IdP). Tenant scoping uses `NEXUS_WEBHOOK_TENANT_SLUG` for API/queries. LangGraph **resume** after interrupt is still Phase 7+ refinement; merge runs outside the graph when the operator approves.

---

## Phase 8 — Slack (Bolt, Socket Mode)

**Goal:** Optional notifications and slash-command or thread updates tied to `automation_runs`.

**Deliverables:**

- [ ] Bolt app config, Socket Mode worker entry (`src/workers/slack-socket.ts` or equivalent)
- [ ] Secure storage for `integration_slack` ([`spec.md`](spec.md) §3.2)
- [ ] Link Slack thread ↔ run in DB if required

---

## Phase 9 — Hardening & release readiness

**Goal:** E2E with fake Sentry payload, rate limits, secret rotation story, deploy docs.

**Deliverables:**

- [ ] E2E or integration test checklist from [`spec.md`](spec.md) §9
- [ ] Production Docker/Compose overrides or platform-specific doc (Neon, Vercel, etc.)
- [ ] Review multi-tenant isolation (queries, webhooks, GitHub tokens)

---

## Project goals (traceability)

| Original goal | Phases |
|---------------|--------|
| Sentry listener → LangGraph | 4, 5 |
| Ollama diagnosis | 5 |
| GitHub branch / PR (MCP) | 6 |
| Generative UI — approve / merge | 7 |
| Multi-tenancy (`tenant_id`) | 3 (schema), all phases (enforcement) |

---

## Changelog

| Date | Change |
|------|--------|
| 2025-03-22 | Initial plan: Phases 1–9 defined; Phase 1 marked Done. |
| 2026-03-23 | Phase 2 scaffold added: Next.js app skeleton, Sentry config files, Bun scripts, Dockerfile replaced; Bun lockfile deferred until Bun is installed locally. |
| 2026-03-25 | Phases 3–4: Drizzle schema/migrations/seed path; `POST /api/webhooks/sentry` + feature module (`verify`, `normalize`, `persist`, queue stub). |
| 2026-03-26 | Phases 5–6: LangGraph + Ollama + Postgres checkpointer; Octokit branch/PR nodes + `pr_artifacts`. |
| 2026-03-26 | Phase 7: Dashboard (`/login`, `/dashboard`), run APIs, AI stream route, approve/reject + GitHub merge. |

---

*Maintainers: keep this file in sync with [`spec.md`](spec.md) when the architecture changes.*
