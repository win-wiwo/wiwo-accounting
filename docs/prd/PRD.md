# Product Requirements Document (PRD)

# Purchase Request and Approval Management System (PRAMS)

---

## 1. Document Information

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **Document Title** | PRD - Purchase Request and Approval Management System |
| **Version**        | 1.0.0                                                 |
| **Status**         | Draft                                                 |
| **Created Date**   | 2026-03-19                                            |
| **Last Updated**   | 2026-03-19                                            |
| **Author**         | Product Team                                          |
| **Reviewers**      | Engineering Lead, Project Manager, Stakeholders       |
| **Methodology**    | Scrum (2-week sprints)                                |

### Version History

| Version | Date       | Author       | Changes       |
| ------- | ---------- | ------------ | ------------- |
| 1.0.0   | 2026-03-19 | Product Team | Initial draft |

---

## 2. Executive Summary

The Purchase Request and Approval Management System (PRAMS) is an internal web application designed to digitize and streamline the end-to-end lifecycle of purchase requests within the organization. The system replaces manual, error-prone Excel spreadsheets and paper-based forms with a centralized digital platform that supports filing, multi-level approval, real-time monitoring, and comprehensive reporting.

Built on a modern technology stack (NestJS backend, React frontend, MongoDB database), PRAMS enforces a structured approval chain --- Employee to Department Head to COO to CEO/President --- with full audit trails, role-based access control, and automated notifications. The platform provides role-specific dashboards, configurable PR numbering, attachment management for quotations and specifications, and export capabilities for Excel and PDF reports.

By implementing PRAMS, the organization expects to reduce purchase request processing time by at least 50%, eliminate lost or misrouted requests, ensure compliance with approval policies, and provide leadership with real-time visibility into procurement spending across all departments.

---

## 3. Problem Statement

The current purchase request process suffers from the following critical issues:

1. **Manual and paper-dependent workflow**: Purchase requests are filed using Excel templates or physical paper forms, leading to version control issues, lost documents, and inconsistent formatting.

2. **Opaque approval chain**: There is no centralized visibility into where a purchase request currently sits in the approval pipeline. Requestors cannot track status without manually contacting approvers.

3. **No audit trail**: Approval decisions, comments, and revision history are not systematically captured, creating compliance and accountability gaps.

4. **Slow turnaround times**: Physical routing of documents between departments and approvers causes significant delays, especially when approvers are unavailable or traveling.

5. **Error-prone calculations**: Manual computation of totals, tax, and line-item costs in spreadsheets frequently introduces arithmetic errors.

6. **Difficult reporting and consolidation**: The Accounting/Finance team spends excessive time manually consolidating purchase data from disparate spreadsheets for monthly and yearly reporting.

7. **No notification mechanism**: Approvers are not proactively alerted when requests require their attention, causing bottlenecks and forgotten requests.

8. **Uncontrolled PR numbering**: Without a centralized numbering system, duplicate or out-of-sequence PR numbers occur, complicating tracking and auditing.

---

## 4. Project Objectives

| ID    | Objective                                                                                      | Measurable Target                       |
| ----- | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| OBJ-1 | Digitize the entire purchase request lifecycle from filing to final approval                   | 100% of PRs processed digitally         |
| OBJ-2 | Reduce average PR approval turnaround time                                                     | >= 50% reduction within 6 months        |
| OBJ-3 | Provide real-time visibility into PR status for all stakeholders                               | Dashboard available to all roles        |
| OBJ-4 | Enforce consistent approval chain and prevent unauthorized approvals                           | Zero bypass incidents                   |
| OBJ-5 | Automate PR number generation and prevent duplicates                                           | Zero duplicate PR numbers               |
| OBJ-6 | Enable Accounting/Finance to generate consolidated reports with minimal effort                 | Reports generated in under 2 minutes    |
| OBJ-7 | Maintain a complete audit trail for every PR action                                            | 100% of actions logged                  |
| OBJ-8 | Ensure the system meets security and data integrity standards for internal financial processes | Zero unauthorized data access incidents |

---

## 5. Scope

### 5.1 In-Scope

- User authentication and authorization with role-based access control
- User and department management (CRUD operations)
- Purchase request creation with line items, auto-computed totals, and draft saving
- File attachment management (quotations, photos, specifications)
- Multi-level approval workflow (Department Head, COO, CEO/President)
- In-app notification system for all workflow events
- Role-based dashboards with key metrics and visualizations
- Advanced search and filtering across all PR data
- Report generation in Excel and PDF formats
- Configurable PR numbering with series tracking
- Full audit trail logging for all system actions
- Session management and security controls
- Responsive web interface (desktop-first, tablet-compatible)

### 5.2 Out-of-Scope (Future Phases)

- Email and SMS notification delivery (Phase 2 --- in-app only for Phase 1)
- Integration with external ERP, accounting, or procurement systems
- Mobile native applications (iOS/Android)
- Budget management and budget-vs-actual tracking
- Vendor management and vendor database
- Purchase order generation and tracking
- Invoice matching and payment processing
- Multi-currency support
- Multi-language / internationalization (i18n)
- Offline mode and progressive web app (PWA) capabilities
- Integration with single sign-on (SSO) or LDAP/Active Directory
- Automated approval rules based on amount thresholds (future enhancement)
- Digital signature integration

---

## 6. User Personas

### 6.1 Employee / Requestor

| Attribute        | Detail                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **Role**         | Employee                                                                |
| **Description**  | Any staff member who needs to purchase goods or services for work       |
| **Goals**        | File purchase requests quickly, attach required documents, track status |
| **Pain Points**  | Current paper forms are slow, no visibility into approval status        |
| **Tech Comfort** | Basic to intermediate; expects simple, guided forms                     |
| **Frequency**    | Files 2-5 PRs per month                                                 |

### 6.2 Department Head

| Attribute        | Detail                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| **Role**         | Department Head (1st Approver)                                             |
| **Description**  | Manager responsible for a department; certifies and endorses team requests |
| **Goals**        | Review and approve/reject PRs from team members efficiently                |
| **Pain Points**  | Paper forms pile up; no easy way to see pending approvals at a glance      |
| **Tech Comfort** | Intermediate; comfortable with web applications                            |
| **Frequency**    | Reviews 10-30 PRs per month                                                |

### 6.3 Chief Operating Officer (COO)

| Attribute        | Detail                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| **Role**         | COO (2nd Approver)                                                            |
| **Description**  | Senior executive who reviews PRs after department head endorsement            |
| **Goals**        | Quick review of endorsed PRs, see spending trends, approve/reject efficiently |
| **Pain Points**  | High volume of requests; needs to prioritize; lacks spending visibility       |
| **Tech Comfort** | Intermediate; values clean, summary-level dashboards                          |
| **Frequency**    | Reviews 30-80 PRs per month                                                   |

### 6.4 CEO / President

| Attribute        | Detail                                                          |
| ---------------- | --------------------------------------------------------------- |
| **Role**         | CEO/President (3rd / Final Approver)                            |
| **Description**  | Top executive who gives final approval on purchase requests     |
| **Goals**        | Final sign-off on vetted requests, high-level spending overview |
| **Pain Points**  | Requests arrive without context; no aggregate spending data     |
| **Tech Comfort** | Basic to intermediate; needs minimal-click workflows            |
| **Frequency**    | Reviews 20-60 PRs per month                                     |

### 6.5 Accounting / Finance Staff

| Attribute        | Detail                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Role**         | Accounting/Finance                                                                    |
| **Description**  | Finance team members who monitor approved PRs, track numbering, and generate reports  |
| **Goals**        | Consolidated reporting, PR number integrity, spending analysis                        |
| **Pain Points**  | Manual data gathering from spreadsheets; duplicate PR numbers; time-consuming reports |
| **Tech Comfort** | Intermediate to advanced; comfortable with data exports and spreadsheets              |
| **Frequency**    | Daily monitoring; weekly/monthly report generation                                    |

### 6.6 System Administrator

| Attribute        | Detail                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| **Role**         | System Admin                                                                   |
| **Description**  | IT staff responsible for managing users, departments, roles, and system config |
| **Goals**        | Efficiently manage system configuration, users, and access control             |
| **Pain Points**  | No centralized admin panel; changes require manual database edits              |
| **Tech Comfort** | Advanced; comfortable with administrative interfaces                           |
| **Frequency**    | As needed; heavier during onboarding/offboarding cycles                        |

---

## 7. Functional Requirements

### 7.1 Module 1: Account Management

| ID     | Requirement                                                                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-001 | The system shall provide a secure login page with email/username and password authentication.                                                                        | Must     |
| FR-002 | The system shall support the following roles: Employee, Department Head, COO, CEO/President, Accounting/Finance, System Admin.                                       | Must     |
| FR-003 | System Admins shall be able to create, read, update, and deactivate user accounts.                                                                                   | Must     |
| FR-004 | System Admins shall be able to assign one or more roles to each user.                                                                                                | Must     |
| FR-005 | System Admins shall be able to assign users to departments.                                                                                                          | Must     |
| FR-006 | The system shall enforce password complexity rules: minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character. | Must     |
| FR-007 | The system shall lock an account after 5 consecutive failed login attempts for 15 minutes.                                                                           | Must     |
| FR-008 | The system shall support password reset functionality via a secure token mechanism.                                                                                  | Must     |
| FR-009 | The system shall allow users to update their own profile information (name, contact details, password).                                                              | Should   |
| FR-010 | The system shall maintain an approval hierarchy configuration that defines the chain: Department Head -> COO -> CEO/President, with Accounting/Finance as monitors.  | Must     |
| FR-011 | The system shall display a list of all users with search, filter (by role, department, status), and pagination.                                                      | Must     |
| FR-012 | The system shall support soft-deletion (deactivation) of user accounts rather than hard deletion.                                                                    | Must     |

### 7.2 Module 2: Department Management

| ID     | Requirement                                                                                                                                            | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-013 | System Admins shall be able to create, read, update, and deactivate departments.                                                                       | Must     |
| FR-014 | Each department shall have a unique name and optional description.                                                                                     | Must     |
| FR-015 | System Admins shall be able to assign employees to one or more departments.                                                                            | Must     |
| FR-016 | System Admins shall be able to designate one user as the Department Head for each department.                                                          | Must     |
| FR-017 | When a purchase request is submitted, the system shall automatically route it to the designated Department Head of the requestor's primary department. | Must     |
| FR-018 | The system shall prevent deletion of departments that have active (non-cancelled, non-completed) purchase requests.                                    | Must     |
| FR-019 | The system shall display a department directory showing each department, its head, and employee count.                                                 | Should   |
| FR-020 | Department assignment changes shall be logged in the audit trail.                                                                                      | Must     |

### 7.3 Module 3: Purchase Request Filing

| ID     | Requirement                                                                                                                                                                                                                           | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-021 | Employees shall be able to create a new purchase request with the following fields: date, PR number (auto-generated), requestor (auto-populated), department (auto-populated from user profile), project name, purpose/justification. | Must     |
| FR-022 | Each purchase request shall contain one or more line items, each with: item description, quantity, unit of measure, estimated unit cost, and computed line total (quantity x unit cost).                                              | Must     |
| FR-023 | The system shall auto-compute the grand total as the sum of all line item totals in real time as the user enters data.                                                                                                                | Must     |
| FR-024 | The system shall auto-generate the PR number based on the configured format and current series (see Module 9).                                                                                                                        | Must     |
| FR-025 | Users shall be able to attach files to a purchase request: minimum 3 quotations from different suppliers are required before submission.                                                                                              | Must     |
| FR-026 | The system shall support uploading photos, specification documents, and other supporting files (PDF, DOCX, XLSX, PNG, JPG).                                                                                                           | Must     |
| FR-027 | Each individual file attachment shall not exceed 10 MB, and total attachments per PR shall not exceed 50 MB.                                                                                                                          | Must     |
| FR-028 | Users shall be able to save a purchase request as a Draft without triggering the approval workflow.                                                                                                                                   | Must     |
| FR-029 | Users shall be able to edit Draft purchase requests and add/remove line items and attachments.                                                                                                                                        | Must     |
| FR-030 | The system shall validate all required fields before allowing submission: project name, purpose, at least one line item with valid quantity and cost, and at least 3 quotation attachments.                                           | Must     |
| FR-031 | Upon submission, the purchase request status shall change from Draft to Submitted and the approval workflow shall be initiated.                                                                                                       | Must     |
| FR-032 | Users shall be able to duplicate an existing purchase request to create a new one with pre-filled data.                                                                                                                               | Should   |
| FR-033 | The system shall display a confirmation dialog before submission, showing a summary of the PR.                                                                                                                                        | Should   |
| FR-034 | Users shall be able to cancel their own Draft or Submitted purchase requests (before any approval action).                                                                                                                            | Must     |

### 7.4 Module 4: Approval Workflow

| ID     | Requirement                                                                                                                                          | Priority |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-035 | The approval chain shall follow this sequence: Employee submits -> Department Head reviews -> COO reviews -> CEO/President gives final approval.     | Must     |
| FR-036 | The system shall support the following PR statuses: Draft, Submitted, Under Review, Approved, Rejected, Returned for Revision, Cancelled.            | Must     |
| FR-037 | When a PR is submitted, it shall automatically be assigned to the requestor's Department Head for review.                                            | Must     |
| FR-038 | Each approver shall be able to perform the following actions: Approve, Reject, or Return for Revision.                                               | Must     |
| FR-039 | Each approver shall be able to add comments when approving, rejecting, or returning a PR.                                                            | Must     |
| FR-040 | Comments shall be mandatory when rejecting or returning a PR for revision.                                                                           | Must     |
| FR-041 | When a PR is approved by an approver, it shall automatically advance to the next approver in the chain.                                              | Must     |
| FR-042 | When the CEO/President approves a PR, the status shall change to Approved (final).                                                                   | Must     |
| FR-043 | When a PR is rejected at any stage, the status shall change to Rejected and the workflow shall stop.                                                 | Must     |
| FR-044 | When a PR is returned for revision, the requestor shall be able to edit and resubmit the PR, restarting the approval chain from the Department Head. | Must     |
| FR-045 | The system shall maintain a complete audit trail for each PR, recording: action taken, actor (user), timestamp, comments, and previous/new status.   | Must     |
| FR-046 | Approvers shall only see PRs that are currently assigned to them for action.                                                                         | Must     |
| FR-047 | Accounting/Finance users shall have read-only access to all PRs at all stages for monitoring purposes.                                               | Must     |
| FR-048 | The system shall prevent approvers from approving their own purchase requests (conflict of interest).                                                | Must     |
| FR-049 | The system shall display the full approval timeline/history on the PR detail page.                                                                   | Must     |
| FR-050 | Approvers shall be able to view all attachments and line item details before making a decision.                                                      | Must     |

### 7.5 Module 5: Dashboard

| ID     | Requirement                                                                                                                                                                 | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-051 | The system shall display a role-specific dashboard as the landing page after login.                                                                                         | Must     |
| FR-052 | The Employee dashboard shall show: my PRs by status, my recent submissions, and any returned PRs requiring revision.                                                        | Must     |
| FR-053 | The Department Head dashboard shall show: pending approvals count, approved/rejected counts for the current month, and department PR summary.                               | Must     |
| FR-054 | The COO dashboard shall show: pending approvals count, total approved amount for the current month, PRs by department, and monthly trend chart.                             | Must     |
| FR-055 | The CEO/President dashboard shall show: pending final approvals count, total approved amount, top spending departments, and monthly/yearly trend charts.                    | Must     |
| FR-056 | The Accounting/Finance dashboard shall show: total PRs by status, approved amounts by department, PR number series status, and monthly spending summary.                    | Must     |
| FR-057 | The System Admin dashboard shall show: total users by role, active/inactive users, departments count, and recent system activity log.                                       | Should   |
| FR-058 | Dashboard data shall refresh automatically at a configurable interval (default: 5 minutes) or on manual refresh.                                                            | Should   |
| FR-059 | Dashboard charts shall include: bar chart (PRs by department), pie chart (PRs by status), line chart (monthly trends), and summary cards (totals, pending counts, amounts). | Must     |
| FR-060 | Dashboard widgets shall be clickable, navigating to filtered lists of the relevant PRs.                                                                                     | Should   |

### 7.6 Module 6: Search and Monitoring

| ID     | Requirement                                                                                                                                                                                                      | Priority |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-061 | The system shall provide a global search page accessible to all authenticated users.                                                                                                                             | Must     |
| FR-062 | Users shall be able to search PRs by: PR number, requestor name, department, project name, date range (submitted, approved), status, current approver, item description keyword, and amount range (grand total). | Must     |
| FR-063 | Search results shall be displayed in a paginated table with sortable columns.                                                                                                                                    | Must     |
| FR-064 | Users shall be able to combine multiple search criteria (AND logic).                                                                                                                                             | Must     |
| FR-065 | Clicking a search result shall navigate to a detailed PR view showing all fields, line items, attachments, and the full approval timeline.                                                                       | Must     |
| FR-066 | The detailed PR view shall display a visual timeline of all approval actions with timestamps and actor names.                                                                                                    | Must     |
| FR-067 | Users shall be able to save frequently used search filters for quick access.                                                                                                                                     | Could    |
| FR-068 | Search results shall respect role-based access: Employees see only their own PRs; Department Heads see their department's PRs; COO and CEO see all PRs; Accounting/Finance see all PRs (read-only).              | Must     |
| FR-069 | The system shall support quick-filter buttons for common views: "My Pending", "Awaiting My Approval", "This Month", "Rejected".                                                                                  | Should   |

### 7.7 Module 7: Report Generation

| ID     | Requirement                                                                                                                                                                                                                                                                          | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-070 | The system shall support report generation in both Excel (.xlsx) and PDF formats.                                                                                                                                                                                                    | Must     |
| FR-071 | The following reports shall be available: (a) All Purchase Requests, (b) PRs by Department, (c) PRs by Requestor, (d) PRs by Status, (e) Approved PRs by Date Range, (f) Monthly Summary, (g) Yearly Summary, (h) Approval Turnaround Time Report, (i) Printable Individual PR Form. | Must     |
| FR-072 | All reports shall support date range filtering (start date, end date).                                                                                                                                                                                                               | Must     |
| FR-073 | Reports shall include computed summaries: totals, averages, counts as appropriate.                                                                                                                                                                                                   | Must     |
| FR-074 | The Approval Turnaround Time Report shall show average time at each approval stage and overall average from submission to final approval.                                                                                                                                            | Must     |
| FR-075 | The Printable PR Form shall replicate the company's standard PR form layout, including all line items, totals, approval signatures/status, and attachments list.                                                                                                                     | Must     |
| FR-076 | Reports shall be accessible to Accounting/Finance, COO, CEO/President, and System Admin roles. Department Heads shall access reports scoped to their department. Employees shall not generate reports.                                                                               | Must     |
| FR-077 | The system shall allow scheduling of recurring reports (e.g., weekly, monthly) for Accounting/Finance users.                                                                                                                                                                         | Could    |
| FR-078 | Generated reports shall be downloadable from a report history page for 30 days.                                                                                                                                                                                                      | Should   |

### 7.8 Module 8: Notifications

| ID     | Requirement                                                                                                                                                                                                                                                                                                                                                                                                    | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-079 | The system shall provide an in-app notification center accessible via a bell icon in the navigation header.                                                                                                                                                                                                                                                                                                    | Must     |
| FR-080 | Notifications shall be generated for the following events: PR submitted (to Department Head), PR pending approval (to next approver), PR approved at each stage (to requestor), PR rejected (to requestor), PR returned for revision (to requestor), missing required attachments warning (to requestor on draft save), PR overdue at an approval stage (exceeding configurable SLA, default 3 business days). | Must     |
| FR-081 | Each notification shall include: event type, PR number, brief message, timestamp, and a link to the relevant PR.                                                                                                                                                                                                                                                                                               | Must     |
| FR-082 | Users shall be able to mark notifications as read individually or mark all as read.                                                                                                                                                                                                                                                                                                                            | Must     |
| FR-083 | The notification bell icon shall display an unread count badge.                                                                                                                                                                                                                                                                                                                                                | Must     |
| FR-084 | The system shall support notification preferences allowing users to enable/disable specific event types.                                                                                                                                                                                                                                                                                                       | Should   |
| FR-085 | The system architecture shall be designed to support future email notification delivery without requiring changes to the notification generation logic (event-driven architecture).                                                                                                                                                                                                                            | Must     |
| FR-086 | Overdue notifications shall be triggered automatically by a background job that checks pending approvals against the configured SLA threshold.                                                                                                                                                                                                                                                                 | Must     |

### 7.9 Module 9: PR Numbering Control

| ID     | Requirement                                                                                                                                                                        | Priority |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-087 | The system shall auto-generate PR numbers upon creation of a new purchase request.                                                                                                 | Must     |
| FR-088 | The PR number format shall be configurable by System Admins. Default format: `PR-{YYYY}-{NNNNNN}` where YYYY is the four-digit year and NNNNNN is a zero-padded sequential number. | Must     |
| FR-089 | The sequential counter shall reset at a configurable interval (default: yearly).                                                                                                   | Must     |
| FR-090 | The system shall guarantee uniqueness of PR numbers through atomic database operations.                                                                                            | Must     |
| FR-091 | PR numbers shall not be editable by requestors or approvers after generation.                                                                                                      | Must     |
| FR-092 | Accounting/Finance users shall have visibility into the current PR number series, last assigned number, and remaining capacity.                                                    | Must     |
| FR-093 | System Admins shall be able to configure the PR number prefix, separator, year format, and sequence padding.                                                                       | Should   |
| FR-094 | The system shall log any PR number configuration changes in the audit trail.                                                                                                       | Must     |

### 7.10 Module 10: Security and Access Control

| ID     | Requirement                                                                                                                                                                                                     | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-095 | The system shall enforce role-based access control (RBAC) on all API endpoints and UI components.                                                                                                               | Must     |
| FR-096 | All API endpoints shall verify authentication (valid JWT token) and authorization (permitted role) before processing requests.                                                                                  | Must     |
| FR-097 | User sessions shall automatically expire after a configurable period of inactivity (default: 30 minutes).                                                                                                       | Must     |
| FR-098 | The system shall maintain an audit log recording: user login/logout, PR creation/modification, approval actions, user/department management actions, configuration changes, and failed authentication attempts. | Must     |
| FR-099 | File uploads shall be restricted to allowed MIME types: PDF, DOCX, XLSX, PNG, JPG, JPEG. All other file types shall be rejected.                                                                                | Must     |
| FR-100 | Uploaded files shall be scanned for file extension / MIME type mismatch to prevent disguised executable uploads.                                                                                                | Must     |
| FR-101 | Passwords shall be stored using bcrypt hashing with a minimum cost factor of 12.                                                                                                                                | Must     |
| FR-102 | The system shall use HTTPS for all communications in production.                                                                                                                                                | Must     |
| FR-103 | The system shall implement CSRF protection on all state-changing endpoints.                                                                                                                                     | Must     |
| FR-104 | The system shall implement rate limiting on authentication endpoints (maximum 10 requests per minute per IP).                                                                                                   | Must     |
| FR-105 | Audit logs shall be immutable --- they shall not be editable or deletable by any user, including System Admins.                                                                                                 | Must     |
| FR-106 | The system shall sanitize all user inputs to prevent XSS and injection attacks.                                                                                                                                 | Must     |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| ID      | Requirement                                                                                           | Target            |
| ------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| NFR-001 | Page load time (initial) shall not exceed 3 seconds on a standard broadband connection.               | <= 3 seconds      |
| NFR-002 | API response time for standard CRUD operations shall not exceed 500 milliseconds.                     | <= 500 ms         |
| NFR-003 | Dashboard data aggregation queries shall return within 2 seconds.                                     | <= 2 seconds      |
| NFR-004 | Report generation (Excel/PDF) shall complete within 30 seconds for datasets up to 10,000 records.     | <= 30 seconds     |
| NFR-005 | The system shall support at least 200 concurrent authenticated users without performance degradation. | >= 200 concurrent |
| NFR-006 | File upload processing shall complete within 10 seconds for files up to 10 MB.                        | <= 10 seconds     |
| NFR-007 | Search queries with multiple filters shall return results within 2 seconds.                           | <= 2 seconds      |

### 8.2 Security

| ID      | Requirement                                                                                 |
| ------- | ------------------------------------------------------------------------------------------- |
| NFR-008 | All data in transit shall be encrypted using TLS 1.2 or higher.                             |
| NFR-009 | All sensitive data at rest (passwords, tokens) shall be encrypted or hashed.                |
| NFR-010 | The system shall comply with the principle of least privilege for all role assignments.     |
| NFR-011 | Authentication tokens (JWT) shall expire after 24 hours and refresh tokens after 7 days.    |
| NFR-012 | The system shall log all security-relevant events for a minimum retention period of 1 year. |

### 8.3 Scalability

| ID      | Requirement                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| NFR-013 | The system shall be designed to scale horizontally by adding application server instances.                          |
| NFR-014 | The MongoDB database shall support sharding for future growth beyond 1 million PR documents.                        |
| NFR-015 | File storage shall use a configurable storage backend (local filesystem initially, cloud object storage in future). |

### 8.4 Usability

| ID      | Requirement                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| NFR-016 | The user interface shall be responsive and functional on screens 1024px wide and above. |
| NFR-017 | The system shall provide clear, actionable error messages for all validation failures.  |
| NFR-018 | New users shall be able to file a purchase request within 10 minutes without training.  |
| NFR-019 | The UI shall follow a consistent design system with reusable components.                |
| NFR-020 | The system shall provide loading indicators for all asynchronous operations.            |
| NFR-021 | The system shall support keyboard navigation for accessibility.                         |

### 8.5 Reliability and Availability

| ID      | Requirement                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------- |
| NFR-022 | The system shall target 99.5% uptime during business hours (8:00 AM - 6:00 PM, weekdays).             |
| NFR-023 | The system shall implement automated database backups every 24 hours with 30-day retention.           |
| NFR-024 | The system shall gracefully handle errors without exposing stack traces or internal details to users. |
| NFR-025 | The system shall implement health check endpoints for monitoring and alerting.                        |

### 8.6 Maintainability

| ID      | Requirement                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------ |
| NFR-026 | The codebase shall maintain a minimum of 80% test coverage (unit + integration).                 |
| NFR-027 | The system shall use structured logging (JSON format) for all server-side logs.                  |
| NFR-028 | The API shall be documented using OpenAPI/Swagger specification.                                 |
| NFR-029 | The system shall follow a modular architecture enabling independent module deployment in future. |

---

## 9. User Stories

### Epic 1: Account Management

**US-001: User Login**

- **As an** employee, **I want to** log in using my credentials, **so that** I can access the system securely.
- **Acceptance Criteria:**
  - Given valid credentials, when I submit the login form, then I am redirected to my role-specific dashboard.
  - Given invalid credentials, when I submit the login form, then I see an error message "Invalid email or password" without revealing which field is incorrect.
  - Given 5 consecutive failed attempts, when I try again, then my account is locked for 15 minutes with an appropriate message.
  - The login page loads within 3 seconds (NFR-001).

**US-002: Create User Account**

- **As a** System Admin, **I want to** create a new user account with role and department assignments, **so that** new employees can access the system with the correct permissions.
- **Acceptance Criteria:**
  - I can fill in: full name, email (unique), temporary password, role(s), and department.
  - The system validates email uniqueness and password complexity (FR-006).
  - Upon creation, the user appears in the user list and can log in.
  - The action is recorded in the audit log.

**US-003: Deactivate User Account**

- **As a** System Admin, **I want to** deactivate a user account, **so that** former employees can no longer access the system while preserving their historical data.
- **Acceptance Criteria:**
  - Deactivated users cannot log in.
  - Historical PRs filed by or approved by the deactivated user remain intact.
  - The user is marked as "Inactive" in the user list.
  - The deactivation is recorded in the audit log.

**US-004: Change Own Password**

- **As a** user, **I want to** change my password, **so that** I can maintain the security of my account.
- **Acceptance Criteria:**
  - I must enter my current password and a new password (with confirmation).
  - The new password must meet complexity requirements (FR-006).
  - After changing, my existing sessions are invalidated and I am prompted to log in again.

**US-005: Assign Roles to User**

- **As a** System Admin, **I want to** assign one or more roles to a user, **so that** they can perform their designated functions in the system.
- **Acceptance Criteria:**
  - I can select from the available roles: Employee, Department Head, COO, CEO/President, Accounting/Finance, System Admin.
  - A user can have multiple roles (e.g., Department Head + Employee).
  - Role changes take effect on the user's next page load or session refresh.
  - Role changes are recorded in the audit log.

---

### Epic 2: Department Management

**US-006: Create Department**

- **As a** System Admin, **I want to** create a new department, **so that** employees can be organized and PRs routed correctly.
- **Acceptance Criteria:**
  - I can enter a department name (unique) and optional description.
  - The department appears in the department directory after creation.
  - The action is recorded in the audit log.

**US-007: Assign Department Head**

- **As a** System Admin, **I want to** designate a Department Head for a department, **so that** PRs from that department are routed to the correct first-level approver.
- **Acceptance Criteria:**
  - I can select any active user as Department Head.
  - The selected user automatically receives the Department Head role if not already assigned.
  - Only one user can be the active Department Head per department at a time.
  - The change is recorded in the audit log.

**US-008: Assign Employees to Department**

- **As a** System Admin, **I want to** assign employees to a department, **so that** their PRs are associated with the correct department and routed accordingly.
- **Acceptance Criteria:**
  - I can add or remove employees from a department.
  - Each user has a primary department used for PR routing.
  - The department's employee count updates in real time.

**US-009: View Department Directory**

- **As an** employee, **I want to** view the department directory, **so that** I can see which department I belong to and who my Department Head is.
- **Acceptance Criteria:**
  - The directory lists all active departments with their heads and employee counts.
  - The list is searchable and sortable.

**US-010: Deactivate Department**

- **As a** System Admin, **I want to** deactivate a department that is no longer active, **so that** it no longer appears in active selections while preserving historical data.
- **Acceptance Criteria:**
  - Departments with active (non-cancelled, non-final-approved) PRs cannot be deactivated (FR-018).
  - Deactivated departments do not appear in department dropdowns for new PRs.
  - Historical PRs referencing the department remain intact.

---

### Epic 3: Purchase Request Filing

**US-011: Create New Purchase Request**

- **As an** employee, **I want to** create a new purchase request with item details and supporting documents, **so that** I can formally request a purchase.
- **Acceptance Criteria:**
  - The form auto-populates: my name as requestor, my department, the current date, and an auto-generated PR number.
  - I can enter: project name, purpose/justification, and one or more line items (description, quantity, unit of measure, unit cost).
  - Line totals and grand total are computed automatically as I type.
  - I can attach files (quotations, photos, specs) subject to size and type restrictions (FR-026, FR-027).
  - I can save as Draft without full validation.

**US-012: Submit Purchase Request**

- **As an** employee, **I want to** submit my completed purchase request, **so that** it enters the approval workflow.
- **Acceptance Criteria:**
  - The system validates: all required fields are filled, at least one line item exists with valid data, at least 3 quotation attachments are uploaded.
  - A confirmation dialog shows a PR summary before final submission.
  - Upon submission, the status changes from Draft to Submitted.
  - The Department Head receives a notification.

**US-013: Save Draft Purchase Request**

- **As an** employee, **I want to** save an incomplete purchase request as a draft, **so that** I can return to complete it later.
- **Acceptance Criteria:**
  - Drafts are saved without full validation.
  - I can see my drafts in my PR list.
  - I can edit, complete, and submit drafts at any time.
  - Drafts are not visible to approvers.

**US-014: Duplicate Existing Purchase Request**

- **As an** employee, **I want to** duplicate an existing PR to create a new one, **so that** I can save time on similar requests.
- **Acceptance Criteria:**
  - The new PR has a new auto-generated PR number and current date.
  - All line items and text fields are copied from the source PR.
  - Attachments are not copied (must be re-uploaded).
  - The duplicated PR starts in Draft status.

**US-015: Cancel Purchase Request**

- **As an** employee, **I want to** cancel my own purchase request, **so that** I can withdraw a request that is no longer needed.
- **Acceptance Criteria:**
  - I can cancel PRs in Draft or Submitted status (before any approver has taken action).
  - Cancelled PRs cannot be resubmitted or edited.
  - The cancellation is recorded in the audit trail.
  - If the PR was Submitted, the Department Head is notified of the cancellation.

---

### Epic 4: Approval Workflow

**US-016: Review and Approve Purchase Request (Department Head)**

- **As a** Department Head, **I want to** review and approve purchase requests from my department, **so that** validated requests can proceed to the next approval level.
- **Acceptance Criteria:**
  - I see a list of PRs awaiting my approval.
  - I can view all details, line items, and attachments.
  - When I approve, the PR advances to the COO with status Under Review.
  - My approval is recorded in the audit trail with timestamp.
  - The requestor and COO are notified.

**US-017: Reject Purchase Request**

- **As an** approver (Department Head, COO, or CEO/President), **I want to** reject a purchase request with a reason, **so that** the requestor understands why and the workflow terminates.
- **Acceptance Criteria:**
  - I must provide a comment/reason when rejecting (FR-040).
  - The PR status changes to Rejected.
  - The requestor is notified with the rejection reason.
  - No further approval actions are possible on a Rejected PR.
  - The rejection is recorded in the audit trail.

**US-018: Return Purchase Request for Revision**

- **As an** approver, **I want to** return a purchase request to the requestor for revision, **so that** they can correct issues before resubmission.
- **Acceptance Criteria:**
  - I must provide a comment explaining what needs revision (FR-040).
  - The PR status changes to Returned for Revision.
  - The requestor is notified and can edit the PR.
  - Upon resubmission, the approval chain restarts from the Department Head (FR-044).
  - All revision history is preserved in the audit trail.

**US-019: Final Approval by CEO/President**

- **As the** CEO/President, **I want to** give final approval to a purchase request, **so that** the purchase can proceed.
- **Acceptance Criteria:**
  - I see PRs that have been approved by both the Department Head and COO.
  - When I approve, the PR status changes to Approved (final).
  - The requestor and Accounting/Finance are notified.
  - The approved amount is reflected in dashboard totals and reports.

**US-020: View Approval Timeline**

- **As a** user, **I want to** see the full approval timeline of a purchase request, **so that** I can understand its journey through the approval chain.
- **Acceptance Criteria:**
  - The timeline shows each action: submission, each approval/rejection/return, with actor name, timestamp, and comments.
  - The timeline is displayed in chronological order on the PR detail page.
  - The current pending stage is highlighted.

---

### Epic 5: Dashboard

**US-021: Employee Dashboard**

- **As an** employee, **I want to** see a dashboard of my purchase requests, **so that** I can quickly understand the status of my submissions.
- **Acceptance Criteria:**
  - Shows: total PRs filed, count by status (Draft, Submitted, Under Review, Approved, Rejected, Returned), and a list of recent PRs.
  - Returned PRs are highlighted with a call-to-action to revise.
  - Clicking a status card navigates to a filtered PR list.

**US-022: Department Head Dashboard**

- **As a** Department Head, **I want to** see a dashboard of my department's purchase activity and pending approvals, **so that** I can prioritize my reviews.
- **Acceptance Criteria:**
  - Shows: pending approvals count (prominently), approved/rejected counts for the current month, department PR summary by status.
  - Pending approvals are listed with PR number, requestor, amount, and submission date.
  - I can click to navigate directly to a PR for review.

**US-023: Executive Dashboard (COO/CEO)**

- **As a** COO or CEO/President, **I want to** see a high-level dashboard of procurement activity, **so that** I can monitor spending and identify trends.
- **Acceptance Criteria:**
  - Shows: pending approvals, total approved amount (current month), PRs by department (bar chart), monthly trend (line chart), top spending departments.
  - All widgets are clickable for drill-down.
  - Data is scoped to the appropriate approval level.

**US-024: Accounting/Finance Dashboard**

- **As an** Accounting/Finance user, **I want to** see a comprehensive dashboard of all PRs and spending, **so that** I can monitor procurement activity and prepare reports.
- **Acceptance Criteria:**
  - Shows: total PRs by status (pie chart), approved amounts by department, PR number series status (current number, remaining), monthly spending trend.
  - I can access report generation directly from the dashboard.

**US-025: Dashboard Auto-Refresh**

- **As a** user, **I want** my dashboard to refresh periodically, **so that** I always see current data.
- **Acceptance Criteria:**
  - Dashboard data refreshes every 5 minutes by default.
  - A manual refresh button is available.
  - A "Last updated" timestamp is displayed.

---

### Epic 6: Search and Monitoring

**US-026: Search Purchase Requests**

- **As a** user, **I want to** search for purchase requests using multiple criteria, **so that** I can find specific PRs quickly.
- **Acceptance Criteria:**
  - I can search by: PR number, requestor, department, project name, date range, status, approver, item description, and amount range.
  - Multiple criteria are combined with AND logic.
  - Results are paginated (default 20 per page) and sortable by any column.
  - Results respect role-based access (FR-068).

**US-027: View Detailed PR Information**

- **As a** user, **I want to** view the complete details of a purchase request, **so that** I can review all information and history.
- **Acceptance Criteria:**
  - The detail view shows: header info, all line items with totals, all attachments (downloadable), purpose/justification, and the full approval timeline.
  - Attachments can be previewed (images) or downloaded (documents).

**US-028: Quick Filter Shortcuts**

- **As a** user, **I want to** use quick filter buttons for common views, **so that** I can access frequently needed information with one click.
- **Acceptance Criteria:**
  - Available quick filters: "My Pending", "Awaiting My Approval", "This Month", "Rejected".
  - Quick filters pre-populate the search form and display results immediately.

**US-029: Role-Scoped Search Results**

- **As a** Department Head, **I want to** see only my department's PRs in search results (plus my own), **so that** I am not overwhelmed with irrelevant data.
- **Acceptance Criteria:**
  - Employees see only their own PRs.
  - Department Heads see their department's PRs.
  - COO, CEO, and Accounting/Finance see all PRs.
  - System Admins see all PRs.

**US-030: Monitoring for Accounting/Finance**

- **As an** Accounting/Finance user, **I want to** monitor all purchase requests across the organization, **so that** I can track spending and ensure compliance.
- **Acceptance Criteria:**
  - I can view all PRs regardless of department or status.
  - I have read-only access (cannot approve, reject, or modify).
  - I can filter by any criteria and export results.

---

### Epic 7: Report Generation

**US-031: Generate Department PR Report**

- **As a** Department Head, **I want to** generate a report of my department's purchase requests, **so that** I can review spending and activity.
- **Acceptance Criteria:**
  - I can select a date range and status filter.
  - The report includes: PR number, date, requestor, project, amount, status, and approval date.
  - The report includes a summary section with total count and total amount.
  - Available in Excel and PDF formats.

**US-032: Generate Approved PRs Report**

- **As an** Accounting/Finance user, **I want to** generate a report of approved PRs for a specific date range, **so that** I can reconcile procurement spending.
- **Acceptance Criteria:**
  - The report includes all PRs with final Approved status within the selected date range.
  - It includes: PR number, requestor, department, approved amount, approval date, and all approver names.
  - Summary totals are computed per department and overall.

**US-033: Generate Monthly/Yearly Summary Report**

- **As a** CEO/President, **I want to** generate monthly and yearly summary reports, **so that** I can assess procurement trends and spending patterns.
- **Acceptance Criteria:**
  - Monthly report shows: number of PRs, total approved amount, average PR amount, by department breakdown.
  - Yearly report aggregates monthly data with year-over-year comparison (when historical data exists).
  - Charts are embedded in the PDF version.

**US-034: Generate Approval Turnaround Report**

- **As a** COO, **I want to** see a report on approval turnaround times, **so that** I can identify bottlenecks in the process.
- **Acceptance Criteria:**
  - Shows average time at each approval stage (Dept Head, COO, CEO).
  - Shows overall average time from submission to final approval.
  - Highlights PRs that exceeded the SLA threshold.
  - Filterable by department and date range.

**US-035: Print Individual PR Form**

- **As an** employee, **I want to** print a formatted version of my purchase request, **so that** I can keep a physical record if needed.
- **Acceptance Criteria:**
  - The printable form matches the company's standard PR layout.
  - Includes all line items, totals, requestor/department info, and approval status/signatures.
  - Lists all attachments by filename.
  - Generated as a PDF optimized for A4 paper.

---

### Epic 8: Notifications

**US-036: Receive Notification on PR Submission**

- **As a** Department Head, **I want to** be notified when a team member submits a purchase request, **so that** I can review it promptly.
- **Acceptance Criteria:**
  - An in-app notification appears with: "New PR [PR-2026-000123] submitted by [Name] for review."
  - The notification links directly to the PR detail page.
  - The unread badge count increments.

**US-037: Receive Notification on PR Approval/Rejection**

- **As an** employee, **I want to** be notified when my purchase request is approved or rejected, **so that** I know the outcome without checking manually.
- **Acceptance Criteria:**
  - Approval notification: "Your PR [PR-2026-000123] has been approved by [Approver Name] ([Role])."
  - Rejection notification: "Your PR [PR-2026-000123] has been rejected by [Approver Name]. Reason: [comment excerpt]."
  - Notifications link to the PR detail page.

**US-038: Receive Notification on PR Returned for Revision**

- **As an** employee, **I want to** be notified when my PR is returned for revision, **so that** I can address the feedback quickly.
- **Acceptance Criteria:**
  - Notification includes: PR number, approver who returned it, and the revision comment.
  - The notification links to the PR in edit mode.

**US-039: Overdue Approval Notification**

- **As a** user, **I want** the system to notify approvers when a PR has been pending beyond the SLA, **so that** bottlenecks are surfaced proactively.
- **Acceptance Criteria:**
  - A background job checks pending approvals daily.
  - If a PR has been pending at any stage for more than 3 business days (configurable), the assigned approver receives a notification.
  - The requestor also receives a notification that their PR is overdue.

**US-040: Manage Notification Preferences**

- **As a** user, **I want to** configure which notifications I receive, **so that** I am not overwhelmed by alerts that are not relevant to me.
- **Acceptance Criteria:**
  - I can toggle on/off each notification type from my profile settings.
  - Critical notifications (rejection, return for revision) cannot be disabled.
  - Preferences are saved per user.

---

### Epic 9: PR Numbering Control

**US-041: Auto-Generate PR Number**

- **As an** employee, **I want** the system to automatically assign a unique PR number when I create a new request, **so that** I do not have to manually track numbering.
- **Acceptance Criteria:**
  - The PR number is generated in the configured format (default: PR-YYYY-NNNNNN).
  - The number is visible on the form immediately upon creation.
  - The number is guaranteed unique (FR-090).

**US-042: Configure PR Number Format**

- **As a** System Admin, **I want to** configure the PR number format, **so that** it matches the company's naming conventions.
- **Acceptance Criteria:**
  - I can configure: prefix (e.g., "PR"), separator (e.g., "-"), year format (YYYY or YY), sequence padding length, and reset interval (yearly, monthly, never).
  - Changes apply only to newly generated PR numbers; existing numbers are unaffected.
  - Configuration changes are recorded in the audit log.

**US-043: View PR Number Series Status**

- **As an** Accounting/Finance user, **I want to** see the current PR number series status, **so that** I can monitor numbering integrity.
- **Acceptance Criteria:**
  - Shows: current format, current year series, last assigned number, next expected number, and total PRs in current series.
  - Accessible from the Accounting/Finance dashboard.

**US-044: Prevent PR Number Editing**

- **As a** system, **I want to** prevent any user from manually editing a PR number, **so that** numbering integrity is maintained.
- **Acceptance Criteria:**
  - The PR number field is read-only on all forms.
  - The API rejects any request that attempts to modify a PR number.
  - Attempts to modify PR numbers are logged as security events.

**US-045: Yearly Series Reset**

- **As a** System Admin, **I want** the PR number sequence to reset at the start of each year, **so that** numbering stays organized by year.
- **Acceptance Criteria:**
  - On January 1st (or the configured reset date), the sequence counter resets to 1.
  - The year portion of the PR number updates automatically.
  - The previous year's sequence is preserved for historical reference.

---

### Epic 10: Security and Access Control

**US-046: Role-Based Page Access**

- **As the** system, **I want to** restrict page and feature access based on user roles, **so that** users only see and interact with what they are authorized to use.
- **Acceptance Criteria:**
  - Employees cannot access: user management, department management, report generation, or PR number configuration.
  - Department Heads can access reports scoped to their department only.
  - Accounting/Finance has read-only access to all PRs and full access to reports and PR numbering status.
  - System Admins have access to all administrative functions.
  - Unauthorized access attempts redirect to a 403 Forbidden page.

**US-047: Session Timeout**

- **As a** user, **I want** my session to automatically expire after inactivity, **so that** my account is protected if I forget to log out.
- **Acceptance Criteria:**
  - After 30 minutes (configurable) of inactivity, the session expires.
  - A warning dialog appears 5 minutes before expiration, offering to extend the session.
  - Upon expiration, the user is redirected to the login page with a message.
  - Any unsaved draft data is auto-saved before redirect.

**US-048: View Audit Logs**

- **As a** System Admin, **I want to** view the system audit logs, **so that** I can investigate actions and ensure compliance.
- **Acceptance Criteria:**
  - Logs show: timestamp, user, action type, affected entity, old value, new value, and IP address.
  - Logs are searchable by user, action type, date range, and entity.
  - Logs are read-only; no user can edit or delete them (FR-105).
  - Logs are paginated and sortable.

**US-049: Secure File Upload**

- **As the** system, **I want to** validate all file uploads, **so that** malicious files cannot be uploaded to the platform.
- **Acceptance Criteria:**
  - Only allowed MIME types are accepted (FR-099).
  - Files with mismatched extensions and MIME types are rejected (FR-100).
  - Files exceeding size limits are rejected with a clear error message.
  - Uploaded files are stored in a non-executable directory.

**US-050: Password Policy Enforcement**

- **As the** system, **I want to** enforce strong password policies, **so that** user accounts are protected from unauthorized access.
- **Acceptance Criteria:**
  - Minimum 8 characters, must include: uppercase, lowercase, digit, special character.
  - Passwords cannot be the same as the last 5 passwords.
  - Password requirements are displayed clearly on the registration and change-password forms.
  - Weak passwords are rejected with specific guidance on what is missing.

---

## 10. Assumptions and Constraints

### Assumptions

| ID    | Assumption                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-001 | All users have access to a modern web browser (Chrome, Firefox, Edge, Safari --- latest 2 versions).                                               |
| A-002 | The organization has a reliable internal network or internet connection for all users.                                                             |
| A-003 | The approval chain (Dept Head -> COO -> CEO) is standard for all departments and all PR amounts. Future phases may introduce amount-based routing. |
| A-004 | Each department has exactly one designated Department Head at any time.                                                                            |
| A-005 | Users will be provisioned by System Admins; there is no self-registration.                                                                         |
| A-006 | The three-quotation requirement is a company policy that applies to all purchase requests.                                                         |
| A-007 | The organization uses a single currency (PHP or USD) for all purchase requests in Phase 1.                                                         |
| A-008 | The existing IT infrastructure can support a Node.js application server and MongoDB database.                                                      |

### Constraints

| ID    | Constraint                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------ |
| C-001 | The system must be built using NestJS (backend), React (frontend), and MongoDB (database).                   |
| C-002 | The project follows Scrum methodology with 2-week sprint cycles.                                             |
| C-003 | Phase 1 delivers in-app notifications only; email integration is deferred to Phase 2.                        |
| C-004 | The system must operate within the organization's existing infrastructure (no cloud dependency for Phase 1). |
| C-005 | File storage is limited to the application server's local storage in Phase 1.                                |
| C-006 | The development team consists of a defined number of engineers; scope must fit within available capacity.    |
| C-007 | The system must comply with internal IT security policies.                                                   |

---

## 11. Dependencies

| ID    | Dependency                                                                         | Type        | Risk   |
| ----- | ---------------------------------------------------------------------------------- | ----------- | ------ |
| D-001 | Availability of NestJS, React, and MongoDB in the target environment               | Technical   | Low    |
| D-002 | Organization's approval chain policy must be finalized before Module 4 development | Business    | Medium |
| D-003 | Company standard PR form template for the printable report layout                  | Business    | Low    |
| D-004 | IT infrastructure team must provision server(s) and MongoDB instance               | Operational | Medium |
| D-005 | User role and department data must be provided for initial seeding                 | Business    | Low    |
| D-006 | PR number format specification must be confirmed by Accounting                     | Business    | Low    |
| D-007 | Security policy documentation for compliance validation                            | Business    | Low    |
| D-008 | UI/UX design mockups for key screens (optional but recommended)                    | Design      | Low    |

---

## 12. Success Metrics

| ID    | Metric                                      | Target                                     | Measurement Method                      |
| ----- | ------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| SM-01 | PR processing time (submission to approval) | 50% reduction vs. manual process           | Compare average turnaround before/after |
| SM-02 | Lost or misrouted PRs                       | Zero incidents                             | Incident tracking                       |
| SM-03 | Duplicate PR numbers                        | Zero occurrences                           | Database audit query                    |
| SM-04 | System adoption rate                        | 95% of PRs filed digitally within 3 months | PR count comparison                     |
| SM-05 | User satisfaction score                     | >= 4.0 / 5.0                               | User survey at 3-month mark             |
| SM-06 | Report generation time                      | Under 2 minutes for any report             | System timing logs                      |
| SM-07 | System uptime during business hours         | >= 99.5%                                   | Monitoring tool                         |
| SM-08 | Audit trail completeness                    | 100% of actions logged                     | Quarterly audit review                  |
| SM-09 | Approval SLA compliance                     | >= 90% of PRs within 3-day SLA per stage   | Turnaround time report                  |
| SM-10 | Test coverage                               | >= 80%                                     | CI/CD coverage reports                  |

---

## 13. Glossary

| Term                      | Definition                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **PR**                    | Purchase Request --- a formal request to purchase goods or services.                                            |
| **PRAMS**                 | Purchase Request and Approval Management System --- the name of this application.                               |
| **RBAC**                  | Role-Based Access Control --- a method of restricting system access based on user roles.                        |
| **Approval Chain**        | The sequential order of approvers: Department Head -> COO -> CEO/President.                                     |
| **SLA**                   | Service Level Agreement --- the expected maximum time for an action (e.g., 3 business days per approval stage). |
| **Draft**                 | A PR that has been created and saved but not yet submitted for approval.                                        |
| **Submitted**             | A PR that has been formally sent into the approval workflow.                                                    |
| **Under Review**          | A PR that is currently being reviewed by an approver in the chain.                                              |
| **Approved**              | A PR that has received final approval from the CEO/President.                                                   |
| **Rejected**              | A PR that has been denied by any approver, terminating the workflow.                                            |
| **Returned for Revision** | A PR sent back to the requestor for corrections before resubmission.                                            |
| **Cancelled**             | A PR withdrawn by the requestor before any approval action.                                                     |
| **Audit Trail**           | A chronological record of all actions performed on a PR or within the system.                                   |
| **JWT**                   | JSON Web Token --- a compact token format used for stateless authentication.                                    |
| **CRUD**                  | Create, Read, Update, Delete --- the four basic operations on data.                                             |
| **NestJS**                | A progressive Node.js framework for building server-side applications.                                          |
| **React**                 | A JavaScript library for building user interfaces.                                                              |
| **MongoDB**               | A NoSQL document-oriented database.                                                                             |
| **Scrum**                 | An agile framework for iterative and incremental product delivery.                                              |
| **Sprint**                | A fixed-duration iteration (2 weeks in this project) in Scrum methodology.                                      |
| **MVC**                   | Model-View-Controller --- an architectural pattern separating data, logic, and presentation.                    |
| **API**                   | Application Programming Interface --- the contract for communication between frontend and backend.              |
| **MIME Type**             | Multipurpose Internet Mail Extensions type --- identifies the format of a file.                                 |
| **XSS**                   | Cross-Site Scripting --- a security vulnerability involving injection of malicious scripts.                     |
| **CSRF**                  | Cross-Site Request Forgery --- a security attack forcing authenticated users to perform unintended actions.     |
| **TLS**                   | Transport Layer Security --- a cryptographic protocol for secure data transmission.                             |

---

_End of Document_
