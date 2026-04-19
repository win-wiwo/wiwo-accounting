# Sprint 1 Plan

## Sprint Metadata

| Field              | Value                                                                      |
|--------------------|----------------------------------------------------------------------------|
| **Sprint Number**  | 1                                                                          |
| **Start Date**     | 2026-03-24 (Tuesday)                                                       |
| **End Date**       | 2026-04-06 (Monday)                                                        |
| **Duration**       | 2 weeks (10 working days)                                                  |
| **Sprint Goal**    | Establish project foundation with authentication, user management, and department management |
| **Team Capacity**  | 3 developers x 10 days x 6 productive hours = 180 hours                   |
| **Velocity Target**| 40-50 story points (first sprint baseline)                                 |

---

## Sprint Goal

> **"Establish project foundation with authentication, user management, and department management."**

By the end of this sprint, the team will deliver a working application with:
- Project scaffolding (NestJS API, React frontend, MongoDB database)
- User authentication (login, logout, JWT with refresh tokens)
- User management CRUD for admins
- Department management CRUD with employee assignment and head designation
- Role-based access control middleware
- Basic frontend layout with navigation shell

---

## Selected User Stories

| Story ID | Title                        | Priority  | Points | Epic  |
|----------|------------------------------|-----------|--------|-------|
| US-0101  | User Login                   | Must Have | 5      | EP-01 |
| US-0102  | User Logout                  | Must Have | 2      | EP-01 |
| US-0103  | Create User Account          | Must Have | 5      | EP-01 |
| US-0104  | Edit User Account            | Must Have | 3      | EP-01 |
| US-0105  | Deactivate User Account      | Must Have | 2      | EP-01 |
| US-0106  | View User List               | Must Have | 3      | EP-01 |
| US-0108  | Change Password              | Must Have | 3      | EP-01 |
| US-0201  | Create Department            | Must Have | 3      | EP-02 |
| US-0202  | Edit Department              | Must Have | 2      | EP-02 |
| US-0204  | Assign Employees to Dept     | Must Have | 3      | EP-02 |
| US-0205  | Designate Department Head    | Must Have | 3      | EP-02 |
| US-0206  | View Department List         | Must Have | 2      | EP-02 |
| US-1001  | Role-Based Access Control    | Must Have | 8      | EP-10 |
| US-1006  | JWT Token Refresh            | Must Have | 5      | EP-10 |
| **Total** |                             |           | **49** |       |

---

## Sprint Backlog - Task Breakdown

### Technical Task 0: Project Scaffolding and Infrastructure

**TT-001: Initialize NestJS Backend** (8 hours)
- Create NestJS project with TypeScript strict mode
- Configure ESLint, Prettier, and Husky pre-commit hooks
- Set up folder structure: `src/{modules, common, config, database}`
- Configure environment variables (.env) with validation (Joi schema)
- Set up Swagger/OpenAPI documentation
- Configure CORS and Helmet security headers

**TT-002: Initialize React Frontend** (6 hours)
- Create React project with Vite and TypeScript
- Install and configure: React Router, Axios, React Query, Ant Design (or MUI)
- Set up folder structure: `src/{components, pages, hooks, services, store, types, utils}`
- Configure ESLint, Prettier, and path aliases
- Set up environment variable handling

**TT-003: MongoDB Database Setup** (4 hours)
- Configure Mongoose ODM with NestJS
- Create database connection module with retry logic
- Set up MongoDB indexes strategy document
- Configure connection pooling
- Create seed script for initial admin user

**TT-004: Docker & CI/CD Setup** (8 hours)
- Create `docker-compose.yml` for local development (API with hot-reload, frontend with HMR, MongoDB replica set)
- Create `docker-compose.prod.yml` for production deployment on local server (Nginx reverse proxy, multi-stage builds, health checks, auto-backup container)
- Write multi-stage Dockerfiles for API and web (dev + production targets)
- Create Nginx configuration (reverse proxy to API, serve React SPA, WebSocket support, file upload limits)
- Create deployment scripts (`scripts/deploy.sh`, `scripts/backup.sh`, `scripts/restore.sh`)
- Create GitHub Actions workflow for: lint, test, build, Docker image build
- Create Makefile with common operations (`make dev`, `make build`, `make deploy`, `make logs`)
- Set up test coverage reporting

**TT-005: Testing Infrastructure** (4 hours)
- Configure Jest for backend (unit + integration)
- Configure Vitest for frontend
- Set up test database configuration (in-memory MongoDB or test container)
- Create test utilities and helper modules
- Configure coverage thresholds (80% minimum)

**TT-006: Frontend Layout Shell** (6 hours)
- Create main layout component with sidebar navigation and header
- Implement responsive sidebar with role-based menu items
- Create header with user info dropdown and notification bell placeholder
- Build breadcrumb navigation component
- Create 404 and 403 error pages

> **Technical Tasks Subtotal: 32 hours**

---

### US-0101: User Login (5 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0101a | Create User Mongoose schema (name, email, password hash, role, department, status, lastLogin) | 2 | Dev 1 |
| T-0101b | Implement AuthModule with JWT strategy (access token: 15min, refresh token: 7d) | 4 | Dev 1 |
| T-0101c | Create POST `/api/auth/login` endpoint with input validation (class-validator) | 3 | Dev 1 |
| T-0101d | Implement password hashing with bcrypt (12 rounds)          | 1 | Dev 1 |
| T-0101e | Create Login page UI (email, password, submit, error display) | 3 | Dev 2 |
| T-0101f | Create auth service (Axios interceptor for JWT, token storage in httpOnly cookie or secure storage) | 2 | Dev 2 |
| T-0101g | Write unit tests for auth service and login endpoint         | 3 | Dev 1 |
| T-0101h | Write integration tests for login flow                       | 2 | Dev 1 |

> **Subtotal: 20 hours**

---

### US-0102: User Logout (2 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0102a | Create POST `/api/auth/logout` endpoint (invalidate refresh token) | 1 | Dev 1 |
| T-0102b | Implement token blacklist (Redis or in-memory for MVP)       | 2 | Dev 1 |
| T-0102c | Add logout button to header dropdown, clear client-side tokens | 1 | Dev 2 |
| T-0102d | Implement route guard to redirect unauthenticated users to login | 1 | Dev 2 |
| T-0102e | Write unit and integration tests for logout                  | 1 | Dev 1 |

> **Subtotal: 6 hours**

---

### US-1006: JWT Token Refresh (5 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-1006a | Create POST `/api/auth/refresh` endpoint with refresh token rotation | 3 | Dev 1 |
| T-1006b | Create RefreshToken Mongoose schema (token hash, userId, expiresAt, isRevoked) | 1 | Dev 1 |
| T-1006c | Implement Axios response interceptor for automatic 401 retry with token refresh | 3 | Dev 2 |
| T-1006d | Handle concurrent requests during token refresh (queue mechanism) | 2 | Dev 2 |
| T-1006e | Write unit and integration tests for refresh flow            | 3 | Dev 1 |

> **Subtotal: 12 hours**

---

### US-0103: Create User Account (5 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0103a | Create UsersModule with UsersService and UsersController     | 2 | Dev 3 |
| T-0103b | Create POST `/api/users` endpoint with validation (name, email, role, department, temp password) | 3 | Dev 3 |
| T-0103c | Implement duplicate email check and proper error responses   | 1 | Dev 3 |
| T-0103d | Create "Create User" form page with validation               | 3 | Dev 2 |
| T-0103e | Implement first-login password change flow (flag in User schema) | 2 | Dev 3 |
| T-0103f | Write unit and integration tests                             | 3 | Dev 3 |

> **Subtotal: 14 hours**

---

### US-0104: Edit User Account (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0104a | Create PATCH `/api/users/:id` endpoint with partial update validation | 2 | Dev 3 |
| T-0104b | Create "Edit User" form page (pre-populated fields)          | 2 | Dev 2 |
| T-0104c | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 6 hours**

---

### US-0105: Deactivate User Account (2 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0105a | Create PATCH `/api/users/:id/deactivate` endpoint (set status inactive, revoke tokens) | 2 | Dev 3 |
| T-0105b | Add deactivate button with confirmation modal in user list   | 1 | Dev 2 |
| T-0105c | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 5 hours**

---

### US-0106: View User List (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0106a | Create GET `/api/users` endpoint with pagination, search, and role/department filters | 3 | Dev 3 |
| T-0106b | Create User List page with data table, search bar, and filter dropdowns | 3 | Dev 2 |
| T-0106c | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 8 hours**

---

### US-0108: Change Password (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0108a | Create POST `/api/auth/change-password` endpoint (verify current, validate new, hash and save) | 2 | Dev 1 |
| T-0108b | Implement password policy validation (8+ chars, upper, lower, digit, special) | 1 | Dev 1 |
| T-0108c | Create Change Password page with current/new/confirm fields  | 2 | Dev 2 |
| T-0108d | Invalidate all other sessions on password change             | 1 | Dev 1 |
| T-0108e | Write unit and integration tests                             | 2 | Dev 1 |

> **Subtotal: 8 hours**

---

### US-0201: Create Department (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0201a | Create Department Mongoose schema (name, code, description, head, status) | 1 | Dev 3 |
| T-0201b | Create DepartmentsModule with DepartmentsService and DepartmentsController | 2 | Dev 3 |
| T-0201c | Create POST `/api/departments` endpoint with validation      | 2 | Dev 3 |
| T-0201d | Create "Create Department" form page                         | 2 | Dev 2 |
| T-0201e | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 9 hours**

---

### US-0202: Edit Department (2 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0202a | Create PATCH `/api/departments/:id` endpoint                 | 1 | Dev 3 |
| T-0202b | Create "Edit Department" form page                           | 2 | Dev 2 |
| T-0202c | Write unit and integration tests                             | 1 | Dev 3 |

> **Subtotal: 4 hours**

---

### US-0204: Assign Employees to Department (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0204a | Create POST `/api/departments/:id/members` endpoint (add employee, remove from previous dept) | 3 | Dev 3 |
| T-0204b | Create department detail page with member list and "Add Member" search/select | 3 | Dev 2 |
| T-0204c | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 8 hours**

---

### US-0205: Designate Department Head (3 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0205a | Create PATCH `/api/departments/:id/head` endpoint (set head, update user role to Dept Head) | 3 | Dev 3 |
| T-0205b | Add "Set as Head" action in department member list           | 1 | Dev 2 |
| T-0205c | Handle previous head role reversion logic                    | 2 | Dev 3 |
| T-0205d | Write unit and integration tests                             | 2 | Dev 3 |

> **Subtotal: 8 hours**

---

### US-0206: View Department List (2 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-0206a | Create GET `/api/departments` endpoint with pagination and search | 2 | Dev 3 |
| T-0206b | Create Department List page with data table                  | 2 | Dev 2 |
| T-0206c | Write unit and integration tests                             | 1 | Dev 3 |

> **Subtotal: 5 hours**

---

### US-1001: Role-Based Access Control (8 points)

| Task ID | Task Description                                             | Hours | Assignee |
|---------|--------------------------------------------------------------|-------|----------|
| T-1001a | Create Roles enum and @Roles() decorator                     | 1 | Dev 1 |
| T-1001b | Create RolesGuard (NestJS guard checking JWT role against required roles) | 3 | Dev 1 |
| T-1001c | Apply RolesGuard to all existing endpoints with correct role requirements | 2 | Dev 1 |
| T-1001d | Create frontend route guard with role checking               | 2 | Dev 2 |
| T-1001e | Implement role-based sidebar menu filtering                  | 2 | Dev 2 |
| T-1001f | Create permission matrix documentation                       | 1 | Dev 1 |
| T-1001g | Write unit tests for RolesGuard with all role combinations   | 3 | Dev 1 |
| T-1001h | Write integration tests for endpoint access control          | 3 | Dev 1 |

> **Subtotal: 17 hours**

---

## Hour Summary

| Category                     | Hours |
|------------------------------|-------|
| Technical Tasks (TT-001-006) | 36    |
| US-0101: User Login          | 20    |
| US-0102: User Logout         | 6     |
| US-1006: JWT Token Refresh   | 12    |
| US-0103: Create User         | 14    |
| US-0104: Edit User           | 6     |
| US-0105: Deactivate User     | 5     |
| US-0106: View User List      | 8     |
| US-0108: Change Password     | 8     |
| US-0201: Create Department   | 9     |
| US-0202: Edit Department     | 4     |
| US-0204: Assign Employees    | 8     |
| US-0205: Designate Dept Head | 8     |
| US-0206: View Department List| 5     |
| US-1001: RBAC                | 17    |
| **Grand Total**              | **166** |
| **Team Capacity**            | **180** |
| **Buffer (8%)**              | **14** |

The 14-hour buffer accounts for sprint ceremonies (planning, standup, review, retrospective), code reviews, and unexpected issues.

---

## Definition of Done

A user story is considered "Done" when ALL of the following are satisfied:

- [ ] Code is written and follows project coding standards (ESLint/Prettier pass)
- [ ] Unit tests are written and passing with at least 80% coverage for new code
- [ ] Integration tests are written and passing for all API endpoints
- [ ] Code has been peer-reviewed and approved (1 approval minimum)
- [ ] API documentation is updated in Swagger
- [ ] No known defects remain (critical/high severity)
- [ ] Feature works in the Docker development environment
- [ ] Error handling is implemented (no unhandled exceptions)
- [ ] Input validation is implemented on both client and server
- [ ] Acceptance criteria from the user story are verified and met

---

## Sprint 1 Deliverables

### Backend Deliverables
1. NestJS application with modular architecture
2. MongoDB connection with Mongoose schemas (User, RefreshToken, Department)
3. Authentication endpoints: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/change-password`
4. User CRUD endpoints: `GET /users`, `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/deactivate`
5. Department CRUD endpoints: `GET /departments`, `POST /departments`, `PATCH /departments/:id`, `POST /departments/:id/members`, `PATCH /departments/:id/head`
6. RBAC middleware (RolesGuard) applied to all endpoints
7. Swagger API documentation
8. Seed script creating default Admin account

### Frontend Deliverables
1. React application with routing and layout shell
2. Login page with form validation
3. Authenticated layout with role-based sidebar navigation
4. User Management pages: List, Create, Edit
5. Department Management pages: List, Create, Edit, Detail (with member management)
6. Change Password page
7. 403 (Forbidden) and 404 (Not Found) error pages
8. Axios interceptors for JWT handling and automatic token refresh

### Infrastructure Deliverables
1. `docker-compose.yml` for local development (hot-reload, HMR, MongoDB replica set)
2. `docker-compose.prod.yml` for production on local server (Nginx, multi-stage builds, health checks, auto-backup)
3. Multi-stage Dockerfiles for API and web
4. Nginx reverse proxy configuration (SPA routing, API proxy, WebSocket, file uploads)
5. Deployment scripts (`deploy.sh`, `backup.sh`, `restore.sh`)
6. GitHub Actions CI pipeline (lint, test, build, Docker image build)
7. Environment configuration with validation (`.env.example`, `.env.production`)
8. Makefile with common operations
9. Test suite with 80%+ coverage

---

## Developer Assignment

| Developer | Focus Area                          | Stories                              |
|-----------|-------------------------------------|--------------------------------------|
| Dev 1     | Authentication, Security, RBAC      | US-0101, US-0102, US-1006, US-0108, US-1001 |
| Dev 2     | Frontend UI (all pages)             | All frontend tasks across stories    |
| Dev 3     | User & Department CRUD (backend)    | US-0103, US-0104, US-0105, US-0106, US-0201, US-0202, US-0204, US-0205, US-0206 |

---

## Daily Schedule Suggestion

### Week 1 (March 24-28)

| Day       | Dev 1                        | Dev 2                           | Dev 3                        |
|-----------|------------------------------|---------------------------------|------------------------------|
| Day 1 Tue | TT-001 Backend scaffolding   | TT-002 Frontend scaffolding     | TT-003 MongoDB setup         |
| Day 2 Wed | TT-004 CI/CD, TT-005 Tests  | TT-006 Layout shell             | TT-003 Seed script           |
| Day 3 Thu | T-0101a-d Login API          | T-0101e-f Login UI              | T-0103a-c Create User API    |
| Day 4 Fri | T-0101g-h Login tests        | T-0103d Create User UI          | T-0103e-f User tests         |
| Day 5 Sat | T-0102a-b Logout API         | T-0104b Edit User UI            | T-0104a Edit User API        |

### Week 2 (March 31 - April 4)

| Day       | Dev 1                        | Dev 2                           | Dev 3                        |
|-----------|------------------------------|---------------------------------|------------------------------|
| Day 6 Mon | T-1006a-b Token refresh API  | T-0102c-d Logout UI, guards     | T-0105a Deactivate API       |
| Day 7 Tue | T-1006c-e Token refresh tests| T-0106b User List UI            | T-0106a User List API        |
| Day 8 Wed | T-0108a-b Change password API| T-0108c Change password UI      | T-0201a-e Dept CRUD          |
| Day 9 Thu | T-1001a-c RBAC backend       | T-1001d-e RBAC frontend         | T-0204a-c, T-0205a-d Dept members |
| Day 10 Fri| T-1001f-h RBAC tests         | T-0201d, T-0202b, T-0206b Dept UI | T-0202a, T-0206a Dept API   |

> **April 6 (Monday):** Sprint Review, Retrospective, and Demo.

---

## Risks and Mitigations

### Risk 1: First Sprint Velocity Unknown
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:** The 18-hour buffer provides a safety margin. If velocity is lower than expected, US-0108 (Change Password) can be deferred to Sprint 2 as it is not on the critical path for PR filing.

### Risk 2: MongoDB Schema Design Decisions
- **Probability:** Low
- **Impact:** High
- **Mitigation:** Conduct a 1-hour schema design session on Day 1 before implementation begins. Document schema decisions in an ADR (Architecture Decision Record). MongoDB's flexible schema allows non-breaking changes later.

### Risk 3: JWT Security Implementation Complexity
- **Probability:** Medium
- **Impact:** High
- **Mitigation:** Use well-established `@nestjs/jwt` and `@nestjs/passport` packages. Follow OWASP JWT best practices. Dev 1 is assigned all auth tasks to maintain knowledge cohesion. Conduct a security-focused code review for all auth code.

### Risk 4: Frontend-Backend Integration Issues
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:** Define API contracts (request/response DTOs) on Day 1 before parallel development begins. Use Swagger as the single source of truth. Dev 2 can use mock data while backend endpoints are in progress.

### Risk 5: Team Unfamiliarity with NestJS
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** NestJS has excellent documentation and follows Angular-style patterns. Allocate Day 1 for scaffolding with review by the full team. Use NestJS CLI generators to maintain consistency.

---

## Acceptance Criteria for Sprint Completion

The sprint is considered successfully completed when:

- [ ] A user can log in with valid credentials and receive a JWT token
- [ ] A logged-in user can log out and their session is invalidated
- [ ] JWT tokens are automatically refreshed before expiry
- [ ] An Admin can create, edit, deactivate, and list user accounts
- [ ] A user can change their own password with policy enforcement
- [ ] An Admin can create, edit, and list departments
- [ ] An Admin can assign employees to departments
- [ ] An Admin can designate a department head
- [ ] Role-based access control prevents unauthorized access to endpoints and UI routes
- [ ] All API endpoints are documented in Swagger
- [ ] Test coverage is at least 80% for all new code
- [ ] The application runs in Docker with a single `docker compose up` command (dev mode)
- [ ] Production Docker Compose deploys successfully with `docker compose -f docker-compose.prod.yml up -d`
- [ ] Nginx serves React SPA and proxies API requests correctly
- [ ] Automated MongoDB backup container runs daily
- [ ] CI pipeline passes on all commits (lint, test, build)

---

## Sprint Ceremonies Schedule

| Ceremony              | Day/Time                        | Duration  |
|-----------------------|---------------------------------|-----------|
| Sprint Planning       | March 24 (Tue), 9:00 AM        | 2 hours   |
| Daily Standup         | Daily, 9:30 AM                  | 15 min    |
| Backlog Refinement    | March 31 (Tue), 2:00 PM        | 1 hour    |
| Sprint Review         | April 6 (Mon), 10:00 AM        | 1 hour    |
| Sprint Retrospective  | April 6 (Mon), 11:30 AM        | 1 hour    |

---

## Carry-Over Candidates for Sprint 2

If Sprint 1 completes early, pull from the following stories:

1. **US-0107** - Manage User Profile (3 points, Should Have)
2. **US-0203** - Deactivate Department (2 points, Should Have)
3. **US-1002** - Password Policy Enforcement (3 points, Must Have)
4. **US-1003** - Session Timeout (3 points, Must Have)
5. **US-0901** - Auto-Generate PR Number (5 points, Must Have)

These stories are the next priority items and have their dependencies satisfied by Sprint 1 deliverables.