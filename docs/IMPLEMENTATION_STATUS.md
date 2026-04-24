# Implementation Status

**Last Updated:** 2026-04-19

## Quick Summary

| Epic | Name | Status | Done | Total | Notes |
|------|------|--------|------|-------|-------|
| EP-01 | Account Management | Done | 8/8 | 26 pts | All auth, user CRUD, profile, password |
| EP-02 | Department Management | Done | 6/6 | 15 pts | CRUD, assignment, head designation |
| EP-03 | Purchase Request Filing | Done | 8/8 | 32 pts | Create, items, attachments, draft, recall, cancel |
| EP-04 | Approval Workflow | Done | 7/7 | 32 pts | Submit, approve, reject, return, comments, queue, audit |
| EP-05 | Dashboard | Done | 5/5 | 28 pts | Employee, approver, admin, accounting, trends |
| EP-06 | Search & Monitoring | Done | 5/5 | 21 pts | All search features complete |
| EP-07 | Report Generation | Done | 4/5 | 23/31 pts | Won't Have: US-0705 |
| EP-08 | Notifications | Done | 5/5 | 19 pts | In-app notifications via EventEmitter2 |
| EP-09 | PR Numbering Control | Done | 4/5 | 15/18 pts | Won't Have: US-0905 |
| EP-10 | Security & Access Control | Done | 6/6 | 27 pts | RBAC, password policy, session, lockout, audit, JWT |

**Overall: 58/60 stories implemented (~97%)**

## Workflow Plan Status

The workflow follow-up plan in `docs/WORKFLOW_IMPLEMENTATION_PLAN.md` is currently at:
- Phase 1: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: pending
- Phase 5: pending

Phase 3 is complete in code:
- procurement quotation captures multi-supplier canvass entries
- quotation evidence uploads are separated from requester supporting documents
- winning supplier selection is stored on procurement items
- PR detail, procurement review, and approver review all expose canvass data and quotation evidence

---

## Detailed Status by Epic

### EP-01: Account Management - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0101 | User Login | Must Have | 5 | Done | JWT auth with access/refresh tokens |
| US-0102 | User Logout | Must Have | 2 | Done | Token invalidation, redirect to login |
| US-0103 | Create User Account | Must Have | 5 | Done | Admin-only, role assignment |
| US-0104 | Edit User Account | Must Have | 3 | Done | Admin-only, field validation |
| US-0105 | Deactivate User Account | Must Have | 2 | Done | Status toggle, session invalidation |
| US-0106 | View User List | Must Have | 3 | Done | Paginated table with search/filter |
| US-0107 | Manage User Profile | Should Have | 3 | Done | View/edit own profile info |
| US-0108 | Change Password | Must Have | 3 | Done | Current password verification, policy enforcement |

**Key files:**
- `apps/api/src/modules/auth/` — JWT auth, login/logout/refresh
- `apps/api/src/modules/users/` — User CRUD service and controller
- `apps/web/src/features/auth/` — Login, change password pages
- `apps/web/src/features/users/` — User list, user form pages
- `apps/web/src/features/profile/` — Profile page

---

### EP-02: Department Management - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0201 | Create Department | Must Have | 3 | Done | Name, code, description |
| US-0202 | Edit Department | Must Have | 2 | Done | Update name/description |
| US-0203 | Deactivate Department | Should Have | 2 | Done | Status toggle with active PR check |
| US-0204 | Assign Employees | Must Have | 3 | Done | Department detail member management |
| US-0205 | Designate Department Head | Must Have | 3 | Done | Role auto-update on designation |
| US-0206 | View Department List | Must Have | 2 | Done | List with clickable rows |

**Key files:**
- `apps/api/src/modules/departments/` — Department CRUD
- `apps/web/src/features/departments/` — List, form, detail pages

---

### EP-03: Purchase Request Filing - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0301 | Create Purchase Request | Must Have | 8 | Done | Form with auto-populated fields, line items |
| US-0302 | Add Line Items | Must Have | 5 | Done | Dynamic rows, auto-calculation |
| US-0303 | Upload Attachments | Must Have | 5 | Done | File upload with preview |
| US-0304 | Save as Draft | Must Have | 3 | Done | Draft status, resume editing |
| US-0305 | Edit Submitted PR (Recall) | Should Have | 3 | Done | Recall to draft if not under review |
| US-0306 | Cancel PR | Should Have | 2 | Done | Cancel with reason |
| US-0307 | View My PRs | Must Have | 3 | Done | Paginated list with status filter |
| US-0308 | PR Form Validation | Must Have | 3 | Done | Client + server validation with Zod |

**Key files:**
- `apps/api/src/modules/purchase-requests/` — PR CRUD, service, controller
- `apps/web/src/features/purchase-requests/` — PR list, form, detail pages

---

### EP-04: Approval Workflow - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0401 | Submit PR for Approval | Must Have | 5 | Done | Status transition, routing to dept head |
| US-0402 | Approve PR | Must Have | 8 | Done | Multi-level (Dept Head → COO → CEO) |
| US-0403 | Reject PR | Must Have | 3 | Done | Mandatory reason, notification |
| US-0404 | Return for Revision | Must Have | 5 | Done | Returns to draft, re-enters workflow |
| US-0405 | Add Comment | Should Have | 3 | Done | Comments on approval actions |
| US-0406 | View Approval Queue | Must Have | 5 | Done | Level-specific pending PRs |
| US-0407 | View Audit Trail | Must Have | 3 | Done | Immutable timeline on PR detail |

**Key files:**
- `apps/api/src/modules/approvals/` — Approval workflow state machine
- `apps/web/src/features/approvals/` — Approval queue page
- `apps/web/src/features/purchase-requests/pr-detail-page.tsx` — Timeline + action buttons

---

### EP-05: Dashboard - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0501 | Employee Dashboard | Should Have | 5 | Done | My PR summary, action required section |
| US-0502 | Approver Dashboard | Should Have | 8 | Done | Pending approvals, team stats |
| US-0503 | Admin Dashboard | Could Have | 5 | Done | System overview, user/dept counts |
| US-0504 | Accounting Dashboard | Should Have | 5 | Done | Financial overview, approved amounts |
| US-0505 | Dashboard Trend Charts | Could Have | 5 | Done | PR count/amount over time |

**Key files:**
- `apps/web/src/features/dashboard/dashboard-page.tsx` — Role-based dashboard
- `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts` — Stats endpoint

---

### EP-06: Search & Monitoring - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0601 | Search PRs by Multiple Criteria | Must Have | 8 | Done | Advanced filters, pagination, URL persistence |
| US-0602 | Quick Search | Should Have | 3 | Done | Header search bar with typeahead dropdown, Ctrl+K shortcut |
| US-0603 | View PR Detail with Timeline | Must Have | 5 | Done | Full details + approval timeline |
| US-0604 | Filter PRs by Status | Must Have | 2 | Done | Multi-select status pills |
| US-0605 | Export Search Results | Could Have | 3 | Done | Excel export via reports endpoint |

**Key files:**
- `apps/web/src/features/search/search-page.tsx` — Advanced search page
- `apps/api/src/modules/purchase-requests/dto/query-purchase-requests.dto.ts` — Query DTO

---

### EP-07: Report Generation - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0701 | PR Summary Report | Should Have | 8 | Done | Excel + PDF with status breakdown |
| US-0702 | Department Spending Report | Should Have | 5 | Done | Approved amounts per department |
| US-0703 | Detailed PR Report | Should Have | 5 | Done | Single-PR PDF with details, items, audit trail, signature lines |
| US-0704 | Approval Turnaround Report | Could Have | 5 | Done | Avg turnaround by level and department, Excel + PDF |
| US-0705 | Schedule Recurring Reports | Won't Have | 8 | Skipped | Deferred to future release |

**Key files:**
- `apps/api/src/modules/reports/` — Reports service and controller (pr-summary, dept-spending, pr-detail/:id, turnaround)
- `apps/web/src/features/reports/reports-page.tsx` — Reports page with 3 report cards
- `apps/web/src/features/purchase-requests/pr-detail-page.tsx` — "Generate Report" button

---

### EP-08: Notifications - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0801 | Notify on PR Submission | Must Have | 5 | Done | EventEmitter2, in-app notifications |
| US-0802 | Notify on Status Change | Must Have | 3 | Done | Approval/rejection/return notifications |
| US-0803 | View Notification History | Should Have | 3 | Done | Notification panel, mark as read |
| US-0804 | Notification Preferences | Could Have | 3 | Done | Toggle notification types |
| US-0805 | Real-Time Delivery | Could Have | 5 | Done | Polling-based (not WebSocket) |

**Key files:**
- `apps/api/src/modules/notifications/` — Notification service with EventEmitter2
- `apps/web/src/components/layout/header.tsx` — Notification bell + panel

---

### EP-09: PR Numbering Control - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-0901 | Auto-Generate PR Number | Must Have | 5 | Done | Atomic counter, PR-YYYY-NNNNN format |
| US-0902 | Configure PR Number Format | Should Have | 5 | Done | Admin settings UI with live preview |
| US-0903 | View PR Number Series | Should Have | 2 | Done | Series table with summary stats |
| US-0904 | Reset PR Number Sequence | Could Have | 3 | Done | Admin reset with audit logging |
| US-0905 | Department-Specific Prefix | Won't Have | 3 | Skipped | Deferred to future release |

**Key files:**
- `apps/api/src/modules/pr-numbering/` — PR numbering service, controller, config schema
- `apps/web/src/features/settings/settings-page.tsx` — Admin settings page with format config + series viewer

---

### EP-10: Security & Access Control - DONE

| Story | Title | Priority | Pts | Status | Notes |
|-------|-------|----------|-----|--------|-------|
| US-1001 | Role-Based Access Control | Must Have | 8 | Done | @Roles decorator + RolesGuard, frontend RoleRoute |
| US-1002 | Password Policy | Must Have | 3 | Done | Min 8 chars, uppercase, lowercase, digit, special |
| US-1003 | Session Timeout | Must Have | 3 | Done | JWT expiry + auto-refresh |
| US-1004 | Account Lockout | Must Have | 3 | Done | 5 failed attempts → 30 min lock |
| US-1005 | Security Audit Log | Must Have | 5 | Done | Immutable audit log for all write ops |
| US-1006 | JWT Token Refresh | Must Have | 5 | Done | Refresh token rotation, 401 interceptor |

**Key files:**
- `apps/api/src/common/guards/` — RolesGuard, JwtAuthGuard
- `apps/api/src/modules/auth/` — JWT strategy, refresh token rotation
- `apps/api/src/modules/audit/` — Audit log service

---

## What's Left to Build

### Must Have — All Done

### Should Have — All Done

### Could Have — All Done

### Won't Have (Deferred)
| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| US-0705 | Schedule Recurring Reports | EP-07 | 8 |
| US-0905 | Department-Specific PR Prefix | EP-09 | 3 |
