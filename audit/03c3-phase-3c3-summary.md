# Phase 3c-3: Final Typography Token Migration

**Date:** 2026-05-03
**Scope:** All remaining feature files — detail pages, form pages, modals, workspace, auth, profile, settings, error pages (~21 files)
**Status:** Complete — awaiting review
**Verdict:** Migration Complete

---

## Migration Map

| New token | Size | Replaces |
|-----------|------|----------|
| `text-micro` | 10px | `text-[8px]`, `text-[9px]`, `text-[10px]` |
| `text-caption` | 11px | `text-[11px]`, `text-[11.5px]` |
| `text-label` | 12px | `text-[12px]`, `text-[12.5px]`, `text-xs` |
| `text-body` | 13px | `text-[13px]` |
| `text-body-lg` | 14px | `text-[13.5px]`, `text-[14px]`, `text-[15px]`, `text-sm` |
| `text-heading-sm` | 16px | `text-[16px]`, `text-[17px]`, `text-[18px]`, `text-base`, `text-lg` |
| `text-heading` | 20px | `text-[20px]`, `text-[22px]`, `text-2xl` |
| `text-display` | 28px | `text-[24px]`, `text-[26px]`, `text-[28px]`, `text-[34px]`, `text-4xl` |

## Files Modified (21)

| # | File | Key replacements |
|---|------|-----------------|
| 1 | `features/auth/login-page.tsx` | text-[34px]->display, text-[28px]->display, text-[26px]->display, text-2xl->heading, text-lg->heading-sm, text-sm->body-lg, text-base->heading-sm, text-[13.5px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 2 | `features/departments/department-detail-page.tsx` | text-[20px]->heading, text-[15px]->body-lg, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 3 | `features/profile/profile-page.tsx` | text-[20px]->heading, text-[16px]->heading-sm, text-[15px]->body-lg, text-[13px]->body, text-[12.5px]->label, text-[12px]->label, text-[11px]->caption |
| 4 | `features/settings/settings-page.tsx` | text-[24px]->display, text-[15px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 5 | `features/suppliers/supplier-form-page.tsx` | text-[15px]->body-lg |
| 6 | `features/suppliers/supplier-detail-page.tsx` | text-[15px]->body-lg, text-[13px]->body, text-[11px]->caption, text-[10px]->micro |
| 7 | `routes/error-pages.tsx` | text-4xl->display, text-lg->heading-sm |
| 8 | `features/purchase-requests/pr-detail-page.tsx` | text-[22px]->heading, text-[18px]->heading-sm, text-[16px]->heading-sm, text-[15px]->body-lg, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro, text-xs->label, text-sm->body-lg, text-base->heading-sm |
| 9 | `features/procurement/workspace/procurement-workspace-page.tsx` | text-[26px]->display, text-[20px]->heading, text-[16px]->heading-sm, text-[15px]->body-lg, text-[14px]->body-lg, text-[13px]->body, text-[12.5px]->label, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 10 | `features/approvals/pr-approval-modal.tsx` | text-[17px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12.5px]->label, text-[12px]->label, text-[11px]->caption, text-[10px]->micro, text-[9px]->micro |
| 11 | `features/procurement/workspace/canvass-matrix.tsx` | text-[15px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro, text-[9px]->micro |
| 12 | `features/purchase-orders/po-detail-page.tsx` | text-[24px]->display, text-[16px]->heading-sm, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11.5px]->caption, text-[11px]->caption, text-[10px]->micro |
| 13 | `features/purchase-orders/po-form-page.tsx` | text-[15px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 14 | `features/purchase-requests/form/step-basics.tsx` | text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 15 | `features/purchase-requests/form/step-items.tsx` | text-[15px]->body-lg, text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro, text-[9px]->micro |
| 16 | `features/purchase-requests/form/step-review.tsx` | text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 17 | `features/purchase-requests/form/guided-stepper.tsx` | text-[13px]->body, text-[12px]->label |
| 18 | `features/purchase-requests/form/seller-references-section.tsx` | text-[14px]->body-lg, text-[13px]->body, text-[12px]->label, text-[11px]->caption, text-[10px]->micro |
| 19 | `features/purchase-requests/form/contextual-panels.tsx` | text-[13px]->body, text-[12px]->label, text-[11px]->caption |
| 20 | `features/purchase-requests/form/item-photo-widget.tsx` | text-[12px]->label, text-[11px]->caption |
| 21 | `features/purchase-requests/pr-form-page.tsx` | text-[12px]->label |

## Flagged Size Shifts

| Location | Old | New | Delta | Risk |
|----------|-----|-----|-------|------|
| Login hero heading (xl breakpoint) | `xl:text-[34px]` (34px) | `xl:text-display` (28px) | -6px | Hero heading at large screens is visually smaller. Acceptable for token consistency. |
| Login animated values | `text-[26px]` (26px) | `text-display` (28px) | +2px | Animated mockup numbers slightly larger. Minimal impact. |
| Settings PR preview | `text-[24px]` (24px) | `text-display` (28px) | +4px | PR number preview slightly larger. Low risk. |
| PO detail total amount | `text-[24px]` (24px) | `text-display` (28px) | +4px | Amount headline slightly larger. Low risk. |
| PR detail heading | `text-[22px]` (22px) | `text-heading` (20px) | -2px | PR title slightly smaller. Minimal. |
| Workspace PR title | `text-[26px]` (26px) | `text-display` (28px) | +2px | Minimal. |
| Approval modal title | `text-[17px]` (17px) | `text-heading-sm` (16px) | -1px | Negligible. |

## Cumulative Migration Stats (All Phases)

| Phase | Files | `text-[Npx]` removed | Legacy Tailwind removed | Total |
|-------|-------|----------------------|------------------------|-------|
| 3c-1 (components) | 9 | 64 | 14 | 78 |
| 3c-2 (list & dashboard pages) | 11 | 292 | 3 | 295 |
| 3c-3 (detail, form, modal, workspace, auth) | 21 | 507 | 41 | 548 |
| **Grand Total** | **41** | **863** | **58** | **921** |

## Verification

### Grep — Zero remaining legacy patterns

```
grep -rn 'text-\[\d+\.?\d*px\]' apps/web/src/ → 0 matches
grep -rn '\btext-(xs|sm|base|lg|2xl|4xl)\b' apps/web/src/ → 1 match (commented-out line in sidebar.tsx)
```

**All 921 legacy typography instances have been migrated to semantic tokens.**

### TypeScript

10 pre-existing TS errors (calendar, date-picker, toast, workspace, po-detail, po-form, contextual-panels, seller-references, step-items, use-pr-form). **Zero new errors** introduced.

### Build

`npx vite build` — succeeds (2855 modules, 2.43s). No regressions.

### Lint

1 pre-existing error + 7 warnings. **Zero new issues** introduced.

## Visual QA Screenshots

Captured to `audit/smoke/3c3-after/` at 1440x900 (desktop) and 375x812 (mobile):

| Screenshot | Viewport | Page |
|-----------|----------|------|
| `login-desktop.png` | Desktop | Login |
| `login-mobile.png` | Mobile | Login |
| `dashboard-desktop.png` | Desktop | Dashboard (COO) |
| `pr-list-desktop.png` | Desktop | PR List |
| `pr-detail-desktop.png` | Desktop | PR Detail |
| `pr-detail-mobile.png` | Mobile | PR Detail |
| `pr-form-step1-desktop.png` | Desktop | PR Form (Step 1) |
| `po-list-desktop.png` | Desktop | PO List |
| `po-detail-desktop.png` | Desktop | PO Detail |
| `approvals-desktop.png` | Desktop | Approval Queue |
| `approval-modal-desktop.png` | Desktop | Approval Modal |
| `profile-desktop.png` | Desktop | Profile |
| `settings-desktop.png` | Desktop | Settings (Admin) |
| `department-detail-desktop.png` | Desktop | Department Detail (Admin) |
| `supplier-detail-desktop.png` | Desktop | Supplier Detail (Admin) |
| `procurement-queue-desktop.png` | Desktop | Procurement Queue |
| `procurement-workspace-desktop.png` | Desktop | Procurement Workspace |
| `403-desktop.png` | Desktop | 403 Forbidden |
| `404-desktop.png` | Desktop | 404 Not Found |

All pages render correctly with consistent typography. No visual regressions observed.

## Not Migrated (by design)

- `components/layout/sidebar.tsx` line 178 — `text-base` inside a `{/* comment */}`, not active code
