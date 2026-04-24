# PRAMS UI/UX and Business Flow Audit Notes

## Core Conclusion

This application is difficult to use mainly because the product shape has drifted.

It no longer behaves like a simple purchase request app. It now combines multiple workflows into one system:
- employee request filing
- procurement canvassing
- executive approvals
- admin/master-data management

The UI does not separate those roles clearly. Instead, it exposes the module structure directly and makes users translate their job into the system's internal model.

## Major Problems Identified

### 1. Product and workflow drift

The PRD describes a simpler flow:
- employee submits
- department head reviews
- COO reviews
- CEO approves

The implementation now includes extra workflow states and procurement-specific logic:
- `pending_quotation`
- `quoted`
- `returned_for_info`
- canvass entries
- seller references
- quotation evidence
- winning supplier selection

This may reflect real business evolution, but the information architecture did not adapt.

### 2. PR form is too complex for requestors

The request form currently mixes:
- request metadata
- project selection
- office/general-use exception
- priority
- item-level sourcing logic
- seller references
- justification rules
- reference photos
- attachment staging

This is too much for a basic internal request flow. It feels like an operations worksheet, not a guided filing experience.

### 3. Redundant and inconsistent field design

Problems observed:
- `title` is required in the UI, but the backend can auto-generate it from line items.
- The PRD talks about `project name`, but the system uses `projectId`.
- The schema still contains a text index referencing `projectName`, which does not exist on `PurchaseRequest`.

These inconsistencies create friction and make the product feel unreliable.

### 4. Navigation is module-first, not task-first

The sidebar reflects internal modules:
- Dashboard
- Purchase Requests
- Procurement Queue
- Suppliers
- Purchase Orders
- Search
- Approvals
- Reports
- Administration

This is poor UX for role-based work. Users think in tasks, not modules.

Examples:
- Requestor: "file a request", "revise returned request"
- Approver: "review what needs my decision"
- Procurement: "source items and compare suppliers"

### 5. Dashboard is not truly role-based

The dashboard is mostly the same across roles, with only minor conditional changes.

But the PRD expects role-specific dashboards for:
- employee/requestor
- department head
- COO
- CEO
- finance
- admin

The implementation is too generic and does not support each role's actual decision-making needs.

### 6. Approval UX is weak for executives

The approval queue is a basic table that opens a modal.

For COO/CEO users, this is inadequate because they need:
- fast context
- prioritization
- amount/risk visibility
- clear rationale
- fewer clicks

The current flow is mechanically functional but not decision-friendly.

### 7. Procurement flow is enterprise-complex but surfaced poorly

Procurement work includes:
- canvass rows
- supplier uniqueness checks
- quoted prices per item
- evidence upload
- justification when fewer than 3 suppliers are quoted

That is legitimate complexity, but it is placed inside a modal-heavy admin surface instead of a dedicated workspace.

### 8. Search/monitoring is compensating for weak primary flows

The search page is a full power-user console with:
- URL-driven filters
- local filter state
- advanced filtering
- sorting
- export
- pagination

This suggests the primary workflows are not discoverable enough, so users need a secondary control panel to find what they need.

### 9. Visual design is generic and low-signal

Current UI characteristics:
- standard admin-template structure
- white background
- neutral cards
- Inter/system styling
- low emotional and informational contrast

The product does not visually communicate:
- workflow stage
- urgency
- procurement rigor
- approval responsibility
- financial sensitivity

### 10. Access and visibility rules feel implicit

Some authorization and visibility logic is technically enforced, but the overall model is not clearly reflected in the UI.

Result:
- users may see routes/modules that do not match their mental model
- business permissions are not clearly explained through the interface
- the product feels inconsistent rather than intentionally role-shaped

## Bottom Line

This is not mainly a frontend polish problem.

It is a product structure problem:
- too many workflows combined into one shell
- too much role complexity exposed directly
- too little separation between requestor, approver, procurement, and admin experiences

Any redesign should begin with workflow separation, not cosmetic refresh.

## Recommended Direction

Do not start with visual cleanup alone.

Start by restructuring the app into explicit role workspaces:

### Requestor workspace
- file request
- track status
- revise returned request

### Approver workspace
- review pending requests
- understand context quickly
- approve/reject/return with minimal friction

### Procurement workspace
- source procurement items
- compare suppliers
- upload evidence
- select winning supplier
- return for more info when needed

### Admin/Finance workspace
- manage users, departments, projects, suppliers
- monitor requests
- export and report
- audit history and numbering

## Next Recommended Audit Steps

1. Map end-to-end journeys by role.
2. Audit every field in the PR form:
   - why it exists
   - who owns it
   - when it appears
   - whether it belongs in requestor, procurement, or approval stages
3. Propose a new information architecture before any UI redesign.
4. Define a simplified status language for end users, even if backend states remain more detailed.
5. Design dedicated workspaces instead of a shared admin-style shell.

## Reference Areas Reviewed

- Frontend routes and app shell
- Sidebar/navigation structure
- Dashboard
- Purchase request list, form, and detail flows
- Approval queue
- Procurement queue
- Search/monitoring
- Shared PR types and statuses
- Purchase request backend service
- Approvals backend service
- PRD expectations and personas
