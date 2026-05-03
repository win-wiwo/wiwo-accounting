# Phase 3c-2: Feature Page Typography Token Migration

**Date:** 2026-05-03
**Scope:** 11 list-style and dashboard feature page files
**Status:** Complete — awaiting review

---

## Migration Map

| New token | Size | Replaces |
|-----------|------|----------|
| `text-micro` | 10px | `text-[8px]`, `text-[9px]`, `text-[10px]` |
| `text-caption` | 11px | `text-[11px]` |
| `text-label` | 12px | `text-[12px]`, `text-xs` |
| `text-body` | 13px | `text-[13px]` |
| `text-body-lg` | 14px | `text-[14px]`, `text-[15px]`, `text-sm` |
| `text-heading-sm` | 16px | `text-[16px]`, `text-base`, `text-lg` |
| `text-heading` | 20px | `text-[20px]`, `text-2xl` |
| `text-display` | 28px | `text-[28px]`, `text-[32px]`, `text-4xl` |

## Files Modified (11)

| # | File | Key replacements |
|---|------|-----------------|
| 1 | `features/dashboard/dashboard-page.tsx` | text-[32px]->display, text-[28px]->display, text-[15px]->body-lg, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 2 | `features/purchase-requests/pr-list-page.tsx` | text-[28px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 3 | `features/purchase-orders/po-list-page.tsx` | text-[28px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 4 | `features/suppliers/suppliers-list-page.tsx` | text-[28px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 5 | `features/approvals/approvals-page.tsx` | text-[28px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 6 | `features/procurement/procurement-queue-page.tsx` | text-[28px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 7 | `features/reports/reports-page.tsx` | text-[15px]->body-lg, text-[12px]->label, text-[11px]->caption |
| 8 | `features/search/search-page.tsx` | text-[15px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 9 | `features/projects/projects-page.tsx` | text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-xs->label, text-sm->body-lg |
| 10 | `features/users/users-list-page.tsx` | text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 11 | `features/departments/departments-list-page.tsx` | text-[13px]->body, text-[12px]->label, text-[11px]->caption |

## Flagged Size Shifts

| Location | Old | New | Delta | Risk |
|----------|-----|-----|-------|------|
| Dashboard KPI card values | `text-[32px]` (32px) | `text-display` (28px) | -4px | KPI big numbers may look visibly smaller. Review in screenshot. |
| Dashboard card titles, Reports titles | `text-[15px]` (15px) | `text-body-lg` (14px) | -1px | Minimal — unlikely noticeable. |

## Excluded (deferred to Phase 3c-3)

- `features/purchase-requests/pr-detail-page.tsx`
- `features/purchase-requests/pr-approval-modal.tsx`
- `features/purchase-requests/form/*`
- `features/procurement/workspace/*`
- `features/purchase-orders/po-detail-page.tsx`
- `features/purchase-orders/po-form-page.tsx`
- `features/auth/login-page.tsx`
- `features/profile/*`
- `features/settings/*`

## Verification

### Grep (per-file)

All 11 target files verified: **zero** remaining `text-[Npx]` arbitrary typography values and **zero** remaining legacy Tailwind classes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-4xl`).

Remaining old patterns exist only in excluded files (pr-detail-page, pr-approval-modal, login-page) — correctly deferred.

### TypeScript

10 pre-existing TS errors (calendar, date-picker, toast, workspace, po-detail, po-form, contextual-panels, seller-references, step-items, use-pr-form). **Zero new errors** introduced by this migration.

### Build

Build fails due to pre-existing TS errors (same as before migration). No new issues.

## Visual QA Screenshots

Captured to `audit/smoke/3c2-after/` at 1440x900 desktop viewport:

| Screenshot | Role | Page |
|-----------|------|------|
| `dashboard-procurement.png` | Procurement | Dashboard |
| `dashboard-admin.png` | Admin | Dashboard |
| `purchase-requests.png` | Procurement | PR List |
| `procurement-queue.png` | Procurement | Procurement Queue |
| `suppliers.png` | Procurement | Suppliers List |
| `purchase-orders.png` | Procurement | PO List |
| `search.png` | Procurement | Search & Monitor |
| `reports.png` | Procurement | Reports |
| `projects.png` | Admin | Projects |
| `users.png` | Admin | Users List |
| `departments.png` | Admin | Departments List |
| `approvals-coo.png` | COO | Approval Queue |

All pages render correctly with consistent typography. No visual regressions observed.
