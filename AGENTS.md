# PRAMS — Agent Instructions

This file is the entry point for any AI agent (Claude Code, Codex, Cursor, etc.) working on this repository. Read it fully before making any changes.

## Project Overview

**PRAMS** (Purchase Request and Approval Management System) — an internal company web app that digitizes purchase request filing, multi-level approval, monitoring, and reporting.

## Full Reference Documentation

Before writing any code, read these files:

| Document | What it covers |
|----------|---------------|
| [`docs/AGENT_GUIDE.md`](docs/AGENT_GUIDE.md) | Full architecture reference, coding rules, known failure modes, and debugging checklist for this codebase |
| [`CLAUDE.md`](CLAUDE.md) | Project overview, tech stack, commands, and module map |

## Skill Playbooks

These are step-by-step procedures for common tasks. Use the one that matches your situation instead of reasoning from scratch.

| Situation | Playbook |
|-----------|----------|
| Page is completely blank — no sidebar, no header | [`docs/skills/debug-blank-page.md`](docs/skills/debug-blank-page.md) |
| API returns connection refused or connection reset | [`docs/skills/debug-api-down.md`](docs/skills/debug-api-down.md) |
| Adding a new domain entity (backend + frontend) | [`docs/skills/add-module.md`](docs/skills/add-module.md) |
| Data is wrong, missing, or shaped unexpectedly | [`docs/skills/data-flow-trace.md`](docs/skills/data-flow-trace.md) |
| Adding/removing/renaming a Mongoose schema field | [`docs/skills/schema-change.md`](docs/skills/schema-change.md) |

## Stack at a Glance

- **Backend:** NestJS + TypeScript + Mongoose — `apps/api/`
- **Frontend:** React + Vite + TanStack Query — `apps/web/`
- **Shared types:** `packages/shared/` — imported by both sides
- **Database:** MongoDB (replica set required for transactions)
- **Dev runtime:** Docker Compose — `docker compose up`

## Five Things That Will Break the App If You Get Them Wrong

1. **`SelectItem value=""`** — Radix UI v2 throws a silent runtime error that blanks the entire page. Use a named sentinel like `value="all"` instead.

2. **TypeScript compile error = API won't start** — `nest start --watch` won't serve any requests until the error is fixed. Always check `docker logs prams-api` first when the API is down.

3. **`@Prop()` decorator is required for Mongoose persistence** — a TypeScript class field on a schema document without `@Prop()` is invisible to MongoDB. The field will always be `undefined` at runtime even though TypeScript accepts it.

4. **Register every new module in `app.module.ts`** — forgetting this means the module simply doesn't exist at runtime. No error is thrown.

5. **`PurchaseRequest` has `projectId` (ObjectId ref), not `projectName` (string)** — accessing `purchaseRequest.projectName` compiles but always returns `undefined`, and will cause a TypeScript error in strict mode.

## Development Commands

```bash
docker compose up                    # start everything (API, web, MongoDB)
docker logs prams-api --tail 50      # check for TypeScript compile errors
docker logs prams-web --tail 20      # check for Vite build errors
curl http://localhost:3000/api/projects  # smoke-test the API
```

## Response Envelope (never break this)

Every API response from this backend is shaped as:
```json
{ "success": true, "data": <payload>, "message": "Success", "meta": { ... } }
```
Frontend always accesses `.data` to get the payload, `.meta` for pagination.
