---
name: prams-agent
description: Use when working in the PRAMS monorepo. Loads the repo-specific rules, architecture, debugging playbooks, and known failure modes before making changes.
---

# PRAMS Agent

Use this skill for any coding task in the PRAMS repository.

## Start Here

Read these references before editing:

- `references/AGENTS.md` for repo rules and available playbooks
- `references/AGENT_GUIDE.md` for architecture, response envelope rules, module patterns, and failure modes
- `references/CLAUDE.md` for stack, commands, and module map

## Working Rules

- Treat `packages/shared` as the contract between API and frontend.
- Preserve the API response envelope: `{ success, data, message, meta? }`.
- Register every new backend module in `apps/api/src/app.module.ts`.
- Mongoose persistence requires `@Prop()` on every stored schema field.
- `PurchaseRequest` uses `projectId`, not `projectName`.
- In the frontend, never use `SelectItem value=""`; use a named sentinel such as `all`.

## Playbook Selection

Use the matching reference when the problem fits:

- Blank page in the web app: `references/debug-blank-page.md`
- API not responding: `references/debug-api-down.md`
- New domain entity: `references/add-module.md`
- Wrong or missing data: `references/data-flow-trace.md`
- Mongoose field changes: `references/schema-change.md`

## Commands

Default checks:

```bash
docker logs prams-api --tail 50
docker logs prams-web --tail 20
curl http://localhost:3000/api/projects
```
