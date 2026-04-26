# Product Backlog - Purchase Request and Approval Management System

| Field               | Value                                              |
|---------------------|----------------------------------------------------|
| **Product**         | Purchase Request and Approval Management System    |
| **Tech Stack**      | NestJS (API) + React (UI) + MongoDB (Database)     |
| **Methodology**     | Scrum                                              |
| **Version**         | 1.0                                                |
| **Last Updated**    | 2026-03-19                                         |
| **Product Owner**   | TBD                                                |

---

## Table of Contents

1. [EP-01: Account Management](#ep-01-account-management)
2. [EP-02: Department Management](#ep-02-department-management)
3. [EP-03: Purchase Request Filing](#ep-03-purchase-request-filing)
4. [EP-04: Approval Workflow](#ep-04-approval-workflow)
5. [EP-05: Dashboard](#ep-05-dashboard)
6. [EP-06: Search & Monitoring](#ep-06-search--monitoring)
7. [EP-07: Report Generation](#ep-07-report-generation)
8. [EP-08: Notifications](#ep-08-notifications)
9. [EP-09: PR Numbering Control](#ep-09-pr-numbering-control)
10. [EP-10: Security & Access Control](#ep-10-security--access-control)
11. [Backlog Summary](#backlog-summary)

---

## Roles Reference

| Role             | Description                                         |
|------------------|-----------------------------------------------------|
| Employee         | Files purchase requests                             |
| Dept Head        | First-level approver for department PRs             |
| COO              | Second-level approver                               |
| CEO/President    | Final approver                                      |
| Accounting       | Views financial reports and approved PRs            |
| Admin            | System administrator with full configuration access |

---

## EP-01: Account Management

**Epic Description:** Authentication, user CRUD operations, role management, and user profile features.

### US-0101: User Login

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0101                                                               |
| **Title**          | User Login                                                            |
| **User Story**     | As a user, I want to log in with my email and password, so that I can access the system securely. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | None                                                                  |

**Acceptance Criteria:**

1. **Given** a registered user with valid credentials, **When** they enter their email and password and click "Login", **Then** they are authenticated and redirected to their role-based dashboard.
2. **Given** a user with invalid credentials, **When** they attempt to log in, **Then** an error message "Invalid email or password" is displayed without revealing which field is incorrect.
3. **Given** a successful login, **When** the server responds, **Then** a JWT access token and refresh token are issued and stored securely on the client.
4. **Given** an inactive or locked account, **When** the user attempts to log in, **Then** a message "Your account is inactive. Contact your administrator." is displayed.

---

### US-0102: User Logout

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0102                                                               |
| **Title**          | User Logout                                                           |
| **User Story**     | As a logged-in user, I want to log out of the system, so that my session is terminated and my account is secured. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user, **When** they click the "Logout" button, **Then** their JWT tokens are invalidated and they are redirected to the login page.
2. **Given** a logged-out user, **When** they attempt to access a protected route, **Then** they are redirected to the login page.
3. **Given** a user who logs out, **When** they press the browser back button, **Then** they cannot access cached protected pages.

---

### US-0103: Create User Account

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0103                                                               |
| **Title**          | Create User Account                                                   |
| **User Story**     | As an Admin, I want to create user accounts with assigned roles, so that employees can access the system with appropriate permissions. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the user management page, **When** they fill in name, email, password, role, and department then click "Create", **Then** a new user account is created and a confirmation message is shown.
2. **Given** an Admin creating a user, **When** they enter an email already in use, **Then** a validation error "Email already exists" is displayed.
3. **Given** a newly created user, **When** they log in for the first time, **Then** they are prompted to change their temporary password.
4. **Given** an Admin, **When** they assign a role, **Then** only valid roles (Employee, Dept Head, COO, CEO/President, Accounting, Admin) are available for selection.

---

### US-0104: Edit User Account

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0104                                                               |
| **Title**          | Edit User Account                                                     |
| **User Story**     | As an Admin, I want to edit existing user accounts, so that I can update roles, departments, or personal information as needed. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0103                                                               |

**Acceptance Criteria:**

1. **Given** an Admin viewing a user's details, **When** they modify any field and click "Save", **Then** the user account is updated and a success message is shown.
2. **Given** an Admin changing a user's role, **When** the change is saved, **Then** the user's permissions are updated immediately upon their next request.
3. **Given** an Admin editing a user, **When** they clear a required field, **Then** a validation error is displayed and the form is not submitted.

---

### US-0105: Deactivate User Account

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0105                                                               |
| **Title**          | Deactivate User Account                                               |
| **User Story**     | As an Admin, I want to deactivate a user account, so that former employees or unauthorized users can no longer access the system. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0103                                                               |

**Acceptance Criteria:**

1. **Given** an Admin viewing a user list, **When** they click "Deactivate" on an active user and confirm, **Then** the user's status is set to inactive.
2. **Given** a deactivated user, **When** they attempt to log in, **Then** they receive the message "Your account is inactive. Contact your administrator."
3. **Given** a deactivated user with active sessions, **When** the deactivation is processed, **Then** all existing sessions for that user are invalidated.

---

### US-0106: View User List

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0106                                                               |
| **Title**          | View User List                                                        |
| **User Story**     | As an Admin, I want to view a paginated list of all users with search and filter capabilities, so that I can manage accounts efficiently. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0103                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the user management page, **When** the page loads, **Then** a paginated table of users is displayed with columns: Name, Email, Role, Department, Status.
2. **Given** an Admin, **When** they type in the search field, **Then** the list is filtered by name or email in real time.
3. **Given** an Admin, **When** they select a role or department filter, **Then** only matching users are displayed.

---

### US-0107: Manage User Profile

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0107                                                               |
| **Title**          | Manage User Profile                                                   |
| **User Story**     | As a user, I want to view and update my profile information, so that my account details are accurate and current. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user, **When** they navigate to their profile page, **Then** they see their name, email, role, department, and contact information.
2. **Given** a user on their profile page, **When** they update their name or contact information and click "Save", **Then** the changes are persisted and a success message is shown.
3. **Given** a user, **When** they attempt to change their role or department, **Then** those fields are read-only (Admin-only changes).

---

### US-0108: Change Password

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0108                                                               |
| **Title**          | Change Password                                                       |
| **User Story**     | As a user, I want to change my password, so that I can maintain the security of my account. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user on the change password page, **When** they enter their current password, a new password, and confirmation, **Then** the password is updated if the current password is correct.
2. **Given** a user entering a new password, **When** the password does not meet policy requirements (min 8 chars, uppercase, lowercase, number, special char), **Then** specific validation errors are displayed.
3. **Given** a user who successfully changes their password, **When** the change is saved, **Then** all other active sessions are invalidated and the user must re-authenticate.

---

## EP-02: Department Management

**Epic Description:** CRUD operations for departments, employee assignment to departments, and department head designation.

### US-0201: Create Department

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0201                                                               |
| **Title**          | Create Department                                                     |
| **User Story**     | As an Admin, I want to create a new department, so that the organizational structure is reflected in the system. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the department management page, **When** they enter a department name, code, and optional description then click "Create", **Then** a new department is created and appears in the list.
2. **Given** an Admin creating a department, **When** they enter a department name or code that already exists, **Then** a validation error "Department name/code already exists" is displayed.
3. **Given** a newly created department, **When** viewed in the list, **Then** it shows the name, code, head (unassigned), and employee count (0).

---

### US-0202: Edit Department

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0202                                                               |
| **Title**          | Edit Department                                                       |
| **User Story**     | As an Admin, I want to edit department details, so that I can keep organizational information up to date. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0201                                                               |

**Acceptance Criteria:**

1. **Given** an Admin viewing a department, **When** they modify the name or description and click "Save", **Then** the department is updated and a success message is shown.
2. **Given** an Admin editing a department, **When** they change the name to one that already exists, **Then** a validation error is displayed.

---

### US-0203: Deactivate Department

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0203                                                               |
| **Title**          | Deactivate Department                                                 |
| **User Story**     | As an Admin, I want to deactivate a department, so that dissolved or restructured departments are no longer available for selection. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0201                                                               |

**Acceptance Criteria:**

1. **Given** an Admin viewing the department list, **When** they click "Deactivate" on a department with no active PRs and confirm, **Then** the department status is set to inactive.
2. **Given** a department with active (non-terminal) purchase requests, **When** an Admin attempts to deactivate it, **Then** a warning is displayed and deactivation is blocked until PRs are resolved.
3. **Given** an inactive department, **When** a user creates a new PR, **Then** the inactive department does not appear in the department dropdown.

---

### US-0204: Assign Employees to Department

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0204                                                               |
| **Title**          | Assign Employees to Department                                        |
| **User Story**     | As an Admin, I want to assign employees to departments, so that each user is associated with the correct organizational unit. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0103, US-0201                                                      |

**Acceptance Criteria:**

1. **Given** an Admin on the department detail page, **When** they search for and select an employee then click "Assign", **Then** the employee is added to the department's member list.
2. **Given** an employee already assigned to a department, **When** they are assigned to a different department, **Then** they are removed from the previous department automatically.
3. **Given** an Admin, **When** they view the department detail page, **Then** a list of all assigned employees with their names and roles is displayed.

---

### US-0205: Designate Department Head

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0205                                                               |
| **Title**          | Designate Department Head                                             |
| **User Story**     | As an Admin, I want to designate a department head, so that PRs from that department are routed to the correct first-level approver. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0204                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the department detail page, **When** they select an employee and click "Set as Head", **Then** that employee is designated as the department head and their role is updated to Dept Head.
2. **Given** a department that already has a head, **When** a new head is designated, **Then** the previous head's role reverts to Employee (unless they hold another role).
3. **Given** a department head designation, **When** a PR is submitted by an employee of that department, **Then** the workflow routes it to the designated head for first-level approval.

---

### US-0206: View Department List

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0206                                                               |
| **Title**          | View Department List                                                  |
| **User Story**     | As an Admin, I want to view a list of all departments, so that I can manage the organizational structure. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0201                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the department management page, **When** the page loads, **Then** a list of departments is displayed with columns: Name, Code, Head, Employee Count, Status.
2. **Given** an Admin, **When** they click on a department row, **Then** the department detail page is shown with full member list and metadata.
3. **Given** an Admin, **When** they use the search field, **Then** departments are filtered by name or code.

---

## EP-03: Purchase Request Filing

**Epic Description:** Creation and management of purchase requests including form fields, item management, attachments, auto-computation, and draft saving.

### US-0301: Create Purchase Request

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0301                                                               |
| **Title**          | Create Purchase Request                                               |
| **User Story**     | As an Employee, I want to create a purchase request with all required details, so that I can formally request the procurement of items or services. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0101, US-0204, US-0901                                             |

**Acceptance Criteria:**

1. **Given** an Employee on the "New Purchase Request" page, **When** the form loads, **Then** the date, PR number, requestor name, and department are auto-populated.
2. **Given** an Employee filling out the PR form, **When** they enter project name, purpose, and add line items (description, quantity, unit cost), **Then** the line total is auto-computed as quantity x unit cost.
3. **Given** multiple line items, **When** items are added or modified, **Then** the grand total is auto-computed as the sum of all line totals.
4. **Given** a valid PR form, **When** the Employee clicks "Submit", **Then** the PR is saved with status "Submitted" and routed to the department head for approval.

---

### US-0302: Add Line Items to PR

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0302                                                               |
| **Title**          | Add Line Items to Purchase Request                                    |
| **User Story**     | As an Employee, I want to add, edit, and remove line items on a PR, so that I can accurately specify the items or services to be procured. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee on the PR form, **When** they click "Add Item", **Then** a new row is added with fields: Item Description, Quantity, Unit of Measure, Unit Cost, and Total.
2. **Given** a line item row, **When** the Employee enters quantity and unit cost, **Then** the total is auto-calculated as quantity x unit cost in real time.
3. **Given** multiple line items, **When** the Employee clicks the remove icon on a row, **Then** the row is removed and the grand total is recalculated.
4. **Given** a PR with no line items, **When** the Employee attempts to submit, **Then** a validation error "At least one item is required" is displayed.

---

### US-0303: Upload Attachments to PR

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0303                                                               |
| **Title**          | Upload Attachments to PR                                              |
| **User Story**     | As an Employee, I want to upload supporting documents (quotations, photos) to my PR, so that approvers have the information they need to make a decision. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee on the PR form, **When** they click "Upload", **Then** they can select files (PDF, JPG, PNG) up to 10 MB each.
2. **Given** an Employee submitting a PR, **When** fewer than 3 quotation documents are attached, **Then** a validation warning "At least 3 quotations are recommended" is displayed (soft validation).
3. **Given** uploaded attachments, **When** they are saved, **Then** each attachment shows filename, size, upload date, and a remove button.
4. **Given** an approver viewing a PR, **When** they click an attachment, **Then** the file opens in a preview pane or is downloaded.

---

### US-0304: Save PR as Draft

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0304                                                               |
| **Title**          | Save Purchase Request as Draft                                        |
| **User Story**     | As an Employee, I want to save an incomplete PR as a draft, so that I can continue working on it later. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee filling out a PR form, **When** they click "Save Draft", **Then** the PR is saved with status "Draft" without triggering validation for required fields.
2. **Given** an Employee viewing their PR list, **When** they filter by "Draft" status, **Then** all draft PRs are shown and can be opened for editing.
3. **Given** an Employee editing a draft PR, **When** they make changes and click "Save Draft" again, **Then** the existing draft is updated (not duplicated).

---

### US-0305: Edit Submitted PR (Before Review)

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0305                                                               |
| **Title**          | Edit Submitted PR Before Review                                       |
| **User Story**     | As an Employee, I want to edit or recall a submitted PR that has not yet been reviewed, so that I can correct mistakes. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee viewing a submitted PR with status "Submitted", **When** they click "Recall", **Then** the PR status changes to "Draft" and becomes editable.
2. **Given** a PR with status "Under Review" (approver has already opened it), **When** the Employee attempts to recall, **Then** the action is blocked with message "This PR is already under review."
3. **Given** a recalled PR, **When** the Employee re-submits it, **Then** the PR goes through the approval workflow from the beginning.

---

### US-0306: Cancel Purchase Request

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0306                                                               |
| **Title**          | Cancel Purchase Request                                               |
| **User Story**     | As an Employee, I want to cancel a PR that is no longer needed, so that it does not proceed through the approval process unnecessarily. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee viewing their PR with status "Draft" or "Submitted", **When** they click "Cancel" and provide a reason, **Then** the PR status changes to "Cancelled".
2. **Given** a PR with status "Approved" or already in a terminal state, **When** the Employee attempts to cancel, **Then** the action is blocked.
3. **Given** a cancelled PR, **When** viewed, **Then** the cancellation reason and timestamp are displayed in the audit trail.

---

### US-0307: View My Purchase Requests

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0307                                                               |
| **Title**          | View My Purchase Requests                                             |
| **User Story**     | As an Employee, I want to view a list of all my purchase requests, so that I can track their status and history. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee on the "My PRs" page, **When** the page loads, **Then** a paginated list of their PRs is displayed with columns: PR#, Date, Project, Grand Total, Status.
2. **Given** an Employee, **When** they click on a PR row, **Then** the full PR detail page is shown.
3. **Given** an Employee, **When** they use the status filter, **Then** only PRs matching the selected status are shown.

---

### US-0308: PR Form Validation

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0308                                                               |
| **Title**          | Purchase Request Form Validation                                      |
| **User Story**     | As an Employee, I want the PR form to validate all required fields before submission, so that incomplete or invalid requests are not submitted. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** an Employee submitting a PR, **When** required fields (project, purpose, at least one item) are missing, **Then** specific field-level error messages are displayed.
2. **Given** an Employee entering line items, **When** quantity is zero or negative or unit cost is negative, **Then** a validation error is shown on the offending field.
3. **Given** server-side validation, **When** the API receives an invalid PR, **Then** it returns a 422 response with field-specific error messages.

---

## EP-04: Approval Workflow

**Epic Description:** Multi-level approval chain, status transitions, approval/rejection/return actions with comments, and full audit trail.

### US-0401: Submit PR for Approval

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0401                                                               |
| **Title**          | Submit PR for Approval                                                |
| **User Story**     | As an Employee, I want to submit a PR for approval, so that it enters the multi-level approval workflow. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0301, US-0205                                                      |

**Acceptance Criteria:**

1. **Given** an Employee with a valid complete PR, **When** they click "Submit", **Then** the PR status changes from "Draft" to "Submitted" and is routed to the department head.
2. **Given** a submitted PR, **When** the department head opens their approval queue, **Then** the PR appears in their list of pending approvals.
3. **Given** a department with no designated head, **When** an Employee attempts to submit, **Then** an error "No department head assigned. Contact your administrator." is displayed.

---

### US-0402: Approve Purchase Request

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0402                                                               |
| **Title**          | Approve Purchase Request                                              |
| **User Story**     | As an Approver (Dept Head/COO/CEO), I want to approve a PR, so that it advances to the next approval level or is finalized. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0401                                                               |

**Acceptance Criteria:**

1. **Given** a Dept Head viewing a submitted PR, **When** they click "Approve" and add an optional comment, **Then** the PR status changes to "Under Review" and is routed to the COO.
2. **Given** the COO viewing a Dept Head-approved PR, **When** they click "Approve", **Then** the PR is routed to the CEO/President.
3. **Given** the CEO/President viewing a COO-approved PR, **When** they click "Approve", **Then** the PR status changes to "Approved" (final status).
4. **Given** any approval action, **When** it is performed, **Then** an audit trail entry is created with the approver's name, role, action, comment, and timestamp.

---

### US-0403: Reject Purchase Request

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0403                                                               |
| **Title**          | Reject Purchase Request                                               |
| **User Story**     | As an Approver, I want to reject a PR with a reason, so that the requestor understands why their request was denied. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0402                                                               |

**Acceptance Criteria:**

1. **Given** an Approver viewing a PR pending their action, **When** they click "Reject" and enter a mandatory reason, **Then** the PR status changes to "Rejected".
2. **Given** a rejection, **When** the action is completed, **Then** the requestor can view the rejection reason in the PR detail and audit trail.
3. **Given** a rejected PR, **When** the Employee views it, **Then** they see the option to create a new PR based on the rejected one (copy).

---

### US-0404: Return Purchase Request for Revision

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0404                                                               |
| **Title**          | Return PR for Revision                                                |
| **User Story**     | As an Approver, I want to return a PR to the requestor for revision, so that they can correct issues without a full rejection. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0402                                                               |

**Acceptance Criteria:**

1. **Given** an Approver viewing a PR, **When** they click "Return" and provide a mandatory reason, **Then** the PR status changes to "Returned" and the requestor is notified.
2. **Given** a returned PR, **When** the Employee edits and re-submits it, **Then** the PR re-enters the approval workflow from the first level.
3. **Given** a returned PR, **When** viewed, **Then** the return reason and all previous approval actions are visible in the audit trail.

---

### US-0405: Add Comment to PR

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0405                                                               |
| **Title**          | Add Comment to Purchase Request                                       |
| **User Story**     | As an Approver or Employee, I want to add comments to a PR, so that clarifications and discussions are documented within the PR. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** a user viewing a PR detail page, **When** they type a comment and click "Post", **Then** the comment is saved with the user's name, role, and timestamp.
2. **Given** a PR with comments, **When** viewed, **Then** all comments are displayed in chronological order.
3. **Given** a comment is posted, **When** the comment references the requestor or approver, **Then** a notification is sent to the mentioned user.

---

### US-0406: View Approval Queue

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0406                                                               |
| **Title**          | View Approval Queue                                                   |
| **User Story**     | As an Approver, I want to see a list of PRs pending my approval, so that I can efficiently manage my approval workload. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0402                                                               |

**Acceptance Criteria:**

1. **Given** an Approver on the approval queue page, **When** the page loads, **Then** a list of PRs pending their specific approval level is shown with PR#, Requestor, Department, Amount, Date Submitted.
2. **Given** an Approver, **When** they click on a PR in the queue, **Then** the full PR detail page opens with action buttons (Approve, Reject, Return).
3. **Given** the approval queue, **When** sorted by date, **Then** oldest requests appear first (FIFO) by default.

---

### US-0407: View Audit Trail

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0407                                                               |
| **Title**          | View PR Audit Trail                                                   |
| **User Story**     | As any user, I want to view the full audit trail of a PR, so that I can see the complete history of actions taken. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0402                                                               |

**Acceptance Criteria:**

1. **Given** a user viewing a PR detail page, **When** they click the "History" tab, **Then** a chronological list of all actions is displayed (created, submitted, approved, rejected, returned, commented, cancelled).
2. **Given** each audit entry, **When** viewed, **Then** it shows: action type, performed by (name + role), timestamp, and any associated comment or reason.
3. **Given** the audit trail, **When** an action was performed, **Then** the entry is immutable and cannot be edited or deleted.

---

## EP-05: Dashboard

**Epic Description:** Role-based dashboard views with widgets showing PR statistics, trends, and pending actions.

### US-0501: Employee Dashboard

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0501                                                               |
| **Title**          | Employee Dashboard                                                    |
| **User Story**     | As an Employee, I want to see a dashboard with my PR summary, so that I have a quick overview of my purchase request activity. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0301, US-0401                                                      |

**Acceptance Criteria:**

1. **Given** an Employee logging in, **When** the dashboard loads, **Then** they see widgets: Total My PRs, PRs by Status (Draft, Submitted, Approved, Rejected, Returned, Cancelled), and Total Amount Requested.
2. **Given** the dashboard, **When** an Employee has returned PRs, **Then** a prominent "Action Required" section highlights PRs needing revision.
3. **Given** the dashboard, **When** an Employee clicks a widget, **Then** they are navigated to the filtered PR list.

---

### US-0502: Approver Dashboard

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0502                                                               |
| **Title**          | Approver Dashboard                                                    |
| **User Story**     | As an Approver (Dept Head/COO/CEO), I want to see a dashboard with pending approvals and team statistics, so that I can prioritize my approval actions. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0406                                                               |

**Acceptance Criteria:**

1. **Given** an Approver logging in, **When** the dashboard loads, **Then** they see: Pending Approvals count, PRs Approved this month, PRs Rejected this month, Total Amount in Pipeline.
2. **Given** a Dept Head, **When** the dashboard loads, **Then** they see department-specific statistics and a list of their team's recent PRs.
3. **Given** the COO or CEO, **When** the dashboard loads, **Then** they see organization-wide statistics across all departments.

---

### US-0503: Admin Dashboard

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0503                                                               |
| **Title**          | Admin Dashboard                                                       |
| **User Story**     | As an Admin, I want a system overview dashboard, so that I can monitor system health and user activity. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0106, US-0206                                                      |

**Acceptance Criteria:**

1. **Given** an Admin logging in, **When** the dashboard loads, **Then** they see: Total Users (active/inactive), Total Departments, Total PRs, and System Activity (logins, actions per day).
2. **Given** the Admin dashboard, **When** they view user statistics, **Then** a breakdown by role is displayed.

---

### US-0504: Accounting Dashboard

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0504                                                               |
| **Title**          | Accounting Dashboard                                                  |
| **User Story**     | As an Accounting user, I want a financial overview dashboard, so that I can monitor approved purchase amounts and budget impact. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0402                                                               |

**Acceptance Criteria:**

1. **Given** an Accounting user logging in, **When** the dashboard loads, **Then** they see: Total Approved Amount (this month/quarter/year), PRs by Department with amounts, and a trend chart of approved amounts over time.
2. **Given** the Accounting dashboard, **When** they click on a department row, **Then** they see all approved PRs for that department.

---

### US-0505: Dashboard Trend Charts

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0505                                                               |
| **Title**          | Dashboard Trend Charts                                                |
| **User Story**     | As any user, I want to see trend charts on the dashboard, so that I can visualize PR activity over time. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0501                                                               |

**Acceptance Criteria:**

1. **Given** a dashboard with sufficient data, **When** the page loads, **Then** a line chart showing PR count by month (last 12 months) is displayed.
2. **Given** the trend chart, **When** a user hovers over a data point, **Then** a tooltip shows the exact count and amount for that period.
3. **Given** the trend chart, **When** a user selects a date range filter, **Then** the chart updates to reflect the selected period.

---

## EP-06: Search & Monitoring

**Epic Description:** Comprehensive search and filtering capabilities for purchase requests with detailed views and timeline visualization.

### US-0601: Search PRs by Multiple Criteria

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0601                                                               |
| **Title**          | Search PRs by Multiple Criteria                                       |
| **User Story**     | As any user, I want to search for PRs using multiple criteria, so that I can quickly find specific purchase requests. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0301                                                               |

**Acceptance Criteria:**

1. **Given** a user on the search page, **When** they enter criteria (PR#, requestor name, department, project, date range, status, approver, item description, amount range), **Then** matching PRs are displayed in a paginated list.
2. **Given** multiple search criteria, **When** applied together, **Then** results are filtered by the intersection (AND logic) of all criteria.
3. **Given** search results, **When** the user clicks a PR, **Then** the detailed PR view is shown.
4. **Given** the search page, **When** no criteria are entered, **Then** all PRs accessible to the user's role are shown (with pagination).

---

### US-0602: Quick Search

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0602                                                               |
| **Title**          | Quick Search                                                          |
| **User Story**     | As any user, I want a global search bar, so that I can quickly find a PR by number or keyword without navigating to the search page. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0601                                                               |

**Acceptance Criteria:**

1. **Given** a user on any page, **When** they type in the global search bar in the header, **Then** a dropdown shows matching PRs by PR# or requestor name.
2. **Given** search results in the dropdown, **When** the user clicks a result, **Then** they are navigated to the PR detail page.
3. **Given** the search bar, **When** the user presses Enter, **Then** they are navigated to the full search page with their query pre-filled.

---

### US-0603: View PR Detail with Timeline

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0603                                                               |
| **Title**          | View PR Detail with Timeline                                          |
| **User Story**     | As any user, I want to view a PR's complete details with a visual timeline, so that I can understand the full context and history at a glance. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0407                                                               |

**Acceptance Criteria:**

1. **Given** a user viewing a PR detail page, **When** the page loads, **Then** all PR fields, line items, attachments, and a visual timeline of status changes are displayed.
2. **Given** the timeline, **When** viewed, **Then** each node shows the action, actor, date/time, and any comment, with visual indicators for the current status.
3. **Given** the PR detail page, **When** the user's role permits actions (approve/reject/return), **Then** action buttons are displayed; otherwise, the page is read-only.

---

### US-0604: Filter PRs by Status

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0604                                                               |
| **Title**          | Filter PRs by Status                                                  |
| **User Story**     | As any user, I want to filter PRs by their current status, so that I can focus on requests in a specific stage of the workflow. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0601                                                               |

**Acceptance Criteria:**

1. **Given** a user on the PR list or search page, **When** they select one or more statuses from a filter dropdown, **Then** only PRs with those statuses are shown.
2. **Given** the status filter, **When** "All" is selected, **Then** all PRs are shown regardless of status.
3. **Given** the filter selections, **When** the page is refreshed, **Then** the filter state is preserved in the URL query parameters.

---

### US-0605: Export Search Results

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0605                                                               |
| **Title**          | Export Search Results                                                  |
| **User Story**     | As any user, I want to export the current search results, so that I can use the data offline or share it with others. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0601, US-0701                                                      |

**Acceptance Criteria:**

1. **Given** a user viewing search results, **When** they click "Export", **Then** they can choose between Excel (.xlsx) and PDF formats.
2. **Given** an export, **When** generated, **Then** the exported file contains only the filtered results (not all PRs).
3. **Given** the export, **When** downloaded, **Then** the file includes: PR#, Date, Requestor, Department, Project, Grand Total, and Status.

---

## EP-07: Report Generation

**Epic Description:** Excel and PDF report generation with various report types and configurable filters.

### US-0701: Generate PR Summary Report

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0701                                                               |
| **Title**          | Generate PR Summary Report                                            |
| **User Story**     | As an Accounting user or Admin, I want to generate a summary report of PRs, so that I can analyze procurement activity over a period. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0301, US-0402                                                      |

**Acceptance Criteria:**

1. **Given** a user on the reports page, **When** they select "PR Summary Report" and configure filters (date range, department, status), **Then** a report is generated with PR count, total amounts by status, and department breakdown.
2. **Given** the generated report, **When** the user clicks "Download as Excel", **Then** an .xlsx file is downloaded with formatted data and summary rows.
3. **Given** the generated report, **When** the user clicks "Download as PDF", **Then** a formatted .pdf file is downloaded with headers, tables, and totals.

---

### US-0702: Generate Department Spending Report

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0702                                                               |
| **Title**          | Generate Department Spending Report                                   |
| **User Story**     | As an Accounting user, I want to generate a report showing spending by department, so that I can track departmental procurement costs. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0701                                                               |

**Acceptance Criteria:**

1. **Given** a user selecting "Department Spending Report", **When** they choose a date range, **Then** a report showing total approved amounts per department is generated.
2. **Given** the report, **When** viewed, **Then** it includes: Department Name, Number of Approved PRs, Total Amount, and Percentage of Overall Spending.

---

### US-0703: Generate Detailed PR Report

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0703                                                               |
| **Title**          | Generate Detailed PR Report                                           |
| **User Story**     | As an Approver or Accounting user, I want to generate a detailed report for a specific PR, so that I can have a printable record of the full request and its approval history. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0407                                                               |

**Acceptance Criteria:**

1. **Given** a user viewing a PR detail page, **When** they click "Generate Report", **Then** a PDF is generated with all PR details: header info, line items, attachments list, and full audit trail.
2. **Given** the generated PDF, **When** opened, **Then** it has a professional layout with company header, PR number, and signature lines for each approver.

---

### US-0704: Generate Approval Turnaround Report

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0704                                                               |
| **Title**          | Generate Approval Turnaround Report                                   |
| **User Story**     | As a CEO or Admin, I want a report showing average approval turnaround time, so that I can identify bottlenecks in the approval process. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0407                                                               |

**Acceptance Criteria:**

1. **Given** a user selecting "Approval Turnaround Report", **When** they choose a date range, **Then** a report is generated with: average time per approval level, average total time from submission to final approval, and breakdown by department.
2. **Given** the report, **When** downloaded, **Then** the data is available in both Excel and PDF formats.

---

### US-0705: Schedule Recurring Reports

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0705                                                               |
| **Title**          | Schedule Recurring Reports                                            |
| **User Story**     | As an Admin or Accounting user, I want to schedule reports to be generated automatically on a recurring basis, so that stakeholders receive regular procurement updates. |
| **Priority**       | Won't Have                                                            |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0701, US-0801                                                      |

**Acceptance Criteria:**

1. **Given** a user on the reports page, **When** they configure a report with a schedule (daily, weekly, monthly), **Then** the report is auto-generated and sent via notification/email at the configured interval.
2. **Given** a scheduled report, **When** it fails to generate, **Then** an error notification is sent to the Admin.

---

## EP-08: Notifications

**Epic Description:** In-app notification system for key workflow events.

### US-0801: Receive Notification on PR Submission

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0801                                                               |
| **Title**          | Notify Approver on PR Submission                                      |
| **User Story**     | As an Approver, I want to receive a notification when a PR is submitted for my approval, so that I am aware of pending actions. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0401                                                               |

**Acceptance Criteria:**

1. **Given** an Employee submits a PR, **When** the PR is routed to the Dept Head, **Then** the Dept Head receives an in-app notification with PR# and requestor name.
2. **Given** a notification, **When** the Approver clicks it, **Then** they are navigated to the PR detail page.
3. **Given** unread notifications, **When** the Approver views the notification bell, **Then** a badge shows the count of unread notifications.

---

### US-0802: Receive Notification on PR Status Change

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0802                                                               |
| **Title**          | Notify Requestor on PR Status Change                                  |
| **User Story**     | As an Employee, I want to receive a notification when my PR is approved, rejected, or returned, so that I can take appropriate follow-up action. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0402, US-0403, US-0404                                             |

**Acceptance Criteria:**

1. **Given** an Approver takes action on a PR, **When** the PR status changes, **Then** the requestor receives an in-app notification with the new status and any comment.
2. **Given** a returned PR notification, **When** the Employee clicks it, **Then** they are navigated to the editable PR form.

---

### US-0803: View Notification History

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0803                                                               |
| **Title**          | View Notification History                                             |
| **User Story**     | As any user, I want to view my notification history, so that I can review past alerts and actions. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0801                                                               |

**Acceptance Criteria:**

1. **Given** a user clicking the notification icon, **When** the panel opens, **Then** a list of notifications is displayed in reverse chronological order.
2. **Given** the notification list, **When** viewed, **Then** read and unread notifications are visually distinct.
3. **Given** the notification list, **When** the user clicks "Mark All as Read", **Then** all unread notifications are marked as read.

---

### US-0804: Notification Preferences

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0804                                                               |
| **Title**          | Notification Preferences                                              |
| **User Story**     | As a user, I want to configure my notification preferences, so that I only receive alerts relevant to me. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0801                                                               |

**Acceptance Criteria:**

1. **Given** a user on the settings page, **When** they toggle notification types (submissions, approvals, rejections, returns, comments), **Then** only selected notification types are delivered.
2. **Given** saved preferences, **When** an event occurs for a disabled type, **Then** no notification is created for that user.

---

### US-0805: Real-Time Notification Delivery

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0805                                                               |
| **Title**          | Real-Time Notification Delivery                                       |
| **User Story**     | As a user, I want to receive notifications in real time without refreshing the page, so that I am immediately aware of updates. |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0801                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user, **When** a notification event occurs, **Then** the notification badge updates in real time via WebSocket connection.
2. **Given** the WebSocket disconnects, **When** the user's connection is restored, **Then** any missed notifications are fetched and displayed.

---

## EP-09: PR Numbering Control

**Epic Description:** Automatic PR number generation with configurable formats and series tracking.

### US-0901: Auto-Generate PR Number

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0901                                                               |
| **Title**          | Auto-Generate PR Number                                               |
| **User Story**     | As the system, I want to automatically generate a unique PR number when a purchase request is created, so that every PR has a consistent, traceable identifier. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | None                                                                  |

**Acceptance Criteria:**

1. **Given** an Employee creates a new PR, **When** the PR form loads, **Then** a unique PR number is auto-assigned in the format: `PR-YYYY-NNNNN` (e.g., PR-2026-00001).
2. **Given** multiple PRs created concurrently, **When** PR numbers are generated, **Then** each number is unique with no duplicates (atomic counter).
3. **Given** a new calendar year, **When** the first PR is created, **Then** the sequence resets to 00001 for the new year.

---

### US-0902: Configure PR Number Format

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0902                                                               |
| **Title**          | Configure PR Number Format                                            |
| **User Story**     | As an Admin, I want to configure the PR number format, so that numbering matches organizational conventions. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0901                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the system settings page, **When** they configure the PR number format (prefix, separator, year format, sequence digits), **Then** new PRs use the updated format.
2. **Given** a format change, **When** applied, **Then** existing PR numbers are not affected (only new PRs use the new format).
3. **Given** the format configuration, **When** the Admin previews the format, **Then** an example PR number is displayed.

---

### US-0903: View PR Number Series

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0903                                                               |
| **Title**          | View PR Number Series                                                 |
| **User Story**     | As an Admin, I want to view the current PR number series and last-used number, so that I can monitor numbering continuity. |
| **Priority**       | Should Have                                                           |
| **Story Points**   | 2                                                                     |
| **Dependencies**   | US-0901                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the settings page, **When** they view the PR numbering section, **Then** they see: Current Format, Last Assigned Number, Next Number Preview, and Total PRs This Year.
2. **Given** the series information, **When** any gaps in numbering exist (due to cancelled drafts), **Then** the gaps are noted but not reused.

---

### US-0904: Reset PR Number Sequence

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0904                                                               |
| **Title**          | Reset PR Number Sequence                                              |
| **User Story**     | As an Admin, I want to manually reset the PR number sequence, so that I can handle special administrative situations (e.g., year-end adjustments). |
| **Priority**       | Could Have                                                            |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0901                                                               |

**Acceptance Criteria:**

1. **Given** an Admin on the PR numbering settings page, **When** they enter a new starting number and confirm with their password, **Then** the sequence is reset.
2. **Given** a reset, **When** the new starting number is lower than the last used number, **Then** a warning "This may cause duplicate numbers. Proceed?" is displayed.
3. **Given** a reset action, **When** completed, **Then** an audit log entry records the admin, old value, new value, and timestamp.

---

### US-0905: Department-Specific PR Prefix

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-0905                                                               |
| **Title**          | Department-Specific PR Prefix                                         |
| **User Story**     | As an Admin, I want to optionally include department codes in PR numbers, so that PRs can be identified by department at a glance. |
| **Priority**       | Won't Have                                                            |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0901, US-0201                                                      |

**Acceptance Criteria:**

1. **Given** an Admin enabling department prefix, **When** a PR is created by an IT department employee, **Then** the PR number follows the format: `PR-IT-2026-00001`.
2. **Given** the department prefix feature, **When** disabled, **Then** PR numbers follow the standard format without department codes.

---

## EP-10: Security & Access Control

**Epic Description:** Role-based access control, password policies, session management, and comprehensive audit logging.

### US-1001: Role-Based Access Control

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1001                                                               |
| **Title**          | Role-Based Access Control                                             |
| **User Story**     | As an Admin, I want the system to enforce role-based access control, so that users can only access features and data appropriate to their role. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 8                                                                     |
| **Dependencies**   | US-0103                                                               |

**Acceptance Criteria:**

1. **Given** a user with the Employee role, **When** they attempt to access the admin user management page, **Then** they receive a 403 Forbidden response and are shown an "Access Denied" page.
2. **Given** a user with the Accounting role, **When** they access the system, **Then** they can view approved PRs and reports but cannot create or approve PRs.
3. **Given** a user with the Dept Head role, **When** they view PRs, **Then** they can only see and act on PRs from their own department.
4. **Given** RBAC rules, **When** enforced, **Then** both API endpoints and UI navigation are protected (server-side enforcement, not just UI hiding).

---

### US-1002: Password Policy Enforcement

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1002                                                               |
| **Title**          | Password Policy Enforcement                                          |
| **User Story**     | As an Admin, I want to enforce password policies, so that user accounts are protected by strong credentials. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0108                                                               |

**Acceptance Criteria:**

1. **Given** a user setting or changing a password, **When** the password does not meet requirements (minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character), **Then** the specific unmet requirement is displayed.
2. **Given** a user changing their password, **When** the new password matches any of their last 5 passwords, **Then** it is rejected with "Password has been used recently."
3. **Given** the password policy, **When** enforced, **Then** it applies to all user creation, password change, and password reset operations.

---

### US-1003: Session Timeout

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1003                                                               |
| **Title**          | Session Timeout                                                       |
| **User Story**     | As a security measure, I want user sessions to expire after a period of inactivity, so that unattended sessions are not exploited. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user, **When** they are inactive for 30 minutes, **Then** they are automatically logged out and redirected to the login page with a message "Session expired due to inactivity."
2. **Given** a user approaching session timeout (5 minutes remaining), **When** the warning threshold is reached, **Then** a modal is displayed: "Your session will expire in 5 minutes. Continue?"
3. **Given** a user who clicks "Continue" on the timeout warning, **When** the session is extended, **Then** the inactivity timer resets.

---

### US-1004: Account Lockout

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1004                                                               |
| **Title**          | Account Lockout After Failed Attempts                                 |
| **User Story**     | As a security measure, I want accounts to be locked after repeated failed login attempts, so that brute-force attacks are mitigated. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 3                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a user attempting to log in, **When** they fail 5 consecutive times, **Then** the account is locked for 30 minutes.
2. **Given** a locked account, **When** the user attempts to log in, **Then** the message "Account locked due to multiple failed attempts. Try again in X minutes." is displayed.
3. **Given** a locked account, **When** an Admin manually unlocks it, **Then** the user can log in immediately.

---

### US-1005: Security Audit Log

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1005                                                               |
| **Title**          | Security Audit Log                                                    |
| **User Story**     | As an Admin, I want a comprehensive security audit log, so that I can investigate security events and maintain compliance. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** any security-relevant event (login, logout, failed login, password change, role change, account lock/unlock), **When** the event occurs, **Then** an audit log entry is created with: event type, user, IP address, timestamp, and outcome.
2. **Given** an Admin on the audit log page, **When** they filter by event type, user, or date range, **Then** matching entries are displayed.
3. **Given** audit log entries, **When** accessed, **Then** they are immutable (no edit or delete capability).

---

### US-1006: JWT Token Refresh

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Story ID**       | US-1006                                                               |
| **Title**          | JWT Token Refresh                                                     |
| **User Story**     | As a user, I want my session to be seamlessly refreshed before expiry, so that I am not unexpectedly logged out during active use. |
| **Priority**       | Must Have                                                             |
| **Story Points**   | 5                                                                     |
| **Dependencies**   | US-0101                                                               |

**Acceptance Criteria:**

1. **Given** a logged-in user with an access token nearing expiry, **When** the client detects the token will expire within 5 minutes, **Then** a refresh request is automatically sent using the refresh token.
2. **Given** a valid refresh token, **When** a refresh request is made, **Then** a new access token and refresh token pair are issued.
3. **Given** an expired or invalid refresh token, **When** a refresh is attempted, **Then** the user is redirected to the login page.
4. **Given** a refresh token, **When** used, **Then** it is invalidated (one-time use) to prevent token replay attacks.

---

## Backlog Summary

### Story Count by Epic

| Epic   | Epic Name                    | Must Have | Should Have | Could Have | Won't Have | Total |
|--------|------------------------------|-----------|-------------|------------|------------|-------|
| EP-01  | Account Management           | 6         | 1           | 0          | 0          | 8*    |
| EP-02  | Department Management        | 4         | 1           | 0          | 0          | 6*    |
| EP-03  | Purchase Request Filing      | 5         | 2           | 0          | 0          | 8*    |
| EP-04  | Approval Workflow            | 5         | 1           | 0          | 0          | 7*    |
| EP-05  | Dashboard                    | 0         | 3           | 2          | 0          | 5     |
| EP-06  | Search & Monitoring          | 2         | 1           | 1          | 0          | 5*    |
| EP-07  | Report Generation            | 0         | 3           | 1          | 1          | 5     |
| EP-08  | Notifications                | 2         | 1           | 2          | 0          | 5     |
| EP-09  | PR Numbering Control         | 1         | 2           | 1          | 1          | 5     |
| EP-10  | Security & Access Control    | 5         | 0           | 0          | 0          | 6*    |
| **Total** |                           | **30**    | **15**      | **7**      | **2**      | **60** |

*Asterisk indicates epics with "Must Have" stories prioritized for early sprints.

### Story Points by Priority

| Priority    | Count | Total Points |
|-------------|-------|--------------|
| Must Have   | 30    | 127          |
| Should Have | 15    | 60           |
| Could Have  | 7     | 29           |
| Won't Have  | 2     | 11           |
| **Total**   | **54**| **227**      |

> Note: 60 user stories across 10 epics. Point totals guide sprint velocity planning.

### Dependency Graph (Critical Path)

```
US-0101 (Login) ──┬── US-0103 (Create User) ──── US-0104/0105/0106 (User CRUD)
                  ├── US-0201 (Create Dept) ──── US-0204 (Assign Employees) ──── US-0205 (Dept Head)
                  ├── US-1001 (RBAC)
                  └── US-1003/1004/1005/1006 (Security)

US-0205 (Dept Head) ┬── US-0301 (Create PR) ──┬── US-0401 (Submit PR)
                     │                         ├── US-0302-0308 (PR Features)
US-0901 (PR Number) ─┘                        └── US-0801 (Notifications)

US-0401 (Submit) ──── US-0402 (Approve) ──┬── US-0403/0404 (Reject/Return)
                                          ├── US-0407 (Audit Trail)
                                          └── US-0501-0505 (Dashboards)
```
