# Purchase Request and Approval Management System - Architecture & System Design

> **Version**: 1.0.0
> **Date**: 2026-03-19
> **Status**: Draft

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Backend Architecture (NestJS)](#2-backend-architecture-nestjs)
3. [Frontend Architecture (React)](#3-frontend-architecture-react)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Approval Workflow Engine](#5-approval-workflow-engine)
6. [API Design](#6-api-design)
7. [File Upload Strategy](#7-file-upload-strategy)
8. [Report Generation](#8-report-generation)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Security Considerations](#10-security-considerations)

---

## 1. High-Level Architecture

### 1.1 Monorepo Structure

```
purchase-request-system/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Authentication & token management
│   │   │   │   ├── users/            # User CRUD, profile
│   │   │   │   ├── departments/      # Department management
│   │   │   │   ├── purchase-requests/# PR filing, items, attachments
│   │   │   │   ├── approvals/        # Approval workflow engine
│   │   │   │   ├── dashboard/        # Aggregation queries, stats
│   │   │   │   ├── search/           # Full-text search, filters
│   │   │   │   ├── reports/          # Excel/PDF generation
│   │   │   │   ├── notifications/    # In-app + email notifications
│   │   │   │   ├── pr-numbering/     # Auto-numbering sequences
│   │   │   │   └── audit/            # Audit log service
│   │   │   ├── common/
│   │   │   │   ├── guards/           # Auth, roles, ownership
│   │   │   │   ├── interceptors/     # Transform, logging, timeout
│   │   │   │   ├── pipes/            # Validation, parse ObjectId
│   │   │   │   ├── middleware/        # Request logging, correlation ID
│   │   │   │   ├── filters/          # Exception filters
│   │   │   │   ├── decorators/       # Custom decorators
│   │   │   │   └── constants/        # Enums, config keys
│   │   │   ├── config/               # Configuration module
│   │   │   ├── database/             # MongoDB connection, seeding
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                     # E2E tests
│   │   ├── uploads/                  # Local file storage (gitignored)
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                          # React + Vite frontend
│       ├── src/
│       │   ├── features/
│       │   │   ├── auth/             # Login, register, token refresh
│       │   │   ├── users/            # User management pages
│       │   │   ├── departments/      # Department pages
│       │   │   ├── purchase-requests/# PR creation, editing, detail
│       │   │   ├── approvals/        # Approval queue, review
│       │   │   ├── dashboard/        # Dashboard views
│       │   │   ├── reports/          # Report generation UI
│       │   │   └── notifications/    # Notification center
│       │   ├── components/           # Shared UI components
│       │   │   ├── ui/               # Buttons, inputs, modals
│       │   │   ├── layout/           # Header, sidebar, page shell
│       │   │   └── data-display/     # Tables, cards, badges
│       │   ├── hooks/                # Custom React hooks
│       │   ├── lib/                  # API client, utilities
│       │   ├── stores/               # Zustand stores
│       │   ├── routes/               # Route definitions
│       │   ├── types/                # TypeScript interfaces
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared types, constants, validation
│       ├── src/
│       │   ├── types/                # DTOs, enums, interfaces
│       │   │   ├── user.types.ts
│       │   │   ├── department.types.ts
│       │   │   ├── purchase-request.types.ts
│       │   │   ├── approval.types.ts
│       │   │   └── api.types.ts
│       │   ├── constants/            # Shared enums, role definitions
│       │   │   ├── roles.ts
│       │   │   ├── pr-status.ts
│       │   │   └── approval-actions.ts
│       │   ├── validation/           # Shared Zod schemas
│       │   │   ├── user.schema.ts
│       │   │   ├── purchase-request.schema.ts
│       │   │   └── department.schema.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml
├── .env.example
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
└── tsconfig.base.json
```

### 1.2 Client-Server Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    React + Vite (SPA)                          │  │
│  │                                                                │  │
│  │  ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │  Auth    │    │  PR      │  │ Approval │  │  Dashboard   │  │  │
│  │  │  Pages   │    │  Module  │  │  Queue   │  │  & Reports   │  │  │
│  │  └────┬─────┘    └────┬─────┘  └────┬─────┘  └──────┬───────┘  │  │
│  │       │               │             │               │          │  │
│  │  ┌────┴───────────────┴─────────────┴───────────────┴───────┐  │  │
│  │  │           React Query (Server State Cache)               │  │  │
│  │  │           Zustand (Client State)                         │  │  │
│  │  └───────────────────────┬──────────────────────────────────┘  │  │
│  └──────────────────────────┼─────────────────────────────────────┘  │
│                             │ HTTPS / WSS                            │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SERVER (NestJS)                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Middleware: CORS │ Helmet │ Rate Limit │ Request Logger       │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Guards: JWT Auth │ Roles │ Ownership                          │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Interceptors: Response Transform │ Logging │ Timeout          │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Pipes: ValidationPipe (class-validator) │ ParseObjectIdPipe   │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               ▼                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Auth    │ │  Users   │ │ Purchase │ │ Approval │ │ Reports  │    │
│  │ Module   │ │ Module   │ │ Requests │ │ Module   │ │ Module   │    │
│  │          │ │          │ │  Module  │ │          │ │          │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │            │            │            │            │          │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴─────┐    │
│  │               Repository Layer (Mongoose ODM)                │    │
│  └────────────────────────────┬─────────────────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │   MongoDB    │  │  Local FS    │  │  (Future: Redis for      │    │
│  │   (Primary   │  │  / S3        │  │   sessions, queues,      │    │
│  │    Database) │  │  (Files)     │  │   caching)               │    │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Interaction Overview

```
┌───────────┐     ┌──────────────┐     ┌───────────────┐
│  Web App  │────▶│   API        │────▶│   MongoDB     │
│  (React)  │◀────│   (NestJS)   │◀────│               │
└───────────┘     └──────┬───────┘     └───────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌──────────────┐
        │  File    │ │ Email  │ │ WebSocket/   │
        │  Storage │ │ (SMTP) │ │ SSE Gateway  │
        └──────────┘ └────────┘ └──────────────┘

Data Flow for Purchase Request Lifecycle (Approve First, Procure After):

  All PRs go to approval first. Procurement acts only on approved needs.

  DRAFT → LEVEL1_REVIEW → LEVEL2_REVIEW → LEVEL3_REVIEW
    ├─ (no procurement items) → APPROVED
    └─ (has procurement items) → PENDING_QUOTATION → QUOTED → APPROVED

  Dept head requesters skip LEVEL1. Any level can REJECT or RETURN → DRAFT.
  RETURN from QUOTED → PENDING_QUOTATION (procurement revises).
  COO does price sign-off on QUOTED for all procurement PRs.
```

### 1.4 Technology Decisions Summary

| Concern            | Choice                       | Rationale                                                       |
| ------------------ | ---------------------------- | --------------------------------------------------------------- |
| Backend framework  | NestJS                       | Modular, TypeScript-first, enterprise patterns built in         |
| Database           | MongoDB                      | Flexible schema for PR items, embedded documents for line items |
| ODM                | Mongoose                     | Mature, schema validation, middleware hooks, population         |
| Frontend framework | React + Vite                 | Fast HMR, TypeScript support, large ecosystem                   |
| Server state       | React Query (TanStack Query) | Caching, background refetch, optimistic updates                 |
| Client state       | Zustand                      | Lightweight, no boilerplate, TypeScript-friendly                |
| Forms              | React Hook Form + Zod        | Performant (uncontrolled), schema-based validation              |
| Auth               | JWT + refresh tokens         | Stateless, scalable, standard approach                          |
| Monorepo           | Turborepo + npm workspaces   | Shared types, parallel builds, dependency management            |
| Testing            | Jest, Vitest, Playwright     | Mature ecosystems, fast execution, reliable E2E                 |

---

## 2. Backend Architecture (NestJS)

### 2.1 Module Structure

Each business domain maps to a NestJS module following a consistent layered architecture:

```
Module Structure (per domain):
┌──────────────────────────────────────────────────┐
│                   Module                         │
│                                                  │
│  ┌────────────┐                                  │
│  │ Controller │  Handles HTTP requests, routes   │
│  │            │  Input validation (DTOs + Pipes) │
│  └─────┬──────┘  Response serialization          │
│        │                                         │
│  ┌─────▼──────┐                                  │
│  │  Service   │  Business logic                  │
│  │            │  Orchestrates operations         │
│  └─────┬──────┘  Emits events                    │
│        │                                         │
│  ┌─────▼──────┐                                  │
│  │ Repository │  Data access abstraction         │
│  │            │  Mongoose queries                │
│  └─────┬──────┘  Pagination, filtering           │
│        │                                         │
│  ┌─────▼──────┐                                  │
│  │   Model    │  Mongoose schema definition      │
│  │  (Schema)  │  Indexes, virtuals, hooks        │
│  └────────────┘                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 2.2 Module Dependency Diagram

```
                         ┌────────────┐
                         │   App      │
                         │  Module    │
                         └─────┬──────┘
                               │
            ┌──────────────────┼──────────────────────┐
            │                  │                      │
            ▼                  ▼                      ▼
     ┌────────────┐    ┌────────────┐          ┌────────────┐
     │  Config    │    │  Database  │          │   Common   │
     │  Module    │    │  Module    │          │  Module    │
     └────────────┘    └────────────┘          └────────────┘
            │                                        │
            ▼                                        ▼
     ┌────────────┐                         Guards, Interceptors,
     │   Auth     │◀──────────────┐         Pipes, Filters
     │  Module    │               │
     └─────┬──────┘               │
           │                      │
     ┌─────▼──────┐        ┌─────┴──────┐
     │   Users    │◀───────│ Departments│
     │  Module    │        │  Module    │
     └─────┬──────┘        └─────┬──────┘
           │                     │
           └──────────┬──────────┘
                      ▼
              ┌────────────────┐
              │   Purchase     │
              │   Requests     │◀──── ┌────────────┐
              │   Module       │      │ PR Number  │
              └───────┬────────┘      │ Module     │
                      │               └────────────┘
                      ▼
              ┌────────────────┐
              │   Approvals    │
              │   Module       │
              └───────┬────────┘
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
    ┌───────────┐ ┌────────┐ ┌────────────┐
    │Notificat- │ │ Audit  │ │  Reports   │
    │  ions     │ │ Module │ │  Module    │
    └───────────┘ └────────┘ └────────────┘
                      │
                      ▼
              ┌────────────────┐
              │   Dashboard    │
              │   Module       │
              └────────────────┘
              (reads from PRs,
               Approvals, Users)

    ┌────────────────┐
    │   Search       │
    │   Module       │
    └────────────────┘
    (reads from PRs,
     uses MongoDB text index)
```

### 2.3 Key NestJS Patterns

#### Guards

| Guard                     | Purpose                                            | Applied To                    |
| ------------------------- | -------------------------------------------------- | ----------------------------- |
| `JwtAuthGuard`            | Validates JWT access token                         | All protected routes (global) |
| `RolesGuard`              | Checks user role against `@Roles()` decorator      | Role-restricted endpoints     |
| `OwnershipGuard`          | Verifies resource ownership                        | Edit/delete own resources     |
| `ApprovalPermissionGuard` | Validates approver has authority for this PR level | Approval endpoints            |

#### Interceptors

| Interceptor            | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `TransformInterceptor` | Wraps all responses in standard envelope `{ success, data, message, meta }` |
| `LoggingInterceptor`   | Logs request method, URL, duration, status code                             |
| `TimeoutInterceptor`   | Enforces 30s timeout on all requests (120s for report generation)           |
| `AuditInterceptor`     | Captures write operations for audit log                                     |

#### Pipes

| Pipe                      | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `ValidationPipe` (global) | Validates DTOs with class-validator, whitelist unknown fields |
| `ParseObjectIdPipe`       | Validates and converts string params to MongoDB ObjectId      |
| `TrimPipe`                | Trims whitespace from string inputs                           |
| `SanitizeHtmlPipe`        | Strips dangerous HTML from text fields                        |

#### Middleware

| Middleware                | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `CorrelationIdMiddleware` | Generates/propagates `X-Correlation-ID` header for request tracing |
| `RequestLoggerMiddleware` | Logs incoming requests with method, path, IP, user agent           |

### 2.4 MongoDB Schema Design

#### 2.4.1 `users` Collection

```typescript
{
  _id:              ObjectId,
  employeeId:       String,          // Unique, e.g., "EMP-0042"
  email:            String,          // Unique, lowercase, trimmed
  passwordHash:     String,          // bcrypt hashed
  firstName:        String,
  lastName:         String,
  role:             String,          // Enum: 'admin','ceo','coo','dept_head','staff'
  departmentId:     ObjectId | null, // Ref: departments (null for CEO/admin)
  isActive:         Boolean,         // Soft disable (default: true)
  refreshToken:     String | null,   // Hashed refresh token
  lastLoginAt:      Date | null,
  createdAt:        Date,            // Mongoose timestamps
  updatedAt:        Date
}

Indexes:
  - { email: 1 }                     unique
  - { employeeId: 1 }                unique
  - { role: 1 }
  - { departmentId: 1 }
  - { isActive: 1, role: 1 }         compound for active user queries
```

#### 2.4.2 `departments` Collection

```typescript
{
  _id:              ObjectId,
  name:             String,          // Unique, e.g., "Engineering"
  code:             String,          // Unique, e.g., "ENG" (used in PR numbering)
  description:      String,
  headId:           ObjectId | null, // Ref: users (department head)
  isActive:         Boolean,         // default: true
  createdAt:        Date,
  updatedAt:        Date
}

Indexes:
  - { name: 1 }                      unique
  - { code: 1 }                      unique
  - { headId: 1 }
```

#### 2.4.3 `purchase-requests` Collection

```typescript
{
  _id:              ObjectId,
  prNumber:         String,          // Unique, auto-generated, e.g., "PR-ENG-2026-00042"
  title:            String,
  description:      String,
  requesterId:      ObjectId,        // Ref: users
  departmentId:     ObjectId,        // Ref: departments
  status:           String,          // Enum: see Status State Machine (Section 5)
  priority:         String,          // Enum: 'low','medium','high','urgent'

  // --- Embedded line items (1-to-many, always loaded with PR) ---
  items: [{
    _id:            ObjectId,        // Sub-document ID
    description:    String,
    quantity:        Number,          // min: 1
    unit:           String,          // e.g., "pcs", "box", "lot"
    estimatedPrice: Number,          // min: 0
    totalPrice:     Number,          // quantity * estimatedPrice (computed)
    notes:          String | null
  }],

  totalAmount:      Number,          // Sum of all items' totalPrice
  currency:         String,          // Default: "PHP"
  justification:    String,          // Business justification
  neededByDate:     Date | null,     // Requested delivery date

  // --- Attachments (embedded, file metadata) ---
  attachments: [{
    _id:            ObjectId,
    originalName:   String,          // Original filename
    storagePath:    String,          // Relative path on disk / S3 key
    mimeType:       String,
    size:           Number,          // Bytes
    uploadedBy:     ObjectId,        // Ref: users
    uploadedAt:     Date
  }],

  // --- Current approval tracking ---
  currentApprovalLevel: Number,      // 1=Dept Head, 2=COO, 3=CEO
  approvalHistory:  [ObjectId],      // Refs: approvals (ordered)

  submittedAt:      Date | null,
  completedAt:      Date | null,     // Date of final approval/rejection
  createdAt:        Date,
  updatedAt:        Date
}

Indexes:
  - { prNumber: 1 }                  unique
  - { requesterId: 1, status: 1 }    user's PRs by status
  - { departmentId: 1, status: 1 }   department PRs
  - { status: 1, createdAt: -1 }     status filter + chronological
  - { currentApprovalLevel: 1, status: 1 }  approval queue queries
  - { createdAt: -1 }                default sort
  - { title: "text", description: "text", prNumber: "text" }  full-text search
```

**Design Decision: Embedding Items & Attachments**

Items and attachments are embedded within the purchase request document rather than referenced in separate collections because:

- They are always accessed together with the parent PR (no independent queries).
- The number of items per PR is bounded (typically 1-50).
- Atomic updates: adding/removing items is a single document operation.
- Reduces query complexity and round trips.

#### 2.4.4 `approvals` Collection

```typescript
{
  _id:              ObjectId,
  purchaseRequestId: ObjectId,       // Ref: purchase-requests
  approverId:       ObjectId,        // Ref: users (the approver)
  approvalLevel:    Number,          // 1=Dept Head, 2=COO, 3=CEO
  action:           String,          // Enum: 'approved','rejected','returned'
  comments:         String,          // Approver's remarks
  conditions:       String | null,   // Conditional approval notes
  actionDate:       Date,            // When action was taken
  createdAt:        Date,
  updatedAt:        Date
}

Indexes:
  - { purchaseRequestId: 1, approvalLevel: 1 }  find approval by PR + level
  - { approverId: 1, actionDate: -1 }           approver's history
  - { purchaseRequestId: 1, createdAt: 1 }      approval chain order
```

**Design Decision: Separate Collection for Approvals**

Approvals are stored in a separate collection rather than embedded because:

- They are queried independently (e.g., "show all approvals by this user").
- The approval history can grow and is needed for audit/reporting.
- Separate collection enables efficient aggregation queries across all approvals.

#### 2.4.5 `notifications` Collection

```typescript
{
  _id:              ObjectId,
  recipientId:      ObjectId,        // Ref: users
  type:             String,          // Enum: 'pr_submitted','pr_approved','pr_rejected',
                                     //        'pr_returned','approval_needed','pr_updated'
  title:            String,
  message:          String,
  referenceType:    String,          // 'purchase-request' | 'approval'
  referenceId:      ObjectId,        // Ref to related document
  isRead:           Boolean,         // default: false
  readAt:           Date | null,
  createdAt:        Date
}

Indexes:
  - { recipientId: 1, isRead: 1, createdAt: -1 }  unread notifications for user
  - { recipientId: 1, createdAt: -1 }              all notifications for user
  - { createdAt: 1 }                                TTL index (auto-delete after 90 days)
```

#### 2.4.6 `audit-logs` Collection

```typescript
{
  _id:              ObjectId,
  userId:           ObjectId,        // Ref: users (who performed the action)
  action:           String,          // Enum: 'create','update','delete','approve',
                                     //        'reject','return','submit','login','logout'
  resource:         String,          // 'purchase-request','user','department','approval'
  resourceId:       ObjectId,        // ID of affected document
  changes:          Object | null,   // { field: { from: oldVal, to: newVal } }
  ipAddress:        String,
  userAgent:        String,
  correlationId:    String,          // Request correlation ID
  createdAt:        Date             // Immutable, no updatedAt
}

Indexes:
  - { userId: 1, createdAt: -1 }
  - { resource: 1, resourceId: 1, createdAt: -1 }
  - { action: 1, createdAt: -1 }
  - { createdAt: 1 }                 TTL index (auto-delete after 365 days)
```

#### 2.4.7 `pr-number-sequences` Collection

```typescript
{
  _id:              ObjectId,
  departmentCode:   String,          // e.g., "ENG"
  year:             Number,          // e.g., 2026
  currentSequence:  Number,          // Auto-incrementing counter
  prefix:           String,          // e.g., "PR" (configurable)
  updatedAt:        Date
}

Indexes:
  - { departmentCode: 1, year: 1 }   unique compound
```

**PR Number Format**: `{prefix}-{departmentCode}-{year}-{sequence:5}`
Example: `PR-ENG-2026-00042`

The sequence is incremented atomically using MongoDB's `findOneAndUpdate` with `$inc` to prevent duplicates under concurrency.

### 2.5 Collection Relationship Map

```
 users ─────────────┐
   │                 │
   │ departmentId    │ headId
   ▼                 ▼
 departments ◀───── users

 users ◀──── purchase-requests (requesterId)
 departments ◀──── purchase-requests (departmentId)

 purchase-requests ───── approvals (purchaseRequestId)
                          │
                          │ approverId
                          ▼
                        users

 users ◀──── notifications (recipientId)
 purchase-requests ◀──── notifications (referenceId)

 users ◀──── audit-logs (userId)

 departments ◀──── pr-number-sequences (departmentCode)
```

---

## 3. Frontend Architecture (React)

### 3.1 Feature-Based Folder Structure

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   └── useAuth.ts
│   │   ├── api/
│   │   │   └── auth.api.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   │
│   ├── purchase-requests/
│   │   ├── components/
│   │   │   ├── PRForm/
│   │   │   │   ├── PRForm.tsx
│   │   │   │   ├── ItemsFieldArray.tsx
│   │   │   │   ├── AttachmentUpload.tsx
│   │   │   │   └── PRFormSummary.tsx
│   │   │   ├── PRList/
│   │   │   │   ├── PRTable.tsx
│   │   │   │   ├── PRFilters.tsx
│   │   │   │   └── PRStatusBadge.tsx
│   │   │   └── PRDetail/
│   │   │       ├── PRDetailView.tsx
│   │   │       ├── PRTimeline.tsx
│   │   │       └── PRActions.tsx
│   │   ├── hooks/
│   │   │   ├── usePurchaseRequests.ts
│   │   │   ├── useCreatePR.ts
│   │   │   └── useUpdatePR.ts
│   │   ├── api/
│   │   │   └── purchase-requests.api.ts
│   │   ├── types/
│   │   │   └── pr.types.ts
│   │   └── pages/
│   │       ├── PRListPage.tsx
│   │       ├── PRCreatePage.tsx
│   │       ├── PREditPage.tsx
│   │       └── PRDetailPage.tsx
│   │
│   ├── approvals/
│   │   ├── components/
│   │   │   ├── ApprovalQueue.tsx
│   │   │   ├── ApprovalReviewPanel.tsx
│   │   │   └── ApprovalHistoryTimeline.tsx
│   │   ├── hooks/
│   │   │   └── useApprovals.ts
│   │   ├── api/
│   │   │   └── approvals.api.ts
│   │   └── pages/
│   │       ├── ApprovalQueuePage.tsx
│   │       └── ApprovalDetailPage.tsx
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── StatCard.tsx
│   │   │   ├── PRStatusChart.tsx
│   │   │   ├── DepartmentSpendChart.tsx
│   │   │   ├── RecentActivityList.tsx
│   │   │   └── PendingApprovalsList.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardStats.ts
│   │   └── pages/
│   │       └── DashboardPage.tsx
│   │
│   ├── users/
│   ├── departments/
│   ├── reports/
│   └── notifications/
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Pagination.tsx
│   │   └── Toast.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BreadcrumbNav.tsx
│   │   └── PageHeader.tsx
│   └── data-display/
│       ├── DataTable.tsx
│       ├── EmptyState.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   ├── usePermission.ts
│   └── useNotifications.ts
│
├── lib/
│   ├── api-client.ts              # Axios instance with interceptors
│   ├── query-client.ts            # React Query client config
│   ├── utils.ts                   # Formatting, date helpers
│   └── constants.ts
│
├── stores/
│   ├── auth.store.ts              # JWT tokens, user info
│   ├── ui.store.ts                # Sidebar state, theme, modals
│   └── notification.store.ts      # Real-time notification state
│
├── routes/
│   ├── index.tsx                  # Route definitions
│   ├── ProtectedRoute.tsx         # Auth guard wrapper
│   └── RoleRoute.tsx              # Role-based guard wrapper
│
└── types/
    └── global.d.ts
```

### 3.2 State Management Strategy

```
┌─────────────────────────────────────────────────┐
│              State Management                   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │       React Query (TanStack Query)        │  │
│  │       Server State                        │  │
│  │                                           │  │
│  │  - Purchase requests list & detail        │  │
│  │  - Approval queue                         │  │
│  │  - Users, departments                     │  │
│  │  - Dashboard stats                        │  │
│  │  - Notifications list                     │  │
│  │                                           │  │
│  │  Features used:                           │  │
│  │  - Automatic background refetching        │  │
│  │  - Cache invalidation on mutations        │  │
│  │  - Optimistic updates for approvals       │  │
│  │  - Infinite queries for notifications     │  │
│  │  - Prefetching for detail pages           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │          Zustand                          │  │
│  │          Client State                     │  │
│  │                                           │  │
│  │  - Auth state (tokens, current user)      │  │
│  │  - UI state (sidebar, theme, modals)      │  │
│  │  - Notification badge count               │  │
│  │  - Form draft persistence                 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │          React Hook Form                  │  │
│  │          Form State                       │  │
│  │                                           │  │
│  │  - PR creation/edit form                  │  │
│  │  - User management forms                  │  │
│  │  - Department forms                       │  │
│  │  - Approval action form (comments)        │  │
│  │                                           │  │
│  │  Validated with Zod schemas from          │  │
│  │  packages/shared                          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.3 Routing Strategy

```typescript
// Route structure with React Router v6

/login                              // Public
/register                           // Public (admin invite flow)

/dashboard                          // All authenticated users (role-based widgets)

/purchase-requests                  // Staff+: list own PRs; Heads+: dept PRs
/purchase-requests/new              // Staff+: create new PR
/purchase-requests/:id              // Detail view
/purchase-requests/:id/edit         // Edit (only draft status, owner only)

/approvals                          // Dept Head, COO, CEO: approval queue
/approvals/:prId                    // Review and act on specific PR

/users                              // Admin only: user management
/users/new                          // Admin only: create user
/users/:id                          // Admin only: edit user

/departments                        // Admin only: department management
/departments/new                    // Admin only: create department
/departments/:id                    // Admin only: edit department

/reports                            // Dept Head+: report generation
/reports/generate                   // Report configuration page

/settings                           // Admin: system settings, PR numbering
/settings/pr-numbering              // Admin: PR numbering configuration

/notifications                      // All users: notification history
```

### 3.4 Component Hierarchy

```
<App>
  <QueryClientProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <LoginPage />
          <RegisterPage />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>        ← Sidebar + Header + Main
            <Route element={<RoleRoute roles={['*']} />}>
              <DashboardPage />
              <PRListPage />
              <PRDetailPage />
              <NotificationsPage />
            </Route>
            <Route element={<RoleRoute roles={['staff','dept_head','coo','ceo']} />}>
              <PRCreatePage />
              <PREditPage />
            </Route>
            <Route element={<RoleRoute roles={['dept_head','coo','ceo']} />}>
              <ApprovalQueuePage />
              <ApprovalDetailPage />
              <ReportsPage />
            </Route>
            <Route element={<RoleRoute roles={['admin']} />}>
              <UsersPage />
              <DepartmentsPage />
              <SettingsPage />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
</App>
```

### 3.5 Role-Based Rendering

The frontend enforces role-based UI at three levels:

1. **Route Level**: `RoleRoute` component redirects unauthorized users.
2. **Component Level**: `<Can role={['dept_head','coo','ceo']}>` wrapper hides UI elements.
3. **Hook Level**: `usePermission('approve_pr')` returns boolean for conditional logic.

Note: All authorization is enforced on the backend. Frontend role checks are for UX only and must never be relied upon for security.

---

## 4. Authentication & Authorization

### 4.1 JWT Flow with Refresh Tokens

```
┌──────────┐                    ┌──────────┐                ┌──────────┐
│  Client  │                    │  Server  │                │ MongoDB  │
└────┬─────┘                    └────┬─────┘                └────┬─────┘
     │                               │                           │
     │  POST /auth/login             │                           │
     │  { email, password }          │                           │
     │──────────────────────────────▶│                           │
     │                               │   Find user by email     │
     │                               │──────────────────────────▶│
     │                               │◀──────────────────────────│
     │                               │                           │
     │                               │   Verify password (bcrypt)│
     │                               │                           │
     │                               │   Generate tokens:        │
     │                               │   - Access token (15 min) │
     │                               │   - Refresh token (7 days)│
     │                               │                           │
     │                               │   Store hashed refresh    │
     │                               │   token in user doc       │
     │                               │──────────────────────────▶│
     │                               │                           │
     │  { accessToken, refreshToken } │                          │
     │◀──────────────────────────────│                           │
     │                               │                           │
     │  GET /purchase-requests       │                           │
     │  Authorization: Bearer <AT>   │                           │
     │──────────────────────────────▶│                           │
     │                               │   Validate JWT            │
     │                               │   Extract user + role     │
     │  { data: [...] }              │                           │
     │◀──────────────────────────────│                           │
     │                               │                           │
     │  --- Access token expires --- │                           │
     │                               │                           │
     │  POST /auth/refresh           │                           │
     │  { refreshToken }             │                           │
     │──────────────────────────────▶│                           │
     │                               │   Validate refresh token  │
     │                               │   Compare hash in DB      │
     │                               │──────────────────────────▶│
     │                               │◀──────────────────────────│
     │                               │                           │
     │                               │   Rotate: new AT + new RT │
     │                               │   Update hashed RT in DB  │
     │                               │──────────────────────────▶│
     │                               │                           │
     │  { accessToken, refreshToken } │                          │
     │◀──────────────────────────────│                           │
     │                               │                           │
```

**Token Configuration**:

- Access Token: 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- Refresh Token: 7-day expiry, signed with `JWT_REFRESH_SECRET`
- Refresh tokens are hashed (bcrypt) before storage
- Token rotation on every refresh (old RT invalidated)
- Logout clears refresh token from DB

**Frontend Token Management** (via Axios interceptor):

1. Access token stored in memory (Zustand store), never localStorage.
2. Refresh token stored in httpOnly cookie (preferred) or secure localStorage.
3. Axios response interceptor catches 401, queues requests, refreshes token, retries.

### 4.2 RBAC Implementation

#### Role Hierarchy

```
  admin ──────────── Full system access, user/dept management
    │
  ceo ────────────── Final approval authority, all reports
    │
  coo ────────────── Second-level approval, department reports
    │
  dept_head ──────── First-level approval, department PRs
    │
  staff ──────────── Create/edit own PRs, view own dashboard
```

#### Permission Matrix

| Action                 | staff | dept_head | coo | ceo | admin |
| ---------------------- | ----- | --------- | --- | --- | ----- |
| Create PR              | Yes   | Yes       | Yes | Yes | No    |
| Edit own PR (draft)    | Yes   | Yes       | Yes | Yes | No    |
| Delete own PR (draft)  | Yes   | Yes       | Yes | Yes | No    |
| Submit PR              | Yes   | Yes       | Yes | Yes | No    |
| View own PRs           | Yes   | Yes       | Yes | Yes | No    |
| View department PRs    | No    | Yes       | Yes | Yes | Yes   |
| View all PRs           | No    | No        | Yes | Yes | Yes   |
| Approve (Level 1)      | No    | Yes       | No  | No  | No    |
| Approve (Level 2)      | No    | No        | Yes | No  | No    |
| Approve (Level 3)      | No    | No        | No  | Yes | No    |
| Generate reports       | No    | Yes       | Yes | Yes | Yes   |
| Manage users           | No    | No        | No  | No  | Yes   |
| Manage departments     | No    | No        | No  | No  | Yes   |
| Configure PR numbering | No    | No        | No  | No  | Yes   |
| View audit logs        | No    | No        | No  | Yes | Yes   |

#### Backend Guard Implementation

```typescript
// Usage in controller:
@Post(':id/submit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('staff', 'dept_head', 'coo', 'ceo')
async submitPR(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: UserPayload) {
  return this.prService.submit(id, user);
}
```

### 4.3 Frontend Protected Routes

```typescript
// ProtectedRoute.tsx - redirects to /login if not authenticated
// RoleRoute.tsx - redirects to /dashboard if role not in allowed list
// Both check Zustand auth store + validate token expiry
```

---

## 5. Approval Workflow Engine

### 5.1 PR Status State Machine

**Approve First, Procure After** — all PRs go through the approval chain before procurement acts. This prevents procurement from wasting effort sourcing items for requests that might be rejected.

```
                    ┌──────────────────────────────────────────────────────┐
                    │    Purchase Request Status Flow (v2 — Apr 2026)      │
                    └──────────────────────────────────────────────────────┘

                                   User creates PR
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │    DRAFT     │ ◀─────────────────────┐
                                 └──────┬───────┘                       │
                                        │                               │
                                  User submits                          │
                                  (all PRs go to                  RETURNED
                                   approval first)                (back to DRAFT)
                                        │                               │
                                        ▼                               │
                                 ┌──────────────┐                       │
                                 │  LEVEL1      │  (Dept Head Review)   │
                                 │  REVIEW      │  (skipped if dept     │
                                 └──────┬───────┘   head is requester)  │
                                        │                               │
                          ┌─────────────┼──────────────┐                │
                          ▼             ▼              ▼                │
                   ┌──────────┐  ┌──────────┐  ┌──────────┐            │
                   │ LEVEL2   │  │ REJECTED │  │ RETURNED │────────────┘
                   │ REVIEW   │  │          │  │          │
                   │ (COO)    │  └──────────┘  └──────────┘
                   └────┬─────┘
                        │
                 ┌──────┼──────────────┐
                 ▼      ▼              ▼
          ┌──────────┐ ┌──────────┐  ┌──────────┐
          │ LEVEL3   │ │ REJECTED │  │ RETURNED │──────────┐
          │ REVIEW   │ │          │  │          │          │
          │ (CEO)    │ └──────────┘  └──────────┘     back to DRAFT
          └────┬─────┘
               │
        ┌──────┴──────────────────────┐
        ▼                             ▼
 (no procurement items)      (has procurement items)
 ┌──────────┐              ┌──────────────────┐
 │ APPROVED │              │ PENDING_QUOTATION│ ◀──── RETURN from QUOTED
 │ (final)  │              │ (Procurement     │       (procurement revises)
 └──────────┘              │  sources items)  │
                           └────────┬─────────┘
                                    │
                              Procurement submits
                              canvass & quotation
                                    │
                                    ▼
                           ┌──────────────────┐
                           │     QUOTED        │
                           │ (COO price review)│
                           └────────┬──────────┘
                                    │
                             ┌──────┴──────┐
                             ▼             ▼
                      ┌──────────┐  ┌──────────────────┐
                      │ APPROVED │  │ RETURN → back to  │
                      │ (final)  │  │ PENDING_QUOTATION │
                      └──────────┘  └──────────────────┘

  Additional statuses:
  - RETURNED_FOR_INFO: Procurement returns PR to requester for clarification
    during canvassing. Requester updates and resubmits → PENDING_QUOTATION.
  - CANCELLED: Requester can cancel Draft or in-review PRs (before approval
    completes). Post-approval PRs (PENDING_QUOTATION, QUOTED) cannot be cancelled.
```

**Status Enum Values**:

```typescript
enum PRStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",        // Legacy — normalized to LEVEL1_REVIEW
  LEVEL1_REVIEW = "level1_review", // Dept Head reviewing
  LEVEL2_REVIEW = "level2_review", // COO reviewing
  LEVEL3_REVIEW = "level3_review", // CEO reviewing
  PENDING_QUOTATION = "pending_quotation", // "Pending Procurement" — post-approval, procurement sources suppliers
  QUOTED = "quoted",               // "Price Review" — COO reviews supplier selection & pricing
  APPROVED = "approved",
  REJECTED = "rejected",
  RETURNED = "returned",           // Sent back to requester for revision → DRAFT
  RETURNED_FOR_INFO = "returned_for_info", // Procurement returns for requester clarification
  CANCELLED = "cancelled",         // Cancelled by requester (draft/in-review only, not post-approval)
}
```

### 5.2 Approval Chain Configuration

All PRs go through a fixed 3-level approval chain (Dept Head → COO → CEO). Dept head requesters skip Level 1.

```typescript
const STATUS_TO_LEVEL = {
  LEVEL1_REVIEW: 1, // Dept Head
  LEVEL2_REVIEW: 2, // COO
  LEVEL3_REVIEW: 3, // CEO
  QUOTED: 2,        // COO price sign-off (post-procurement)
};
```

**Post-approval procurement flow**: After CEO approval, if the PR has procurement-sourced items, it moves to `PENDING_QUOTATION`. Procurement sources suppliers, then submits the canvass. The PR moves to `QUOTED` for COO price sign-off. COO approval finalizes the PR.

**COO dual role**: The COO reviews PRs at Level 2 (approving the need) and again at QUOTED (approving the supplier selection and pricing). This ensures budget ownership is maintained.

### 5.3 Event-Driven Status Transitions

```typescript
// Approval workflow (simplified pseudocode)
class ApprovalWorkflowService {
  async submitPR(prId: string, userId: string): Promise<void> {
    // Validate: status must be 'draft', 'returned', or 'returned_for_info'
    // ALL PRs go to approval first (no procurement routing at submit)
    // Dept head requester → LEVEL2_REVIEW (skip L1)
    // Staff requester → LEVEL1_REVIEW
    // Notify first approver
  }

  async processApproval(prId, approverId, action): Promise<void> {
    // Validate: approver has correct role for current level
    switch (action) {
      case "approved":
        if (currentLevel === CEO) {
          // If PR has procurement items → PENDING_QUOTATION
          // If no procurement items → APPROVED (final)
        } else if (status === QUOTED) {
          // COO price sign-off → APPROVED (final)
        } else {
          // Advance to next level
        }
        break;
      case "rejected":
        // REJECTED (terminal)
        break;
      case "returned":
        if (status === QUOTED) {
          // → PENDING_QUOTATION (procurement revises, not back to DRAFT)
        } else {
          // → RETURNED → DRAFT (requester revises)
        }
        break;
    }
  }

  async submitQuotation(prId, procurementUserId): Promise<void> {
    // Validate canvass entries, evidence files, winner selection
    // Update item prices from winning supplier
    // Status → QUOTED (COO price sign-off)
  }
}
```

**Events Emitted** (using NestJS EventEmitter2):

| Event                  | Payload                                    | Triggered By                              |
| ---------------------- | ------------------------------------------ | ----------------------------------------- |
| `pr.submitted`         | `{ purchaseRequest }`                      | PR submission                             |
| `approval.action`      | `{ approval, purchaseRequest, action }`    | Any approval action (approve/reject/return)|
| `pr.quoted`            | `{ purchaseRequest, quotedBy }`            | Procurement submits canvass               |
| `pr.returned_for_info` | `{ purchaseRequest, returnedBy }`          | Procurement returns for requester info    |
| `pr.recalled`          | `{ purchaseRequest, recalledBy }`          | Requester recalls PR                      |

**Event Listeners**:

- `NotificationsService` listens to all events to create notifications.
- `AuditService` listens to all events to create audit log entries.

---

## 6. API Design

### 6.1 Standard Response Envelope

All API responses follow a consistent envelope structure:

```typescript
// Success response
{
  "success": true,
  "data": { ... } | [ ... ],
  "message": "Purchase request created successfully",
  "meta": {                          // Present only for paginated responses
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}

// Error response
{
  "success": false,
  "data": null,
  "message": "Purchase request not found",
  "errors": [                        // Present for validation errors
    {
      "field": "items[0].quantity",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

### 6.2 RESTful Endpoints

#### Authentication

| Method | Endpoint                    | Description              | Auth             |
| ------ | --------------------------- | ------------------------ | ---------------- |
| POST   | `/api/auth/login`           | Login, returns tokens    | No               |
| POST   | `/api/auth/refresh`         | Refresh access token     | No (RT required) |
| POST   | `/api/auth/logout`          | Invalidate refresh token | Yes              |
| GET    | `/api/auth/me`              | Get current user profile | Yes              |
| PATCH  | `/api/auth/change-password` | Change own password      | Yes              |

#### Users

| Method | Endpoint                    | Description                        | Roles |
| ------ | --------------------------- | ---------------------------------- | ----- |
| GET    | `/api/users`                | List users (paginated, filterable) | admin |
| GET    | `/api/users/:id`            | Get user detail                    | admin |
| POST   | `/api/users`                | Create user                        | admin |
| PATCH  | `/api/users/:id`            | Update user                        | admin |
| PATCH  | `/api/users/:id/deactivate` | Deactivate user                    | admin |
| PATCH  | `/api/users/:id/activate`   | Reactivate user                    | admin |

#### Departments

| Method | Endpoint               | Description            | Roles             |
| ------ | ---------------------- | ---------------------- | ----------------- |
| GET    | `/api/departments`     | List departments       | all authenticated |
| GET    | `/api/departments/:id` | Get department detail  | all authenticated |
| POST   | `/api/departments`     | Create department      | admin             |
| PATCH  | `/api/departments/:id` | Update department      | admin             |
| DELETE | `/api/departments/:id` | Soft delete department | admin             |

#### Purchase Requests

| Method | Endpoint                                                        | Description                                      | Roles                      |
| ------ | --------------------------------------------------------------- | ------------------------------------------------ | -------------------------- |
| GET    | `/api/purchase-requests`                                        | List PRs (scoped by role)                        | all authenticated          |
| GET    | `/api/purchase-requests/:id`                                    | Get PR detail with items, attachments, approvals | all authenticated          |
| POST   | `/api/purchase-requests`                                        | Create new PR (draft)                            | staff, dept_head, coo, ceo |
| PATCH  | `/api/purchase-requests/:id`                                    | Update PR (draft/returned only)                  | owner                      |
| DELETE | `/api/purchase-requests/:id`                                    | Delete PR (draft only)                           | owner                      |
| POST   | `/api/purchase-requests/:id/submit`                             | Submit PR for approval                           | owner                      |
| POST   | `/api/purchase-requests/:id/cancel`                             | Cancel PR                                        | owner (draft/returned)     |
| POST   | `/api/purchase-requests/:id/attachments`                        | Upload attachment(s)                             | owner (draft/returned)     |
| DELETE | `/api/purchase-requests/:id/attachments/:attachmentId`          | Remove attachment                                | owner (draft/returned)     |
| GET    | `/api/purchase-requests/:id/attachments/:attachmentId/download` | Download attachment                              | authorized viewers         |

#### Approvals

| Method | Endpoint                       | Description                            | Roles               |
| ------ | ------------------------------ | -------------------------------------- | ------------------- |
| GET    | `/api/approvals/queue`         | Get pending approvals for current user | dept_head, coo, ceo |
| GET    | `/api/approvals/history`       | Get approval history for current user  | dept_head, coo, ceo |
| POST   | `/api/approvals/:prId/approve` | Approve a PR                           | authorized approver |
| POST   | `/api/approvals/:prId/reject`  | Reject a PR                            | authorized approver |
| POST   | `/api/approvals/:prId/return`  | Return PR for revision                 | authorized approver |

#### Dashboard

| Method | Endpoint                            | Description            | Roles                      |
| ------ | ----------------------------------- | ---------------------- | -------------------------- |
| GET    | `/api/dashboard/stats`              | Role-based statistics  | all authenticated          |
| GET    | `/api/dashboard/recent-activity`    | Recent PR activity     | all authenticated          |
| GET    | `/api/dashboard/pending-approvals`  | Pending count by level | dept_head, coo, ceo        |
| GET    | `/api/dashboard/department-summary` | Dept spending summary  | dept_head, coo, ceo, admin |

#### Search

| Method | Endpoint                              | Description                 | Roles          |
| ------ | ------------------------------------- | --------------------------- | -------------- |
| GET    | `/api/search/purchase-requests?q=...` | Full-text search across PRs | scoped by role |

#### Reports

| Method | Endpoint                    | Description               | Roles                      |
| ------ | --------------------------- | ------------------------- | -------------------------- |
| POST   | `/api/reports/generate`     | Generate report (async)   | dept_head, coo, ceo, admin |
| GET    | `/api/reports/:id/status`   | Check generation status   | report owner               |
| GET    | `/api/reports/:id/download` | Download generated report | report owner               |

#### Notifications

| Method | Endpoint                          | Description                   | Roles             |
| ------ | --------------------------------- | ----------------------------- | ----------------- |
| GET    | `/api/notifications`              | Get notifications (paginated) | all authenticated |
| GET    | `/api/notifications/unread-count` | Get unread count              | all authenticated |
| PATCH  | `/api/notifications/:id/read`     | Mark as read                  | owner             |
| PATCH  | `/api/notifications/read-all`     | Mark all as read              | owner             |

#### PR Numbering

| Method | Endpoint                             | Description             | Roles |
| ------ | ------------------------------------ | ----------------------- | ----- |
| GET    | `/api/settings/pr-numbering`         | Get numbering config    | admin |
| PATCH  | `/api/settings/pr-numbering`         | Update numbering config | admin |
| GET    | `/api/settings/pr-numbering/preview` | Preview next number     | admin |

#### Audit Logs

| Method | Endpoint                                    | Description                             | Roles      |
| ------ | ------------------------------------------- | --------------------------------------- | ---------- |
| GET    | `/api/audit-logs`                           | List audit logs (paginated, filterable) | ceo, admin |
| GET    | `/api/audit-logs/:resourceType/:resourceId` | Logs for specific resource              | ceo, admin |

### 6.3 Pagination, Filtering, and Sorting

All list endpoints support consistent query parameters:

```
GET /api/purchase-requests?page=1&limit=20&sort=-createdAt&status=submitted&departmentId=abc123

Query Parameters:
  page        Number    Page number (default: 1)
  limit       Number    Items per page (default: 20, max: 100)
  sort        String    Sort field, prefix with "-" for descending (default: "-createdAt")
  search      String    Full-text search query
  status      String    Filter by status (comma-separated for multiple)
  departmentId String   Filter by department
  requesterId  String   Filter by requester
  priority    String    Filter by priority
  dateFrom    String    Filter by createdAt >= (ISO date)
  dateTo      String    Filter by createdAt <= (ISO date)
  minAmount   Number    Filter by totalAmount >=
  maxAmount   Number    Filter by totalAmount <=
```

### 6.4 Error Handling Format

```typescript
// HTTP Status Codes used:
// 200 - Success
// 201 - Created
// 400 - Bad Request (validation errors)
// 401 - Unauthorized (invalid/missing token)
// 403 - Forbidden (insufficient role)
// 404 - Not Found
// 409 - Conflict (duplicate PR number, email)
// 413 - Payload Too Large (file upload)
// 422 - Unprocessable Entity (business rule violation)
// 429 - Too Many Requests (rate limited)
// 500 - Internal Server Error

// Business rule violation example (422):
{
  "success": false,
  "data": null,
  "message": "Cannot submit purchase request: PR must have at least one item",
  "errorCode": "PR_NO_ITEMS"
}
```

---

## 7. File Upload Strategy

### 7.1 Multer Configuration

```typescript
// File upload configuration
const uploadConfig = {
  storage: diskStorage({
    destination: "./uploads/attachments",
    filename: (req, file, cb) => {
      // Format: {prId}/{uuid}-{originalname}
      const uniqueName = `${uuidv4()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException("File type not allowed"), false);
    }
  },
};
```

### 7.2 Storage Strategy

```
Phase 1 (Local Filesystem):
  uploads/
  └── attachments/
      └── {purchaseRequestId}/
          ├── a1b2c3d4-quotation.pdf
          ├── e5f6g7h8-photo.jpg
          └── i9j0k1l2-specs.xlsx

Phase 2 (S3-Compatible):
  Bucket: pr-attachments
  Key: attachments/{purchaseRequestId}/{uuid}-{originalname}

  Migration:
  - Abstract storage behind FileStorageService interface
  - LocalStorageAdapter (Phase 1)
  - S3StorageAdapter (Phase 2)
  - Switch via environment variable: FILE_STORAGE_DRIVER=local|s3
```

### 7.3 File Storage Service Interface

```typescript
interface FileStorageService {
  upload(file: Express.Multer.File, path: string): Promise<StoredFile>;
  download(path: string): Promise<ReadableStream>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}
```

### 7.4 File Validation

- **Server-side MIME type verification**: Read file magic bytes, do not trust `Content-Type` header alone.
- **Filename sanitization**: Strip path traversal characters, limit length.
- **Virus scanning**: Future consideration (ClamAV integration).
- **Total storage per PR**: Soft limit of 50 MB (all attachments combined).

---

## 8. Report Generation

### 8.1 Excel Generation (ExcelJS)

```typescript
// Report types:
// 1. PR Summary Report (list of PRs with status, amounts)
// 2. Department Spending Report (grouped by department)
// 3. Approval Activity Report (approver actions, turnaround time)
// 4. Monthly/Quarterly PR Report (time-based aggregation)

// ExcelJS approach:
class ExcelReportService {
  async generatePRSummary(filters: ReportFilters): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PR Summary");

    // Header row with styling
    sheet.columns = [
      { header: "PR Number", key: "prNumber", width: 20 },
      { header: "Title", key: "title", width: 30 },
      { header: "Department", key: "department", width: 20 },
      { header: "Requester", key: "requester", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Date Filed", key: "createdAt", width: 15 },
    ];

    // Stream data from MongoDB cursor (memory efficient)
    const cursor = this.prRepository.findWithCursor(filters);
    for await (const pr of cursor) {
      sheet.addRow(this.mapPRToRow(pr));
    }

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
```

### 8.2 PDF Generation (PDFKit)

```typescript
// PDFKit for structured reports (faster, lighter than Puppeteer)
// Puppeteer reserved for complex layouts that need HTML/CSS rendering

class PdfReportService {
  async generatePRDetail(prId: string): Promise<Buffer> {
    const pr = await this.prRepository.findByIdWithRelations(prId);
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Company header
    doc.fontSize(18).text("Purchase Request", { align: "center" });
    doc.fontSize(12).text(`PR Number: ${pr.prNumber}`);
    // ... items table, approval history, signatures

    doc.end();
    return Buffer.concat(chunks);
  }
}
```

### 8.3 Async Generation for Large Reports

For reports spanning many records, generation runs asynchronously:

```
┌──────────┐    POST /reports/generate     ┌──────────┐
│  Client  │──────────────────────────────▶│  Server  │
│          │◀──────────────────────────────│          │
│          │    { reportId, status: 'pending' }       │
│          │                               │          │
│          │                               │  Background job:
│          │                               │  1. Query data
│          │                               │  2. Generate file
│          │                               │  3. Save to disk
│          │                               │  4. Update status
│          │                               │  5. Send notification
│          │                               │          │
│          │    GET /reports/:id/status     │          │
│          │──────────────────────────────▶│          │
│          │◀──────────────────────────────│          │
│          │    { status: 'completed', downloadUrl }  │
│          │                               │          │
│          │    GET /reports/:id/download   │          │
│          │──────────────────────────────▶│          │
│          │◀──────────────────────────────│          │
│          │    (file stream)              │          │
└──────────┘                               └──────────┘
```

For the initial implementation, small-to-medium reports (under 1000 records) generate synchronously and return the file directly. The async pattern is introduced when report complexity warrants it.

---

## 9. Deployment Architecture

### 9.1 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/purchase-requests
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - ./apps/api/src:/app/apps/api/src # Hot reload
      - ./packages/shared/src:/app/packages/shared/src
      - uploads:/app/uploads
    depends_on:
      - mongo

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000/api
    volumes:
      - ./apps/web/src:/app/apps/web/src # HMR

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    command: ["--replSet", "rs0"] # Replica set for transactions

  mongo-init:
    image: mongo:7
    depends_on:
      - mongo
    command: >
      mongosh --host mongo --eval "
        try { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] }) }
        catch(e) { print('Already initialized') }
      "
    restart: "no"

volumes:
  mongo-data:
  uploads:
```

### 9.2 Environment Configuration

```bash
# .env.example

# Server
NODE_ENV=development
PORT=3000
API_PREFIX=api

# MongoDB
MONGODB_URI=mongodb://localhost:27017/purchase-requests

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRY=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760                # 10 MB
FILE_STORAGE_DRIVER=local             # local | s3

# S3 (Phase 2)
# S3_BUCKET=pr-attachments
# S3_REGION=ap-southeast-1
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_ENDPOINT=                        # For MinIO/compatible

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (Phase 2)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=noreply@company.com

# Frontend (Vite)
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

### 9.3 Production Docker Compose (Local Server Deployment)

The production deployment targets a single local server within the company network, using Docker Compose for all services including Nginx as a reverse proxy.

```
Local Server Architecture:
  ┌────────────────────────────────────────────────────────────────┐
  │  Company Local Server (Docker Host)                            │
  │                                                                │
  │  ┌──────────────────────────────────────────────────────────┐ │
  │  │  Docker Compose                                          │ │
  │  │                                                          │ │
  │  │  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐│ │
  │  │  │  Nginx   │──▶│  API     │   │  MongoDB             ││ │
  │  │  │  :80/:443│   │  :3000   │──▶│  :27017              ││ │
  │  │  │  (proxy  │   │  (NestJS)│   │  (Replica Set)       ││ │
  │  │  │  + static│   └──────────┘   └──────────────────────┘│ │
  │  │  │   files) │                                           │ │
  │  │  └──────────┘                                           │ │
  │  │                                                          │ │
  │  │  Volumes:                                                │ │
  │  │  - mongo-data (persistent DB)                            │ │
  │  │  - uploads (PR attachments)                              │ │
  │  │  - mongo-backup (automated backups)                      │ │
  │  └──────────────────────────────────────────────────────────┘ │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘
         │
         │  Company LAN (http://prams.local or IP:80)
         ▼
  ┌──────────────┐
  │  Employee    │
  │  Browsers    │
  └──────────────┘
```

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./apps/web/dist:/usr/share/nginx/html:ro # Built React static files
      - uploads:/usr/share/nginx/uploads:ro # Serve attachments via Nginx
      - ./nginx/ssl:/etc/nginx/ssl:ro # Self-signed or internal CA certs
    depends_on:
      api:
        condition: service_healthy
    restart: always
    networks:
      - prams-network

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: production
    expose:
      - "3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/purchase-requests?replicaSet=rs0
    volumes:
      - uploads:/app/uploads
    depends_on:
      mongo:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3000/api/health",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: always
    networks:
      - prams-network

  mongo:
    image: mongo:7
    expose:
      - "27017"
    volumes:
      - mongo-data:/data/db
      - mongo-backup:/backup
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    command:
      [
        "--replSet",
        "rs0",
        "--bind_ip_all",
        "--auth",
        "--keyFile",
        "/run/secrets/mongo_keyfile",
      ]
    secrets:
      - mongo_keyfile
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s
    restart: always
    networks:
      - prams-network

  mongo-init-rs:
    image: mongo:7
    depends_on:
      mongo:
        condition: service_healthy
    command: >
      mongosh --host mongo --eval "
        try { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] }) }
        catch(e) { print('Already initialized') }
      "
    restart: "no"
    networks:
      - prams-network

  mongo-backup:
    image: mongo:7
    volumes:
      - mongo-backup:/backup
    command: >
      sh -c 'while true; do
        mongodump --host mongo --archive=/backup/prams-$$(date +%Y%m%d_%H%M%S).gz --gzip
        find /backup -name "*.gz" -mtime +30 -delete
        sleep 86400
      done'
    depends_on:
      mongo:
        condition: service_healthy
    restart: always
    networks:
      - prams-network

volumes:
  mongo-data:
    driver: local
  uploads:
    driver: local
  mongo-backup:
    driver: local

networks:
  prams-network:
    driver: bridge

secrets:
  mongo_keyfile:
    file: ./secrets/mongo-keyfile
```

#### Nginx Configuration

```nginx
# nginx/conf.d/prams.conf
upstream api_backend {
    server api:3000;
}

server {
    listen 80;
    server_name prams.local;

    # Redirect to HTTPS (if SSL configured)
    # return 301 https://$host$request_uri;

    # --- Static Frontend (React SPA) ---
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;    # SPA fallback
    }

    # --- API Proxy ---
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long report generation
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # File upload limits
        client_max_body_size 50M;
    }

    # --- WebSocket for Notifications ---
    location /ws/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # --- Attachment Downloads (served by Nginx for performance) ---
    location /uploads/ {
        alias /usr/share/nginx/uploads/;
        add_header X-Content-Type-Options nosniff;
        add_header Content-Disposition "attachment";
        expires 1h;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;
}
```

#### Multi-Stage Dockerfiles

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --production=false

# --- Build ---
FROM deps AS build
COPY . .
RUN npx turbo build --filter=api

# --- Production ---
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/package.json ./apps/api/
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
```

```dockerfile
# apps/web/Dockerfile (build-only, output served by Nginx)
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

FROM deps AS build
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npx turbo build --filter=web

# Output: /app/apps/web/dist (mount into Nginx)
FROM scratch AS output
COPY --from=build /app/apps/web/dist /dist
```

### 9.4 Deployment Commands

```bash
# --- First-time setup on local server ---
# 1. Clone the repository
git clone <repo-url> /opt/prams
cd /opt/prams

# 2. Generate secrets
mkdir -p secrets
openssl rand -base64 756 > secrets/mongo-keyfile
chmod 400 secrets/mongo-keyfile

# 3. Configure environment
cp .env.example .env.production
# Edit .env.production with production values (JWT secrets, CORS, etc.)

# 4. Build and start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 5. Seed initial admin user
docker compose -f docker-compose.prod.yml exec api node dist/database/seed.js

# --- Updating the application ---
git pull origin main
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d --no-deps api

# --- Viewing logs ---
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f nginx

# --- Database backup (manual) ---
docker compose -f docker-compose.prod.yml exec mongo \
  mongodump --archive=/backup/manual-$(date +%Y%m%d).gz --gzip

# --- Database restore ---
docker compose -f docker-compose.prod.yml exec mongo \
  mongorestore --archive=/backup/manual-20260319.gz --gzip --drop
```

### 9.5 Local Server Requirements

| Resource       | Minimum                 | Recommended                           |
| -------------- | ----------------------- | ------------------------------------- |
| CPU            | 2 cores                 | 4 cores                               |
| RAM            | 4 GB                    | 8 GB                                  |
| Storage        | 50 GB                   | 100 GB (depends on attachment volume) |
| OS             | Ubuntu 22.04+ / RHEL 8+ | Ubuntu 24.04 LTS                      |
| Docker         | Docker Engine 24+       | Latest stable                         |
| Docker Compose | v2.20+                  | Latest stable                         |
| Network        | LAN accessible          | Static IP on company network          |

### 9.6 Monitoring and Maintenance

```yaml
# Health check endpoints
GET /api/health          # API health (DB connection, disk space)
GET /api/health/db       # MongoDB connection status
GET /api/health/storage  # Upload storage availability

# Log rotation (handled by Docker)
# docker daemon.json: {"log-driver": "json-file", "log-opts": {"max-size": "50m", "max-file": "5"}}
```

| Maintenance Task         | Frequency         | Method                                        |
| ------------------------ | ----------------- | --------------------------------------------- |
| MongoDB backup           | Daily (automated) | `mongo-backup` container                      |
| Backup retention cleanup | Daily (automated) | Removes backups older than 30 days            |
| Docker image cleanup     | Weekly            | `docker system prune -f`                      |
| Log review               | Weekly            | `docker compose logs --since 7d`              |
| Security updates         | Monthly           | `docker compose pull && docker compose up -d` |
| Storage monitoring       | Weekly            | Check `docker system df` and upload volume    |

---

## 10. Security Considerations

### 10.1 Input Validation

```typescript
// Global ValidationPipe configuration (main.ts)
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true, // Auto-transform types
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

// DTO validation example using class-validator:
class CreatePurchaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePRItemDto)
  items: CreatePRItemDto[];

  @IsEnum(Priority)
  priority: Priority;

  @IsOptional()
  @IsDateString()
  neededByDate?: string;
}
```

### 10.2 Rate Limiting

```typescript
// Global rate limiting (NestJS throttler)
ThrottlerModule.forRoot([
  {
    name: "short",
    ttl: 1000, // 1 second
    limit: 10, // 10 requests per second
  },
  {
    name: "medium",
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  {
    name: "long",
    ttl: 3600000, // 1 hour
    limit: 1000, // 1000 requests per hour
  },
]);

// Stricter limits on auth endpoints:
// POST /auth/login     -> 5 per minute (per IP)
// POST /auth/refresh   -> 10 per minute (per IP)
// POST /auth/register  -> 3 per minute (per IP)
```

### 10.3 CORS Configuration

```typescript
app.enableCors({
  origin: configService.get("CORS_ORIGIN"), // Whitelist frontend origin
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
  credentials: true, // For httpOnly cookies
  maxAge: 86400, // Preflight cache 24h
});
```

### 10.4 Helmet (HTTP Headers)

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For styled-components
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", configService.get("CORS_ORIGIN")],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow file downloads
  }),
);
```

### 10.5 File Upload Restrictions

| Control               | Value                                               |
| --------------------- | --------------------------------------------------- |
| Max file size         | 10 MB per file                                      |
| Max files per request | 5                                                   |
| Allowed types         | PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX           |
| MIME validation       | Magic bytes check (not just extension)              |
| Filename sanitization | Strip path traversal, limit length to 255 chars     |
| Storage isolation     | Files stored outside webroot, served via controller |
| Access control        | Download requires authentication + PR access check  |

### 10.6 Audit Logging

Every write operation and security-relevant event is logged to the `audit-logs` collection:

**Logged Events**:

- User login/logout (success and failure)
- PR creation, update, deletion, submission
- Approval actions (approve, reject, return)
- User management (create, update, deactivate)
- Department management
- File upload/deletion
- Password changes
- Failed authentication attempts
- Role/permission changes

**Audit Log Entry Content**:

- Who (userId)
- What (action, resource, resourceId)
- When (timestamp)
- Where (IP address, user agent)
- How (changes diff for updates)
- Correlation ID (request tracing)

**Retention**: Audit logs are retained for 365 days (configurable TTL index).

### 10.7 Additional Security Measures

| Measure             | Implementation                                              |
| ------------------- | ----------------------------------------------------------- |
| Password hashing    | bcrypt with salt rounds = 12                                |
| MongoDB injection   | Mongoose schema enforcement, no raw query strings           |
| XSS prevention      | Helmet CSP headers, input sanitization, React auto-escaping |
| CSRF protection     | SameSite cookies, custom header validation                  |
| Secrets management  | Environment variables, never in source code                 |
| Dependency security | `npm audit` in CI pipeline, Dependabot/Renovate             |
| Error messages      | Generic messages to client, detailed logs server-side       |
| Account lockout     | Lock after 5 failed login attempts for 15 minutes           |

---

## Appendix A: Testing Strategy

### Backend (Jest)

| Test Type   | Scope                           | Tools                        |
| ----------- | ------------------------------- | ---------------------------- |
| Unit        | Services, utilities, validators | Jest + mocked repositories   |
| Integration | Controllers + services + DB     | Jest + mongodb-memory-server |
| E2E         | Full HTTP request lifecycle     | Jest + Supertest             |

### Frontend (Vitest + RTL)

| Test Type   | Scope                         | Tools                              |
| ----------- | ----------------------------- | ---------------------------------- |
| Unit        | Hooks, utilities, stores      | Vitest                             |
| Component   | UI components in isolation    | Vitest + React Testing Library     |
| Integration | Feature pages with mocked API | Vitest + MSW (Mock Service Worker) |

### E2E (Playwright)

| Flow              | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| Login flow        | Login, token refresh, logout                                  |
| PR lifecycle      | Create draft, add items, submit, approval chain, final status |
| Approval flow     | Dept head approves, COO approves, CEO approves                |
| Report generation | Generate and download Excel/PDF                               |
| Role enforcement  | Verify unauthorized access is blocked                         |

**Target Coverage**: 80% minimum across all packages.

---

## Appendix B: Future Considerations

| Feature                    | Timeline | Notes                                 |
| -------------------------- | -------- | ------------------------------------- |
| Email notifications (SMTP) | Phase 2  | Nodemailer integration                |
| S3 file storage            | Phase 2  | Abstract via FileStorageService       |
| Redis caching              | Phase 2  | Dashboard stats, session management   |
| Delegation/proxy approval  | Phase 3  | Approver assigns delegate             |
| Budget tracking            | Phase 3  | Department budget limits              |
| Procurement integration    | Phase 3  | PO generation from approved PRs       |
| Mobile responsive / PWA    | Phase 3  | Progressive enhancement               |
| Multi-language (i18n)      | Phase 4  | react-i18next                         |
| Advanced analytics         | Phase 4  | MongoDB aggregation pipelines, charts |

---

## Appendix C: ADR Log

### ADR-001: MongoDB Over PostgreSQL for Primary Database

**Context**: Need to store purchase requests with variable-length item arrays and attachments.

**Decision**: Use MongoDB with Mongoose ODM.

**Rationale**:

- Flexible schema accommodates varying PR item structures without migrations.
- Embedded documents (items, attachments) reduce JOIN operations.
- Native JSON storage aligns with API payloads.
- Aggregation framework supports dashboard/report queries.

**Trade-offs**:

- No native foreign key constraints (enforced at application level).
- No multi-collection ACID transactions without replica set (mitigated by Docker replica set setup).
- Less mature tooling for complex relational queries.

### ADR-002: Separate Approvals Collection

**Context**: Approval records needed for both inline PR viewing and independent audit/reporting.

**Decision**: Store approvals in a separate collection, referenced by `purchaseRequestId`.

**Rationale**: Independent querying for approver dashboards, audit reports, and analytics. Prevents unbounded array growth in the PR document.

### ADR-003: Event-Driven Notifications

**Context**: Multiple actions trigger notifications to different users.

**Decision**: Use NestJS EventEmitter2 for internal events, with listeners creating notifications.

**Rationale**: Decouples workflow logic from notification delivery. Easy to add email channel later by adding another listener. Avoids circular dependencies between modules.

### ADR-004: Docker Compose on Local Server Over Cloud Deployment

**Context**: The application needs to be deployed on the company's internal server infrastructure, not on cloud services.

**Decision**: Use Docker Compose for all-in-one deployment on a local server with Nginx as reverse proxy.

**Rationale**:

- Single `docker compose up -d` command for the entire stack (API, frontend, DB, proxy, backups).
- No cloud vendor dependency or recurring cloud costs.
- Data stays within the company network (security/compliance).
- Multi-stage Dockerfiles minimize image size and attack surface.
- Automated daily backups with 30-day retention via a dedicated backup container.
- Easy rollback: `docker compose up -d --no-deps api` to redeploy only the API.

**Trade-offs**:

- Single point of failure (one server) — mitigated by automated backups and monitoring.
- Manual scaling if user base grows significantly — can add Docker Swarm or move to Kubernetes later.
- IT team must maintain the server (OS updates, Docker updates, disk space).

### ADR-005: React Query Over Redux for Server State

**Context**: Need to manage server data (PRs, users, approvals) with caching and synchronization.

**Decision**: Use TanStack Query (React Query) for server state, Zustand for client-only state.

**Rationale**: React Query handles caching, background refetching, optimistic updates, and pagination out of the box. Eliminates boilerplate of Redux actions/reducers for API data. Zustand handles the small amount of pure client state (auth tokens, UI preferences) with minimal ceremony.
