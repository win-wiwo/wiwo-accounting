# Route & UI Surface Inventory

**Date:** 2026-05-03
**Source:** `apps/web/src/App.tsx` (React Router v6, `BrowserRouter`)

---

## Static routes

| # | Route | Page | Auth | Role gate |
|---|-------|------|------|-----------|
| 1 | `/login` | LoginPage | Public | — |
| 2 | `/dashboard` | DashboardPage | Yes | Any |
| 3 | `/users` | UsersListPage | Yes | admin |
| 4 | `/departments` | DepartmentsListPage | Yes | admin |
| 5 | `/suppliers` | SuppliersListPage | Yes | admin, accounting, procurement |
| 6 | `/suppliers/new` | SupplierFormPage | Yes | admin, accounting, procurement |
| 7 | `/purchase-orders` | PoListPage | Yes | Any |
| 8 | `/purchase-requests` | PrListPage | Yes | Any |
| 9 | `/purchase-requests/new` | PrFormPage | Yes | Any |
| 10 | `/approvals` | ApprovalsPage | Yes | dept_head, coo, ceo |
| 11 | `/projects` | ProjectsPage | Yes | admin, ceo, coo |
| 12 | `/procurement` | ProcurementQueuePage | Yes | procurement, admin |
| 13 | `/reports` | ReportsPage | Yes | Any |
| 14 | `/settings` | SettingsPage | Yes | admin |
| 15 | `/profile` | ProfilePage | Yes | Any |
| 16 | `/search` | SearchPage | Yes | admin, dept_head, coo, ceo, accounting, procurement |
| 17 | `/403` | ForbiddenPage | No | — |
| 18 | `/404` | NotFoundPage | No | — |

## Dynamic routes (with example params)

| # | Route pattern | Example URL | Page | Role gate |
|---|--------------|-------------|------|-----------|
| 19 | `/departments/:id` | `/departments/<DEPT_ID>` | DepartmentDetailPage | admin |
| 20 | `/suppliers/:id` | `/suppliers/<SUPPLIER_ID>` | SupplierDetailPage | admin, accounting, procurement |
| 21 | `/suppliers/:id/edit` | `/suppliers/<SUPPLIER_ID>/edit` | SupplierFormPage | admin, accounting, procurement |
| 22 | `/purchase-orders/:id` | `/purchase-orders/<PO_ID>` | PoDetailPage | Any |
| 23 | `/purchase-requests/:id` | `/purchase-requests/<PR_ID>` | PrDetailPage | Any |
| 24 | `/purchase-requests/:id/edit` | `/purchase-requests/<PR_ID>/edit` | PrFormPage | Any |
| 25 | `/procurement/:id` | `/procurement/<PR_ID>` | ProcurementWorkspacePage | procurement, admin |

> **Note:** `<DEPT_ID>`, `<PR_ID>`, etc. are MongoDB ObjectIds. The capture script will query the API at runtime to resolve real IDs from seeded data.

## Modal / dialog surfaces (not their own route)

These are major UI surfaces triggered from within pages:

| # | Parent route | Trigger | Surface | State var |
|---|-------------|---------|---------|-----------|
| M1 | `/approvals` | Click PR row | PrApprovalModal — full approval form | `modalOpen` |
| M2 | `/users` | "Add User" button | CreateUserModal — user creation form | `createOpen` |
| M3 | `/users` | Edit icon on row | EditUserModal — user edit form | `editUser.open` |
| M4 | `/users` | Activate/Deactivate btn | Confirmation dialog | `confirmDialog.open` |
| M5 | `/departments` | "Add Department" btn | CreateDepartmentModal | `createOpen` |
| M6 | `/departments` | Edit icon on row | EditDepartmentModal | `editDept.open` |
| M7 | `/departments` | Delete icon on row | Delete confirmation | `confirmDelete.open` |
| M8 | `/departments/:id` | "Add Member" btn | Add member search dialog | `addDialogOpen` |
| M9 | `/departments/:id` | Remove member btn | Remove confirmation | `confirmRemove.open` |
| M10 | `/departments/:id` | Edit department btn | Edit department form | `editOpen` |
| M11 | `/departments/:id` | Delete department btn | Delete confirmation | `confirmDelete` |
| M12 | `/purchase-requests/:id` | "Submit" button | Submit confirmation | `confirmDialog` (type: submit) |
| M13 | `/purchase-requests/:id` | Approve/Return/Reject btns | Approval dialog | `approvalDialog` |
| M14 | `/purchase-requests/:id` | Attachment click | File/image preview | `previewDialog` |
| M15 | `/purchase-requests/:id` | Item photo thumbnail | Photo viewer | `itemPhotoDialog` |
| M16 | `/purchase-orders/:id` | "Mark as Ordered" btn | Order confirmation + ETA | `orderDialog` |
| M17 | `/purchase-orders/:id` | "Receive Order" btn | Receive form + photo upload | `receiveDialog` |
| M18 | `/purchase-orders/:id` | "Cancel" btn | Cancel reason dialog | `cancelDialog` |
| M19 | `/purchase-orders/:id` | Proof photo thumbnail | Photo viewer | `proofPhotoDialog` |
| M20 | `/procurement/:id` | "Submit Quotation" btn | Submit confirmation | `showSubmitConfirm` |
| M21 | `/procurement/:id` (canvass) | "Add Supplier" btn | Add supplier dialog | `addSupplierOpen` |
| M22 | `/projects` | "Add Project" / Edit btn | Project form dialog | `dialogOpen` |
| M23 | `/profile` | "Change Password" btn | Password change form | `changePasswordOpen` |
| M24 | `/settings` | "Save Configuration" btn | Config save confirmation | `confirmSaveConfig` |

## Auth credentials (from seed-full.ts)

All seeded users share: **Password@123**

| Role | Email | Name |
|------|-------|------|
| admin | `admin@wilsonworksph.com` | System Admin |
| ceo | `ceo@wilsonworksph.com` | Roberto Santos |
| coo | `coo@wilsonworksph.com` | Maria Reyes |
| dept_head | `eng.head@wilsonworksph.com` | Carlos Garcia |
| staff | `juan.delacruz@wilsonworksph.com` | Juan Dela Cruz |
| procurement | `procurement@wilsonworksph.com` | Eduardo Villanueva |
| accounting | `accounting@wilsonworksph.com` | Maricel Dimaculangan |

## Capture plan

To see every page, we need at minimum 6 login sessions (one per role group):

1. **admin** — dashboard, users, departments, departments/:id, suppliers, suppliers/new, suppliers/:id, suppliers/:id/edit, purchase-orders, purchase-requests, projects, procurement, settings, search, reports, profile
2. **ceo** — dashboard, approvals, projects
3. **coo** — dashboard, approvals
4. **dept_head** — dashboard, approvals
5. **staff** — dashboard, purchase-requests, purchase-requests/new, purchase-requests/:id, purchase-orders, reports, profile
6. **procurement** — dashboard, procurement, procurement/:id, suppliers, purchase-orders
7. **accounting** — dashboard, suppliers, search

Since admin can access most routes, we capture the majority under admin and only switch roles for role-specific dashboards and the approvals page.
