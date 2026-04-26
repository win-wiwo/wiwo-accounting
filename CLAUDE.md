# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PRAMS** (Purchase Request and Approval Management System) — an internal company web application that digitizes purchase request filing, multi-level approval, monitoring, and reporting. Replaces manual Excel/paper forms.

## Tech Stack

- **Monorepo**: Turborepo + npm workspaces
- **Backend**: NestJS (TypeScript) — `apps/api/`
- **Frontend**: React + Vite (TypeScript) — `apps/web/`
- **Database**: MongoDB with Mongoose ODM
- **Shared**: Types, constants, Zod validation schemas — `packages/shared/`
- **Deployment**: Docker Compose on local company server with Nginx reverse proxy

## Commands

```bash
# Development
docker compose up                          # Start all services (API, web, MongoDB)
npm run dev --workspace=apps/api           # API only with hot-reload
npm run dev --workspace=apps/web           # Frontend only with HMR
npx turbo dev                              # All packages in parallel

# Build
npx turbo build                            # Build all packages
npx turbo build --filter=api               # Build API only
npx turbo build --filter=web               # Build web only

# Test
npx turbo test                             # Run all tests
npm test --workspace=apps/api              # Backend tests (Jest)
npm test --workspace=apps/web              # Frontend tests (Vitest)
npm run test:e2e --workspace=apps/api      # E2E tests (Supertest)
npx playwright test                        # E2E browser tests

# Lint
npx turbo lint                             # Lint all packages
npm run lint --workspace=apps/api
npm run lint --workspace=apps/web

# Production deployment (local server)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Architecture

### Backend Module Pattern (NestJS)

Each business domain follows: **Controller → Service → Repository → Mongoose Model**. Modules are in `apps/api/src/modules/`. Cross-cutting concerns live in `apps/api/src/common/` (guards, interceptors, pipes, filters, decorators).

### Key Modules

| Module | Purpose |
|--------|---------|
| `auth` | JWT login/logout/refresh, bcrypt password hashing |
| `users` | User CRUD, role assignment (admin only) |
| `departments` | Department CRUD, employee assignment, head designation (admin only) |
| `purchase-requests` | PR creation, line items (embedded), attachments, draft/submit |
| `approvals` | Multi-level workflow engine, status transitions |
| `notifications` | In-app notifications via EventEmitter2 |
| `reports` | Excel (ExcelJS) and PDF (PDFKit) generation |
| `audit` | Immutable audit log for all write operations |
| `pr-numbering` | Atomic auto-increment PR number generation |

### Approval Workflow State Machine

**Approve First, Procure After** — all PRs go through approval before procurement acts.

```
Staff PR (no procurement items):
  DRAFT → LEVEL1_REVIEW (Dept Head) → LEVEL2_REVIEW (COO) → LEVEL3_REVIEW (CEO) → APPROVED

Staff PR (with procurement items):
  DRAFT → LEVEL1_REVIEW → LEVEL2_REVIEW → LEVEL3_REVIEW
    → PENDING_QUOTATION (Procurement sources suppliers on an approved need)
    → QUOTED (COO price sign-off on supplier selection)
    → APPROVED

Dept Head PR (with procurement items):
  DRAFT → LEVEL2_REVIEW (skip L1) → LEVEL3_REVIEW
    → PENDING_QUOTATION → QUOTED → APPROVED

Any level can REJECT (terminal) or RETURN → DRAFT (requester revises).
RETURN from QUOTED → PENDING_QUOTATION (procurement revises, not back to DRAFT).
RETURNED_FOR_INFO: procurement returns PR to requester for clarification during canvassing.
```

Key design: management approves the *need* first. Procurement only sources items that are already approved, so no wasted effort on rejected requests. COO does final price sign-off for all procurement PRs.

Events are emitted via NestJS EventEmitter2; `NotificationsService` and `AuditService` listen and react.

### Roles and Permissions

Roles: `staff`, `dept_head`, `coo`, `ceo`, `procurement`, `admin`. Enforced via `@Roles()` decorator + `RolesGuard` on backend. Frontend uses `RoleRoute` for route guards and `usePermission()` hook — but **backend is the source of truth for authorization**.

Key restrictions:
- Only `admin` can manage users, departments, and PR numbering config
- Only `dept_head` approves Level 1, `coo` Level 2 + QUOTED price sign-off, `ceo` Level 3
- Only `procurement` can submit quotations and manage canvass entries
- Approvers cannot approve their own PRs
- `admin` role cannot create PRs

### Frontend State Management

- **React Query (TanStack Query)**: All server state (PRs, users, departments, dashboard stats)
- **Zustand**: Client-only state (auth tokens in memory, UI preferences, sidebar state)
- **React Hook Form + Zod**: Form state with validation schemas from `packages/shared`

### API Response Envelope

All endpoints return: `{ success: boolean, data: T | null, message: string, meta?: { total, page, limit, totalPages } }`. Applied globally via `TransformInterceptor`.

### MongoDB Collections

- `users` — with `departmentId` reference
- `departments` — with `headId` reference to users
- `purchase-requests` — **embeds** `items[]` and `attachments[]` (always loaded together)
- `approvals` — **separate collection** (queried independently for dashboards/reports)
- `notifications` — per-user, with TTL index (90 days)
- `audit-logs` — immutable, TTL index (365 days)
- `pr-number-sequences` — atomic counter per department+year

### Authentication

JWT with refresh token rotation. Access token: 15min, refresh: 7 days. Refresh tokens are bcrypt-hashed in the user document. Frontend Axios interceptor auto-refreshes on 401.

### Deployment

Docker Compose on a local company server. Nginx serves the React SPA and proxies `/api/` to the NestJS container. MongoDB runs as a replica set (required for transactions). A `mongo-backup` container runs daily automated backups with 30-day retention.

## Documentation

- `docs/prd/PRD.md` — Product Requirements Document (106 FRs, 29 NFRs, 50 user stories)
- `docs/architecture/ARCHITECTURE.md` — Full system design, schemas, API spec, deployment
- `docs/PRODUCT_BACKLOG.md` — 60 user stories across 10 epics with MoSCoW priorities
- `docs/sprints/SPRINT_1.md` — Sprint 1 plan (auth, users, departments, RBAC)
