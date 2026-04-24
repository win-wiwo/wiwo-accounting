# PRAMS Manual QA Checklist

Use this guide for release testing, feature regression checks, or user acceptance testing of the PRAMS application.

The goal is to verify:

- the app loads correctly
- role-based access is enforced
- purchase requests move through the correct workflow
- procurement, approvals, purchase orders, reports, and notifications stay consistent

## 1. Recommended Test Setup

Before testing, make sure these are ready:

- `docker compose up` is running
- frontend opens at `http://localhost:5173`
- API responds at `http://localhost:3000/api`
- MongoDB is healthy
- seed or create test users for these roles:
  - `admin`
  - `staff`
  - `dept_head`
  - `procurement`
  - `coo`
  - `ceo`
  - `accounting`
- at least 2 departments exist
- at least 2 projects exist
- at least 3 suppliers exist

Useful smoke commands:

```bash
docker logs prams-api --tail 50
docker logs prams-web --tail 20
curl http://localhost:3000/api/projects
```

If the UI is completely blank, check the known failure mode first: a Radix `SelectItem value=""` can blank the entire page.

## 2. Test Data You Should Prepare

Create or verify these accounts and records before full QA:

- 1 `staff` user assigned to a department
- 1 `dept_head` user assigned to the same department
- 1 `procurement` user
- 1 `coo`
- 1 `ceo`
- 1 `accounting`
- 1 `admin`
- one active project with a code
- one department with a valid head
- several suppliers with different names

Prepare at least 3 PR scenarios:

- `PR-A`: online-only items
- `PR-B`: procurement-only items
- `PR-C`: mixed online + procurement items

Also prepare these file types for attachment testing:

- PDF
- image file
- unsupported or suspicious file name for negative testing

## 3. High-Level Test Flow

Run manual QA in this order:

1. Environment and login smoke test
2. Admin setup flows
3. Staff purchase request creation
4. Procurement quotation flow
5. Approval flow by role
6. Purchase order flow
7. Search, dashboard, notifications, and reports
8. Negative testing and permission checks

<!-- ## 4. Smoke Test Checklist -->

<!-- - App loads without blank page, console crash, or broken layout -->
<!-- - Login page works -->
<!-- - Invalid login shows an error -->
<!-- - Valid login redirects to dashboard -->
<!-- - Sidebar items match the logged-in role -->
<!-- - Header loads quick search, profile menu, and notifications -->
<!-- - Logout returns to login page -->
<!-- - Refreshing a protected page keeps the session alive if tokens are valid -->
<!-- - Direct navigation to a forbidden route shows `403` or blocks access -->
<!-- - Unknown route shows `404` -->

## 5. Role Access Matrix

Use this as a quick permission check.

| Area | Expected access |
|---|---|
<!-- | Dashboard | all authenticated users | -->
| Purchase Requests | all authenticated users except `admin` should be validated carefully for create actions |
<!-- | Approvals | `dept_head`, `coo`, `ceo` | -->
<!-- | Procurement Queue | `procurement`, `admin` | -->
<!-- | Suppliers | `admin`, `accounting`, `procurement` | -->
<!-- | Purchase Orders | visible to broader set, but create/edit is `procurement`, `admin` | -->
<!-- | Search & Monitor | `admin`, `dept_head`, `coo`, `ceo`, `accounting`, `procurement` | -->
<!-- | Projects | `admin`, `coo`, `ceo` | -->
<!-- | Users | `admin` | -->
<!-- | Departments | `admin` | -->
<!-- | Settings | `admin` | -->
| Reports | verify for every role you intend to support in production |

For each role:

<!-- - confirm allowed pages are visible in the sidebar -->
<!-- - confirm restricted pages are hidden -->
<!-- - confirm direct URL access to restricted pages is blocked -->
<!-- - confirm backend enforcement also blocks unauthorized actions -->

## 6. Admin Setup Checklist

Log in as `admin`.

### Users

<!-- - Create a new user for each role -->
<!-- - Edit a user’s name, email, role, and department -->
<!-- - Deactivate or disable a user if supported -->
<!-- - Confirm list updates correctly after save -->
<!-- - Confirm validation errors for missing required fields -->

### Departments

<!-- - Create a department -->
<!-- - Assign a valid department head -->
- Open department detail page
- Edit department name/code
- Confirm department head mapping displays correctly

### Projects

- Create a project
- Edit a project
- Confirm projects appear in PR forms

### Suppliers

- Create a supplier
- View supplier detail
- Edit supplier data
- Confirm supplier list/search behaves correctly

### Settings / PR Numbering

- Open settings page without errors
- Change PR numbering format
- Verify preview updates immediately
- Save configuration
- Create a new PR after save and verify generated PR number matches the configured pattern

## 7. Staff PR Creation Checklist

Log in as `staff`.

### Draft Creation

- Create a PR with title, justification, needed date, and at least one line item
- Save as draft
- Confirm draft appears in PR list
- Open draft detail page
- Edit the draft
- Delete the draft if deletion is supported

### Line Items

- Add multiple line items
- Verify quantity x price computes total correctly
- Verify total PR amount updates correctly
- Test both sourcing types:
  - `online`
  - `procurement`
- Add seller references for online sourcing
- Add notes/specifications
- Add item photo if supported

### Attachments

- Upload requester attachment
- Verify attachment appears in detail page
- Remove attachment if supported
- Try unsupported or invalid upload and verify error handling

### Validation

- Submit with missing required fields and verify validation messages
- Enter zero, negative, or invalid numeric values where not allowed
- Verify date validation if `neededByDate` is required or constrained

## 8. Purchase Request Workflow Checklist

There are two main PR paths.

### Path A: Online-only PR

Expected flow:

`draft -> level1_review -> level2_review -> level3_review -> approved`

If the requester is a `dept_head`, Level 1 may be skipped and the PR can start at `level2_review`.

Test steps:

1. Submit an online-only PR as `staff`
2. Confirm PR number is generated
3. Confirm status moves out of draft
4. Confirm it appears in Dept Head approvals
5. Approve as `dept_head`
6. Confirm it appears for `coo`
7. Approve as `coo`
8. Confirm it appears for `ceo`
9. Approve as `ceo`
10. Confirm final status is `approved`

### Path B: Procurement-sourced PR

Expected flow:

`draft -> pending_quotation -> quoted -> level1_review/level2_review -> level3_review -> approved`

The exact post-quotation level depends on whether the requester is the department head.

Test steps:

1. Submit a procurement-only PR as `staff`
2. Confirm status becomes `pending_quotation`
3. Confirm it appears in Procurement Queue
4. Upload at least one quotation evidence attachment
5. Add canvass/quotation details
6. Submit quotation
7. Confirm status moves to `quoted` or next review stage as expected
8. Complete approvals through remaining approvers
9. Confirm final status is `approved`

### Path C: Mixed Sourcing PR

- Submit a PR with both online and procurement items
- Confirm procurement-owned items still require quotation
- Confirm online item data remains visible during approval
- Confirm approvers can review both sourcing types clearly

## 9. Procurement Checklist

Log in as `procurement`.

- Open Procurement Queue
- Confirm only relevant PRs appear
- Open PR detail from queue
- Add quotation evidence attachment
- Remove quotation evidence attachment
- Submit quotation successfully
- Verify quotation cannot be submitted without at least one evidence file
- Return PR for info with a note
- Verify requester sees the return note
- Verify returned PR moves to `returned_for_info`

Negative checks:

- procurement cannot approve PRs unless explicitly allowed
- procurement cannot edit requester-owned fields that should be locked

## 10. Approver Checklist

Run this for `dept_head`, `coo`, and `ceo`.

- Open Approvals page
- Confirm only correct pending items appear
- Open approval modal/detail
- Review requester details, items, totals, attachments, and quotation evidence
- Approve a PR
- Reject a PR with comments
- Return a PR with comments
- Confirm status changes correctly after each action
- Confirm returned PR becomes editable again for requester
- Confirm rejected PR is no longer editable if that is the intended rule

Critical rule checks:

- approver cannot approve their own PR
- wrong approver role cannot act on the item
- comments/conditions persist in approval history

## 11. Requester Rework Checklist

Use a PR that was `returned` or `returned_for_info`.

- Open the PR as requester
- Confirm return reason is visible
- Edit allowed fields
- Re-upload or adjust supporting documents
- Resubmit
- Confirm workflow restarts correctly

Also test recall:

- recall a PR while it is still awaiting quotation or review
- confirm status moves back to `draft`
- confirm PR becomes editable again
- confirm recall history is visible if shown in UI

## 12. Purchase Order Checklist

Use an approved PR if the PO flow depends on it.

Log in as `procurement` or `admin`.

- Open Purchase Orders list
- Create a new PO
- Verify supplier/project/PR linkage behaves correctly
- Save draft PO
- Edit draft PO
- Submit PO
- Confirm status becomes `submitted`
- Approve PO using the allowed approver flow
- Mark PO as issued if supported
- Confirm final state and visible timestamps

Negative checks:

- only `procurement` and `admin` can create/edit/submit POs
- only submitted POs can be approved
- cancelled or issued POs should block invalid actions

## 13. Search, Dashboard, and Notifications

### Dashboard

- Dashboard loads for each intended role
- Counts by status are plausible
- totals update after creating and approving PRs
- no cards show obviously stale or broken data

### Search & Monitor

- search by PR number
- search by title
- filter by status
- sort by submitted date or available fields
- open result detail page from search results

### Header Quick Search

- search with 2+ characters
- confirm dropdown results appear
- press `Enter` to navigate to full search page
- test `Ctrl+K` shortcut

### Notifications

- notification bell count updates after submit/approve/return events
- open notification popover
- click a notification and verify navigation
- mark one as read
- mark all as read

## 14. Reports Checklist

Open Reports page.

- page loads without errors
- date filters work
- status filter works
- `All Statuses` does not break the page
- download PR Summary in Excel
- download PR Summary in PDF
- download Department Spending report
- download Approval Turnaround in Excel
- download Approval Turnaround in PDF
- open each downloaded file and verify:
  - file is not corrupted
  - filename is reasonable
  - filters are reflected in output
  - data matches the UI/database sample you tested

## 15. Profile and Authentication Checklist

For a normal user:

- open profile page
- verify own user info is correct
- change password with valid current password
- verify login works with new password
- verify old password no longer works

Negative checks:

- wrong current password is rejected
- logged-out user cannot access protected routes
- expired session redirects cleanly to login or refresh flow

## 16. Negative and Regression Checklist

Focus on the known fragile areas in this repo.

- no blank page caused by select controls
- API-backed pages still load after TypeScript/backend changes
- PR number generation still works after settings changes
- `projectId` relationships display correctly in PRs and POs
- returned PRs are editable only in intended statuses
- procurement quotation requires evidence attachment
- approval history remains visible after approve/reject/return
- notifications do not link to missing PRs
- response envelope usage is intact: lists and detail pages still read `.data`

## 17. Suggested End-to-End Test Script

If you only have time for one full pass, run this:

1. Log in as `admin` and verify users, departments, projects, suppliers, and PR numbering.
2. Log in as `staff` and create one procurement-based PR with attachments.
3. Submit it and confirm it lands in Procurement Queue.
4. Log in as `procurement`, attach quotation evidence, submit quotation.
5. Log in as `dept_head`, approve.
6. Log in as `coo`, approve.
7. Log in as `ceo`, approve.
8. Log back in as `procurement` or `admin`, create and submit a PO if applicable.
9. Verify notifications, dashboard counts, search results, and reports reflect the completed transaction.

## 18. Test Result Template

Use this simple format when recording QA:

| Area | Scenario | Role | Result | Notes |
|---|---|---|---|---|
| PR Flow | Submit procurement PR | staff | Pass/Fail | include PR number |
| Procurement | Submit quotation with evidence | procurement | Pass/Fail | include attachment behavior |
| Approval | COO approval | coo | Pass/Fail | include status transition |
| Reports | PR Summary PDF | admin | Pass/Fail | include filename/output note |

## 19. Exit Criteria

Consider manual QA complete when:

- all core role flows pass
- at least one online PR and one procurement PR reach final outcome
- one return/rework path is verified
- one rejection path is verified
- one PO flow is verified
- reports generate successfully
- no blank page, auth failure, or broken route remains
