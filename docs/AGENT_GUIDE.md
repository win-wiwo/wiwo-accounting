# PRAMS Agent Guide — How to Work in This Monorepo Without Breaking It

This document is written for AI agents working on this codebase. Read it fully before making any changes. It covers architecture, conventions, known failure modes, and debugging strategies derived from real bugs found in this project.

---

## 1. Project Snapshot

**PRAMS** — Purchase Request and Approval Management System.

| Layer | Stack | Location |
|-------|-------|----------|
| Backend API | NestJS + TypeScript + Mongoose | `apps/api/` |
| Frontend | React + Vite + TanStack Query | `apps/web/` |
| Shared | Types + Zod schemas + constants | `packages/shared/` |
| Database | MongoDB (replica set, required) | Docker container |
| Runtime | Docker Compose | `docker-compose.yml` |

The backend runs on port **3000**, the frontend on **5173**. The frontend calls the API directly (browser → `http://localhost:3000/api`), not through the Vite proxy. The `VITE_API_URL=http://localhost:3000/api` env var is injected into the web Docker container.

---

## 2. Repository Structure

```
apps/
  api/src/
    app.module.ts              ← registers all modules
    modules/
      auth/                   ← JWT login/logout/refresh
      users/                  ← user CRUD, role management
      departments/            ← department management
      purchase-requests/      ← PR creation, line items, status transitions
      approvals/              ← multi-level workflow engine
      projects/               ← company projects referenced by PRs
      purchase-orders/        ← POs generated from approved PRs
      suppliers/              ← supplier directory
      notifications/          ← in-app notifications via EventEmitter2
      reports/                ← Excel and PDF generation
      audit/                  ← immutable audit log
    common/
      decorators/             ← @Roles(), @CurrentUser(), @Public()
      guards/                 ← RolesGuard (reads @Roles metadata)
      interceptors/           ← TransformInterceptor (wraps all responses)
      filters/                ← AllExceptionsFilter (shapes all errors)
      pipes/                  ← ParseObjectIdPipe

  web/src/
    features/                 ← one folder per domain, contains the page component
    hooks/                    ← useXxx() wrappers over React Query
    lib/
      api-client.ts           ← Axios instance with JWT interceptors
      api-services.ts         ← all API call functions (one object per domain)
    stores/                   ← Zustand stores (auth only client state)
    components/
      ui/                     ← shadcn/ui primitives
      layout/                 ← AppLayout, Sidebar, Header

packages/shared/src/
  types/                      ← TypeScript interfaces for all entities
  constants/                  ← UserRole, PrStatus, etc.
  validation/                 ← Zod schemas shared by both API and frontend
```

---

## 3. API Response Contract — Never Break This

Every API response goes through **`TransformInterceptor`** (`apps/api/src/common/interceptors/transform.interceptor.ts`).

**Rule:** If a service method returns an object with both `data` and `meta` keys, the interceptor unwraps it:

```typescript
// Service returns:
{ data: items[], meta: { total, page, limit, totalPages } }

// Response body the browser receives:
{ success: true, data: items[], message: 'Success', meta: { total, page, limit, totalPages } }
```

If the service returns anything else, it becomes the `data` field directly:

```typescript
// Service returns: user object
// Response body: { success: true, data: user, message: 'Success' }
```

Errors always come back as:
```typescript
{ success: false, data: null, message: 'Human readable error' }
```

**Frontend consumption pattern** (in `api-services.ts`):
```typescript
// Paginated list endpoint:
apiClient.get('/items', { params }).then((r) => r.data)
// r.data = { success, data: Item[], message, meta }
// Hooks then do: data?.data to get the array, data?.meta for pagination

// Single resource:
apiClient.get('/items/:id').then((r) => r.data)
// Hook uses: data?.data to get the object
```

Do not break this contract. If you add a new service method, return `{ data: array, meta: {...} }` for paginated endpoints and the raw object for single-resource endpoints.

---

## 4. Backend Module Pattern — Follow It Exactly

Every domain module follows:

```
Controller → Service → Mongoose Model
```

**Controller responsibilities:**
- Route definition with `@Get`, `@Post`, `@Patch`, `@Delete`
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`)
- Role guards: `@Roles(...roles)` + `@UseGuards(RolesGuard)` on protected routes
- Extract `@CurrentUser()` and pass to service
- Use `ParseObjectIdPipe` on `:id` params

**Service responsibilities:**
- Business logic
- Mongoose queries
- EventEmitter2 events for cross-module reactions
- Throw NestJS exceptions (`NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`)

**Never call one service from another directly**. Use EventEmitter2 for cross-module communication (`this.eventEmitter.emit('event.name', payload)`).

**Register every new module in `app.module.ts`.** Forgetting this is a common mistake — the module simply won't exist, but TypeScript won't tell you.

---

## 5. Mongoose Schema Rules

### Use `@Prop()` decorators — never raw schema objects for class properties

```typescript
// CORRECT
@Prop({ type: String, default: null })
projectName: string | null;

// WRONG — TypeScript sees the property but Mongoose doesn't store it
projectName: string | null;
```

### Cross-collection references: use `Types.ObjectId`, never strings

```typescript
@Prop({ type: Types.ObjectId, ref: 'User', required: true })
requesterId: Types.ObjectId;
```

### Embedded sub-documents: use sub-schema + `@Prop({ type: [SubSchema] })`

Line items and attachments on `PurchaseRequest` are embedded — they are always loaded with the parent document. Do not create a separate `line-items` collection.

### The `toJSON` transform strips `__v`, `passwordHash`, and `refreshToken`

Do not access these fields after a document has been serialized to JSON.

### `projectId` vs `projectName` — a critical distinction

`PurchaseRequest` has a `projectId` field (ObjectId reference to the `projects` collection). It does **not** have a `projectName` string field. The `PurchaseOrder` schema has its own `projectName` string field (denormalized for display). **Do not copy `projectName` from a `PurchaseRequest` document — the field does not exist there.**

```typescript
// WRONG — sourcePr is a PurchaseRequest, it has no projectName
projectName: dto.projectName || sourcePr.projectName || null,

// CORRECT
projectName: dto.projectName || null,
```

---

## 6. Authentication and Authorization

### JWT Payload

The JWT contains `{ sub, email, role }`. `JwtStrategy.validate()` fetches the full user from DB on every request and returns:

```typescript
{
  _id: string,
  email: string,
  role: UserRole,
  firstName: string,
  lastName: string,
  departmentId: string | null,
}
```

This object is available in controllers as `@CurrentUser() user`.

### Role Enforcement

Backend is the **only** source of truth for authorization. Frontend role guards are UX only.

```typescript
// Controller
@Roles(UserRole.ADMIN, UserRole.CEO)
@UseGuards(RolesGuard)
@Patch(':id')
async update(...) {}
```

`RolesGuard` reads `@Roles()` metadata. If the decorator is missing, the route is open to any authenticated user.

### UserRole Values

```typescript
STAFF = 'staff'
DEPT_HEAD = 'dept_head'
COO = 'coo'
CEO = 'ceo'
ADMIN = 'admin'
PROCUREMENT = 'procurement'
ACCOUNTING = 'accounting'
```

Always import from `@prams/shared`, never hardcode strings.

---

## 7. Frontend Data Flow

### The full data path

```
Component
  → useXxx() hook  (React Query)
  → api-services.ts  (Axios call function)
  → api-client.ts  (Axios instance, adds JWT header)
  → API  →  TransformInterceptor  →  JSON
```

### Adding a new API domain

1. Add call functions to `apps/web/src/lib/api-services.ts`
2. Add React Query hooks to `apps/web/src/hooks/use-xxx.ts`
3. Use hooks in page components

**Never call `apiClient` directly from a component.** Always go through `api-services.ts`.

### Query key conventions

```typescript
['users', params]          // list
['users', id]              // single
['users', 'active']        // special subset
['approvals', 'pending', 'count']  // nested key
```

Use consistent key hierarchies so `invalidateQueries` works correctly.

### Unpacking paginated responses in hooks

```typescript
// useXxx hook returns the full response body:
const data = await projectsApi.list(params)
// data = { success, data: Project[], message, meta }

// In component:
const projects = (data?.data ?? []) as Project[]
const meta = data?.meta
```

---

## 8. Radix UI / shadcn Component Rules — Critical

### NEVER use empty string as a `SelectItem` value

Radix UI v2 (`@radix-ui/react-select ^2.1.0`) uses empty string internally as "no value" sentinel. Giving `SelectItem` an empty string `value` throws a runtime error that **crashes the entire React tree** — the whole page goes blank, including the sidebar and header. There is no error boundary, so the failure is silent.

```tsx
// WRONG — crashes the app with a blank page
<SelectItem value="">All statuses</SelectItem>

// CORRECT — use a sentinel string and convert in onValueChange
<Select
  value={filter || 'all'}
  onValueChange={(v) => setFilter(v === 'all' ? '' : v)}
>
  <SelectItem value="all">All statuses</SelectItem>
  <SelectItem value="active">Active</SelectItem>
</Select>
```

This pattern applies to every `Select` filter in every page. Always audit new Select components for empty string values before finishing.

### Dialog state pattern

`ProjectFormDialog` (and similar) is always rendered — it uses `open={dialogOpen}` to show/hide. State is reset inside `onOpenChange` when the dialog opens. Do not conditionally render dialogs as it causes mount/unmount hook issues.

### No error boundaries exist

React errors during render propagate all the way up and unmount the entire app, producing a blank white screen. This makes debugging hard. When a page is completely blank:
1. Check the browser console for a thrown error
2. Look at every `SelectItem` for empty string values
3. Look at every hook/component that could throw on mount
4. Look at every import for missing modules

---

## 9. TypeScript Compile = API Startup

The NestJS API runs with `nest start --watch` in development. A TypeScript error **prevents the server from starting entirely** — no routes are registered, every request gets connection-reset.

When the API returns connection-reset or ERR_CONNECTION_REFUSED:
1. `docker logs prams-api --tail 50` — look for TypeScript compile errors
2. Fix the TypeScript error
3. The watcher auto-recompiles; wait a few seconds for `Nest application successfully started`

Common causes:
- Accessing a property that doesn't exist on a Mongoose document type
- Wrong import path
- Missing `async`/`await` on a method that returns a Promise
- Incorrect generic type on a Mongoose model

---

## 10. Shared Package — Keep It in Sync

`packages/shared/src/` is imported by both `apps/api/` and `apps/web/`. Changes here affect both sides.

**When adding a new entity:**
1. Create `packages/shared/src/types/xxx.types.ts` with the TypeScript interface
2. Export from `packages/shared/src/types/index.ts`
3. Add Zod schemas if needed in `packages/shared/src/validation/`
4. Add the Mongoose schema in `apps/api/src/modules/xxx/schemas/xxx.schema.ts` separately — Mongoose schemas live in the API, not shared

**DTO classes live in the API** (`dto/` folder inside each module). Interfaces for those DTOs live in `packages/shared/types/`. Do not duplicate.

---

## 11. Docker Development Workflow

```bash
docker compose up          # starts all three services
docker logs prams-api      # check API for TS errors or crashes
docker logs prams-web      # check Vite for build errors
```

The API and web containers mount source files as volumes:
```yaml
volumes:
  - ./apps/api/src:/app/apps/api/src
  - ./packages/shared/src:/app/packages/shared/src
```

Editing files locally is reflected immediately through the watcher. **You do not need to restart containers for source changes** — only for `package.json` dependency changes.

MongoDB requires a replica set (`--replSet rs0`) for transactions. Do not remove the replica set configuration.

---

## 12. Debugging Checklist

### Blank page / nothing renders
1. Open browser DevTools → Console tab — read the thrown error
2. Search for `SelectItem value=""` in the affected page file
3. Search for broken imports (`import { X } from '...'` where X doesn't exist)
4. Check if the route's `ProtectedRoute` role list matches the logged-in user's role
5. Check if a hook (especially in `Sidebar` or `Header`) is throwing on mount

### API not responding / connection reset
1. `docker logs prams-api --tail 50` — look for TypeScript compile errors
2. Fix the compile error and wait for the watcher to recompile
3. Verify with `curl http://localhost:3000/api/projects` — expect JSON, not connection reset

### Wrong data / 401 on API calls
1. Check the JWT interceptor in `api-client.ts` — access token comes from Zustand auth store
2. Check route has `@ApiBearerAuth()` and that `JwtAuthGuard` is applied (it's global by default)
3. Check role guard if getting 403

### Data shape mismatch (frontend shows nothing or wrong values)
1. Open Network tab → find the XHR → check the actual JSON response
2. Remember: frontend gets `{ success, data, message, meta }` — access `.data` to get the payload
3. Remember: `TransformInterceptor` only unwraps if the service returned `{ data, meta }` together

### Missing field on Mongoose document
1. Check the schema class — only fields with `@Prop()` are persisted
2. TypeScript may accept property access on the class type without `@Prop()` — the decorator is required for Mongoose to store the value
3. If a service accesses `doc.fieldName` and it's always `undefined`, the field is missing `@Prop()`

---

## 13. Approval Workflow State Machine

Do not change state transitions without understanding the full workflow:

```
DRAFT → SUBMITTED → LEVEL1_REVIEW → LEVEL2_REVIEW → LEVEL3_REVIEW → APPROVED
                         ↓                ↓                ↓
                     REJECTED        REJECTED          REJECTED
                     RETURNED → (back to DRAFT)
```

- Approval levels are determined by `totalAmount` thresholds (configured in `pr-numbering` module settings)
- `LEVEL1_REVIEW` = Department Head approval
- `LEVEL2_REVIEW` = COO approval
- `LEVEL3_REVIEW` = CEO approval
- Approvers cannot approve their own PRs (enforced in `ApprovalsService`)
- Status transitions are validated in `ApprovalsService` — never mutate `status` directly from `PurchaseRequestsService`

---

## 14. What NOT to Do

- **Do not add `@Prop()` fields to a schema without also adding them to the TypeScript class body** — both are required
- **Do not add a field to the TypeScript class without `@Prop()`** — it won't be persisted; TypeScript won't warn you
- **Do not create a new module without registering it in `app.module.ts`**
- **Do not call `response.data.data.data`** — the envelope is `{ success, data, message, meta }`, one level deep
- **Do not use empty strings as Radix UI Select values** — use a named sentinel like `'all'`, `'any'`, `'none'`
- **Do not add a new `UserRole` value without updating `ROLE_LABELS` and `ROLE_HIERARCHY` in `packages/shared/src/constants/roles.ts`**
- **Do not import from `apps/api/` inside `apps/web/`** — use `@prams/shared` for shared types
- **Do not commit `.env` files** — secrets are managed via `.env` (gitignored) and Docker env vars
- **Do not remove `--replSet rs0` from the MongoDB command** — transactions require a replica set
- **Do not mutate objects** — always spread: `{ ...original, field: newValue }`

---

## 15. Adding a New Feature — Checklist

### Backend
- [ ] Schema class with all fields decorated with `@Prop()`
- [ ] Indexes defined after `SchemaFactory.createForClass()`
- [ ] `toJSON` transform to strip `__v` and any sensitive fields
- [ ] Module file (`xxx.module.ts`) importing the schema and providing the service
- [ ] Module registered in `app.module.ts`
- [ ] Controller with correct `@Roles()` guards on write endpoints
- [ ] Service returns `{ data: array, meta }` for list endpoints, raw object otherwise
- [ ] DTOs with `class-validator` decorators for all body inputs

### Shared package
- [ ] TypeScript interface in `packages/shared/src/types/xxx.types.ts`
- [ ] Exported from `packages/shared/src/types/index.ts`

### Frontend
- [ ] API call functions in `apps/web/src/lib/api-services.ts`
- [ ] React Query hooks in `apps/web/src/hooks/use-xxx.ts`
- [ ] Route added to `apps/web/src/App.tsx` with correct `ProtectedRoute allowedRoles`
- [ ] Sidebar link added in `apps/web/src/components/layout/sidebar.tsx` with correct `roles` filter
- [ ] No `SelectItem value=""` — use named sentinels
- [ ] Page tested with empty state, loading state, and populated state
