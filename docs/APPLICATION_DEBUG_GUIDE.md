# Application Debug Guide

This is the working reference for the PRAMS application as it exists in this repository.

Use this document when you need to:

- understand what each module does
- find the code path behind a page or API
- trace data from frontend to backend to MongoDB
- know which files to inspect first during debugging
- avoid repeating basic discovery work in future prompts

This guide is intentionally practical. It focuses on how the app is wired, what each module owns, and what usually breaks.

## 1. What The Application Is

PRAMS is a Purchase Request and Approval Management System.

Main business flow:

1. Users create purchase requests.
2. Requests move through approval levels based on role and current status.
3. Procurement handles quotation when needed.
4. Approved requests can become purchase orders.
5. Notifications, reports, and dashboards are generated from the same underlying records.

## 2. Monorepo Layout

Top-level application areas:

- `apps/api`
  NestJS backend
- `apps/web`
  React frontend
- `packages/shared`
  shared types, constants, validation schemas
- `docs`
  human and agent documentation

Why this matters:

- If frontend and backend disagree on field names or enums, `packages/shared` is the first place to inspect.
- If a new feature spans frontend and backend, shared types are usually the contract layer.

## 3. Runtime Architecture

### Backend

Stack:

- NestJS
- Mongoose
- MongoDB
- JWT auth via Passport
- EventEmitter2 for cross-module reactions

Backend root module:

- `apps/api/src/app.module.ts`

Registered runtime modules:

- `AuthModule`
- `UsersModule`
- `DepartmentsModule`
- `PurchaseRequestsModule`
- `ApprovalsModule`
- `NotificationsModule`
- `ReportsModule`
- `SuppliersModule`
- `PurchaseOrdersModule`
- `ProjectsModule`

Important internal module:

- `PrNumberingModule`
  Imported by purchase requests and settings, but not registered directly in `AppModule`

### Frontend

Stack:

- React
- React Router
- TanStack Query
- Zustand
- Axios
- shadcn/Radix UI

Frontend root entry:

- `apps/web/src/App.tsx`

App shell:

- `AppLayout`
- `Sidebar`
- `Header`
- `ProtectedRoute`

### Shared Package

Primary responsibilities:

- TypeScript entity types
- enums/constants such as roles and PR statuses
- Zod validation schemas used in forms

Main files:

- `packages/shared/src/types/*`
- `packages/shared/src/constants/*`
- `packages/shared/src/validation/*`

## 4. Global Backend Behavior

### API Base And Prefix

- Global API prefix: `/api`
- Swagger docs: `/api/docs`
- Static uploads served from `/uploads`

Source:

- `apps/api/src/main.ts`

### Global Validation

`ValidationPipe` is global and configured with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Implication:

- unknown query/body fields are stripped or rejected
- DTO mismatch is a common reason requests fail

### Response Envelope

All normal responses are wrapped by `TransformInterceptor`.

Expected shape:

```json
{ "success": true, "data": ..., "message": "Success", "meta": { ... } }
```

Source:

- `apps/api/src/common/interceptors/transform.interceptor.ts`

Why this matters:

- frontend service functions expect `.data` to hold the payload
- paginated endpoints are expected to return `data + meta`

### Error Envelope

There is an exception filter file:

- `apps/api/src/common/filters/http-exception.filter.ts`

It formats errors as:

```json
{ "success": false, "data": null, "message": "..." }
```

Important runtime note:

- `main.ts` currently registers the interceptor and validation pipe, but does not explicitly register this exception filter
- if you are debugging inconsistent error shape, check whether an error is being handled by Nest defaults vs a custom filter

### Authentication Guard

JWT auth is global.

Source:

- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

Implication:

- every backend route is protected unless marked `@Public()`
- public auth routes are `login` and `refresh`

### Authorization Guard

Role-based authorization is explicit per route using:

- `@Roles(...)`
- `@UseGuards(RolesGuard)`

Source:

- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/decorators/roles.decorator.ts`

Implication:

- authenticated does not mean authorized
- backend is the real source of truth, not frontend route guards

## 5. Global Frontend Behavior

### Routing

Frontend routes are defined in:

- `apps/web/src/App.tsx`

Protected route wrapper:

- `apps/web/src/routes/protected-route.tsx`

Behavior:

- unauthenticated users are redirected to `/login`
- authenticated users without role access are redirected to `/403`

### Server State

TanStack Query is used for almost all backend data.

Common pattern:

1. feature page builds params
2. hook wraps API call
3. `api-services.ts` performs Axios request
4. page reads `data?.data` and `data?.meta`

Important files:

- `apps/web/src/lib/api-services.ts`
- `apps/web/src/hooks/*`

### Client Auth State

Zustand auth store:

- `apps/web/src/stores/auth.store.ts`

What it holds:

- `user`
- `accessToken`
- `refreshToken`
- `isAuthenticated`

Persistence:

- stored using Zustand `persist`

### Axios Auth Flow

Axios client:

- `apps/web/src/lib/api-client.ts`

Behavior:

- attaches access token on requests
- on `401`, attempts refresh using refresh token
- retries queued requests after refresh
- logs out if refresh fails

Why this matters:

- if the UI suddenly logs out, inspect refresh flow first
- if requests loop or hang after token expiry, inspect Axios interceptor queue logic

### Layout-Level Data

Header:

- quick PR search
- notifications popover
- logout

Sidebar:

- role-based navigation visibility
- approval count badge

Files:

- `apps/web/src/components/layout/header.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/app-layout.tsx`

## 6. Backend Module Guide

Each section below explains:

- what the module owns
- major routes
- important dependencies
- first files to inspect when debugging

### 6.1 Auth

Purpose:

- login
- logout
- token refresh
- current-user profile
- password change

Main files:

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

Key behaviors:

- `login` verifies email/password, issues access and refresh tokens
- refresh tokens are bcrypt-hashed in the user document
- `refresh` returns new tokens
- `me` fetches profile from DB
- `change-password` delegates to users service

Depends on:

- `UsersService`
- `JwtService`
- `ConfigService`

Debug here when:

- login fails unexpectedly
- tokens are issued but routes still return `401`
- refresh works locally but not in browser
- `@CurrentUser()` is missing fields

First checks:

1. `auth.service.ts`
2. `jwt.strategy.ts`
3. `api-client.ts`
4. current stored auth state in Zustand

### 6.2 Users

Purpose:

- user CRUD
- activation/deactivation
- department assignment support
- password storage

Main files:

- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/schemas/user.schema.ts`
- DTOs under `apps/api/src/modules/users/dto`

Key behaviors:

- admin-only create/update/list
- deactivation also clears refresh token
- listing supports search, role, department, active state
- `findByDepartment` is used by departments module

Used by:

- auth
- departments
- notifications

Debug here when:

- users don’t appear in admin list
- login fails for an active-looking account
- department assignment seems wrong
- role checks behave unexpectedly

First checks:

1. `user.schema.ts`
2. `users.service.ts`
3. query DTO and filter logic
4. frontend users list page and hook

### 6.3 Departments

Purpose:

- department CRUD
- membership management
- department head assignment

Main files:

- `apps/api/src/modules/departments/departments.controller.ts`
- `apps/api/src/modules/departments/departments.service.ts`
- `apps/api/src/modules/departments/schemas/department.schema.ts`

Key behaviors:

- department head is stored as `headId`
- assigning head also updates the user role to `dept_head`
- previous head is demoted back to `staff`
- member assignment is done indirectly by updating user `departmentId`

Depends on:

- `UsersService`

Debug here when:

- a department has no visible head
- department members are wrong
- a department head cannot approve PRs

First checks:

1. department document
2. affected user documents
3. `DepartmentsService.setHead`
4. approvals role/department scoping

### 6.4 Purchase Requests

Purpose:

- draft creation
- editing
- submission
- recall/cancel
- attachments
- procurement quotation submission
- return for info
- PR statistics

Main files:

- `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`
- `apps/api/src/modules/purchase-requests/purchase-requests.service.ts`
- `apps/api/src/modules/purchase-requests/schemas/purchase-request.schema.ts`
- DTOs under `apps/api/src/modules/purchase-requests/dto`

Important business facts:

- `PurchaseRequest` has `projectId`, not `projectName`
- line items and attachments are embedded in the PR document
- PR number is generated on first submission, not draft creation
- procurement-sourced items route through `pending_quotation`

Depends on:

- `PrNumberingService`
- `DepartmentsService`
- `Supplier` model
- `EventEmitter2`

Status transitions handled here include:

- `draft`
- `pending_quotation`
- `level1_review`
- `level2_review`
- `level3_review`
- `approved`
- `rejected`
- `returned`
- `returned_for_info`

Role-sensitive list behavior:

- `staff` sees own PRs only
- `dept_head` sees own PRs plus department PRs
- higher roles can see all

Events emitted:

- `pr.submitted`

Debug here when:

- PR list is missing records
- submission does not advance status correctly
- PR number is blank after submit
- project data is `undefined`
- quotation upload or attachment actions fail

First checks:

1. `purchase-request.schema.ts`
2. `PurchaseRequestsService.findAll`
3. `submit`, `submitQuotation`, `recall`, `returnForInfo`
4. requester role and department on the JWT user
5. related department code for PR numbering

### 6.5 Approvals

Purpose:

- process approval actions
- load approval history
- provide pending queue per approver

Main files:

- `apps/api/src/modules/approvals/approvals.controller.ts`
- `apps/api/src/modules/approvals/approvals.service.ts`
- `apps/api/src/modules/approvals/schemas/approval.schema.ts`

Key behaviors:

- approval level is derived from PR status
- approvers cannot approve their own PR
- department heads can only approve PRs from their department
- rejecting/returning requires comments
- approval actions append history and transition PR status

Depends on:

- `PurchaseRequest` model
- `EventEmitter2`

Events emitted:

- `approval.action`

Debug here when:

- approval queue is empty when it should not be
- an approver gets `403`
- PR history is missing entries
- PR status does not move to the next level

First checks:

1. current PR status
2. `STATUS_TO_LEVEL` and `LEVEL_TO_ROLE`
3. approver role and department
4. approval record creation
5. emitted event consumers

### 6.6 Notifications

Purpose:

- create in-app notifications
- list notifications per user
- unread count
- mark as read / mark all as read

Main files:

- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/schemas/notification.schema.ts`

Key behaviors:

- listens to `approval.action`
- listens to `pr.submitted`
- decides next recipient based on PR status and role
- notification list is always scoped to current user

Depends on:

- `Notification` model
- `PurchaseRequest` model
- `Department` model
- `User` model

Debug here when:

- bell count is wrong
- approvers are not notified
- requester never sees rejection/approval updates

First checks:

1. was the domain event emitted?
2. does recipient resolution find the intended user?
3. notification document created?
4. header queries reading the right endpoint?

### 6.7 Suppliers

Purpose:

- supplier directory CRUD
- supplier search/filter

Main files:

- `apps/api/src/modules/suppliers/suppliers.controller.ts`
- `apps/api/src/modules/suppliers/suppliers.service.ts`
- `apps/api/src/modules/suppliers/schemas/supplier.schema.ts`

Key behaviors:

- accessible to admin, accounting, procurement
- uniqueness enforced on `tin`
- supports active/inactive/blacklisted statuses

Used by:

- supplier management pages
- procurement quotation flow
- purchase orders

Debug here when:

- supplier search returns unexpected results
- duplicate TIN validation fails unexpectedly
- procurement dropdown does not show supplier

First checks:

1. supplier document status
2. `findAll` query filters
3. procurement page using `status: 'active'`

### 6.8 Purchase Orders

Purpose:

- create draft PO from approved PR
- update PO
- submit/approve/issue/cancel
- list and detail views

Main files:

- `apps/api/src/modules/purchase-orders/purchase-orders.controller.ts`
- `apps/api/src/modules/purchase-orders/purchase-orders.service.ts`
- `apps/api/src/modules/purchase-orders/schemas/purchase-order.schema.ts`

Key behaviors:

- source PR must already be `approved`
- draft PO may copy items from source PR
- uses `projectName` string, not `projectId`
- submit generates PO number
- approval is separate from PR approval flow

Depends on:

- `PurchaseRequest` model
- `EventEmitter2`

Events emitted:

- `purchase-order.created`
- `purchase-order.submitted`
- `purchase-order.approved`
- `purchase-order.issued`

Debug here when:

- PO creation fails from an approved PR
- PO number is missing
- project display is wrong
- approvals/issue flow is blocked

First checks:

1. source PR status
2. `create` mapping from PR to PO
3. PO status before action
4. creator/approver role restrictions

### 6.9 Projects

Purpose:

- manage company projects referenced by purchase requests

Main files:

- `apps/api/src/modules/projects/projects.controller.ts`
- `apps/api/src/modules/projects/projects.service.ts`
- `apps/api/src/modules/projects/schemas/project.schema.ts`

Key behaviors:

- list all projects
- separate endpoint for active-project dropdowns
- create/update restricted to admin, CEO, COO

Used by:

- project admin page
- PR form project selector

Debug here when:

- project dropdown is empty
- project list page disagrees with PR form options
- status filtering is wrong

First checks:

1. `findActive`
2. project status values
3. route role protection

### 6.10 Reports

Purpose:

- generate Excel/PDF reports from PR and approval data

Main files:

- `apps/api/src/modules/reports/reports.controller.ts`
- `apps/api/src/modules/reports/reports.service.ts`
- `apps/api/src/modules/reports/dto/report-query.dto.ts`

Report types:

- PR summary
- department spending
- approval turnaround
- PR detail PDF

Key behaviors:

- uses PR documents and approval records
- `department-spending` forces approved-only PRs
- turnaround report partly uses approval `actionDate`

Debug here when:

- exports download but data is wrong
- report filters do not match visible page results
- PDF and Excel differ

First checks:

1. query DTO
2. `buildFilter`
3. report-specific generator method
4. frontend report page params

### 6.11 PR Numbering

Purpose:

- generate PR numbers
- manage numbering config
- show preview and current series

Main files:

- `apps/api/src/modules/pr-numbering/pr-numbering.controller.ts`
- `apps/api/src/modules/pr-numbering/pr-numbering.service.ts`
- schemas under `apps/api/src/modules/pr-numbering/schemas`
- frontend settings page: `apps/web/src/features/settings/settings-page.tsx`

Key behaviors:

- sequence is maintained by department code and year
- formatting is configurable
- purchase requests call this service during submit

Debug here when:

- generated PR numbers look wrong
- duplicate or skipped sequences appear
- settings preview differs from actual generated number

First checks:

1. config document
2. per-department yearly sequence document
3. `generatePrNumber`
4. department code used for generation

## 7. Frontend Feature Guide

This section maps visible pages to the backend modules and key files.

### 7.1 Login And Session

Files:

- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/auth/change-password-page.tsx`

Backend:

- auth module

Look here when:

- login form works but state does not persist
- token refresh fails after some time

### 7.2 Dashboard

Files:

- `apps/web/src/features/dashboard/dashboard-page.tsx`

Uses:

- PR stats
- pending approvals count
- pending approval list

Backend:

- purchase requests
- approvals

Look here when:

- dashboard counts disagree with list pages
- pending approvals badge differs from approvals page

### 7.3 Users

Files:

- `apps/web/src/features/users/users-list-page.tsx`
- `apps/web/src/features/users/user-form-page.tsx`

Backend:

- users
- departments for dropdown

Look here when:

- edit/create form differs from list behavior
- deactivation is not reflected after mutation

### 7.4 Departments

Files:

- `departments-list-page.tsx`
- `department-detail-page.tsx`
- `department-form-page.tsx`

Backend:

- departments
- users

Look here when:

- head assignment UI appears correct but role/member data disagrees

### 7.5 Purchase Requests

Files:

- `pr-list-page.tsx`
- `pr-form-page.tsx`
- `pr-detail-page.tsx`

Backend:

- purchase requests
- projects
- approvals
- notifications indirectly

Look here when:

- a field exists in form but disappears after save
- a status action is missing in detail view
- project or supplier references display incorrectly

### 7.6 Approvals

Files:

- `approvals-page.tsx`
- `pr-approval-modal.tsx`

Backend:

- approvals
- purchase requests

Look here when:

- queue loads but action buttons fail
- modal data differs from PR detail page

### 7.7 Search & Monitor

Files:

- `search-page.tsx`

Backend:

- purchase requests
- reports for export

Important note:

- on-screen search uses purchase-request listing
- export uses reports endpoint
- these are not the same implementation path

Look here when:

- exported file does not match filtered table

### 7.8 Procurement Queue

Files:

- `procurement-queue-page.tsx`

Backend:

- purchase requests
- suppliers

Look here when:

- PR is approved enough for procurement in business terms but does not appear in queue
- quotation submit fails due to missing canvass requirements

### 7.9 Suppliers

Files:

- `suppliers-list-page.tsx`
- `supplier-detail-page.tsx`
- `supplier-form-page.tsx`

Backend:

- suppliers

Look here when:

- list page and procurement dropdown show different supplier availability

### 7.10 Purchase Orders

Files:

- `po-list-page.tsx`
- `po-detail-page.tsx`
- `po-form-page.tsx`

Backend:

- purchase orders
- purchase requests
- suppliers

Look here when:

- PO screen displays source PR fields incorrectly
- edit availability does not match PO status

### 7.11 Reports

Files:

- `reports-page.tsx`

Backend:

- reports

Look here when:

- download succeeds but file contents are stale or mismatched

### 7.12 Projects

Files:

- `projects-page.tsx`

Backend:

- projects

Look here when:

- project admin page works but project dropdown in PR form does not

### 7.13 Settings

Files:

- `settings-page.tsx`

Backend:

- PR numbering

Look here when:

- preview is correct but generated PR numbers are not, or vice versa

### 7.14 Profile

Files:

- `profile-page.tsx`

Backend:

- auth/profile endpoints

## 8. Event-Driven Relationships

Some modules are not directly calling each other. They coordinate through events.

### `pr.submitted`

Emitter:

- purchase requests service

Listener:

- notifications service

What it drives:

- notifying first approver or procurement

### `approval.action`

Emitter:

- approvals service

Listener:

- notifications service

What it drives:

- requester notifications
- next approver notifications

Debug strategy for event-related bugs:

1. confirm the primary write succeeded
2. confirm event was emitted
3. inspect listener logic
4. confirm target recipient exists and matches role/department
5. check resulting notification document

## 9. Route Map By Role

This is the frontend route view, not the backend API route list.

### All authenticated users

- `/dashboard`
- `/purchase-requests`
- `/purchase-requests/new`
- `/purchase-requests/:id`
- `/purchase-requests/:id/edit`
- `/purchase-orders`
- `/purchase-orders/:id`
- `/reports`
- `/profile`
- `/change-password`

### Admin only

- `/users`
- `/users/new`
- `/users/:id/edit`
- `/departments`
- `/departments/new`
- `/departments/:id`
- `/departments/:id/edit`
- `/settings`

### Admin, accounting, procurement

- `/suppliers`
- `/suppliers/new`
- `/suppliers/:id`
- `/suppliers/:id/edit`

### Admin, procurement

- `/purchase-orders/new`
- `/purchase-orders/:id/edit`
- `/procurement`

### Dept head, COO, CEO

- `/approvals`

### Admin, CEO, COO

- `/projects`

### Admin, dept head, COO, CEO, accounting, procurement

- `/search`

## 10. Shared Contracts And Constants

If data shape is confusing, inspect shared package first.

Most important shared files:

- `packages/shared/src/constants/roles.ts`
- `packages/shared/src/constants/pr-status.ts`
- `packages/shared/src/constants/approval-actions.ts`
- `packages/shared/src/constants/request-types.ts`
- `packages/shared/src/constants/attachment-categories.ts`
- `packages/shared/src/types/purchase-request.types.ts`
- `packages/shared/src/types/user.types.ts`
- `packages/shared/src/types/project.types.ts`
- `packages/shared/src/types/approval.types.ts`

Use these when:

- frontend enum labels are wrong
- role or status comparisons fail
- a backend value compiles but UI mapping is broken

## 11. Common Debugging Entry Points

### Blank Page

Check:

1. browser console or `docker logs prams-web`
2. `SelectItem value=""` mistakes
3. route/component import issues
4. recent feature page edits

### API Seems Down

Check:

1. `docker logs prams-api --tail 50`
2. TypeScript compile errors
3. MongoDB connection string
4. Nest startup logs from `main.ts`

### Data Missing On Frontend

Check in this order:

1. feature page params
2. query hook
3. `api-services.ts`
4. backend DTO
5. backend service query/filter
6. schema field definitions
7. actual MongoDB document shape

### Role Or Access Bugs

Check:

1. frontend `ProtectedRoute`
2. sidebar visibility rules
3. backend `@Roles(...)`
4. `RolesGuard`
5. actual stored `user.role`

### Authentication Bugs

Check:

1. login response payload
2. Zustand auth store
3. Axios request auth header
4. refresh interceptor behavior
5. `JwtStrategy.validate()`

### PR Workflow Bugs

Check:

1. current PR status in DB
2. requester role
3. department assignment
4. approval history
5. event emissions
6. notification side effects

### File Upload Bugs

Check:

1. upload directories created by `main.ts`
2. multer validators in controller
3. saved attachment path in document
4. static `/uploads` serving
5. file existence on disk

## 12. Known High-Risk Areas

These are the places agents should actively verify instead of assuming.

### PR field confusion

- `PurchaseRequest` uses `projectId`
- `PurchaseOrder` uses `projectName`

Do not mix them.

### Mongoose persistence

If a schema field exists in TypeScript but not in MongoDB behavior, inspect `@Prop()` first.

### Unregistered modules

If a backend module appears correct but routes do not exist, check `app.module.ts`.

### Response envelope mismatch

If frontend code starts reading raw Axios response differently, it can silently break list pages.

### Search/export mismatch

The Search page UI and the reports export path are different implementations.

### Role-derived visibility

Approval and purchase-request visibility is not just filter-based. It is also role-scoped in service logic.

## 13. Practical “Where To Look First” Index

If the issue is about...

- login/session: `auth.service.ts`, `jwt.strategy.ts`, `api-client.ts`, `auth.store.ts`
- sidebar/403 routing: `App.tsx`, `protected-route.tsx`, `sidebar.tsx`
- list page data: feature page, related hook, `api-services.ts`, backend service `findAll`
- missing PRs: `PurchaseRequestsService.findAll`, current user role, department assignment
- stuck approval: `ApprovalsService.processAction`, PR status, approval role mapping
- missing notifications: `NotificationsService`, emitted events, header hooks
- wrong project data: `projects.service.ts`, PR schema `projectId`, PR form/detail pages
- wrong PO data: `purchase-orders.service.ts`, PO schema, source PR mapping
- wrong report output: `reports.service.ts`, report DTO, frontend report page params
- wrong PR numbers: `pr-numbering.service.ts`, department code, settings config

## 14. Recommended Debugging Sequence

For most bugs, follow this order:

1. Reproduce the issue from the UI route involved.
2. Identify the exact frontend feature page.
3. Find the hook used by that page.
4. Find the API service function called by the hook.
5. Find the backend controller route.
6. Find the backend service method.
7. Check related schema and shared types.
8. Check role/permission logic.
9. Check event-driven side effects if the action should notify or cascade.

That sequence avoids guessing and usually gets you to the real failure point quickly.
