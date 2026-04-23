# Workflow Implementation Plan

## Purpose

This document converts the current purchase request workflow review into an implementation plan that can be executed in small, low-risk steps.

Scope:
- Purchase request creation
- Procurement quotation
- Approval review
- Attachments and supporting documents
- Workflow status cleanup

Non-scope for this plan:
- Petty cash
- Reimbursements
- Cut-off calendar
- Email notifications
- Purchase order redesign beyond data handoff from PR

## Current Reality

The live system already works in broad strokes:
- Requester can create draft PRs/JRs
- Requester can submit
- Procurement can quote procurement-sourced items
- Approvers can approve/reject/return
- Timeline/history exists
- Item reference photos exist and are visible downstream

But the workflow model is inconsistent in several places:
- `submitted` is still modeled in many places even though submit usually jumps directly to `pending_quotation`, `level1_review`, or `level2_review`
- general PR attachments are requester-owned but are not part of the create form
- procurement quotation is only unit-price entry, not a full canvass workflow
- procurement cannot upload quotation documents even though seeded data suggests they should exist
- attachment rules differ between frontend and backend for `returned_for_info`
- PR-level attachments and line-item photos are conceptually different, but the UI does not explain that clearly

## Target Workflow Model

### Stage 1: Request Creation

Actor: Requester

Requester fills:
- request type
- project or office/general use
- priority
- needed-by date
- purpose/justification
- line items
- per-item sourcing type
- per-item specifications
- per-item notes
- per-item reference photo
- online seller references and justification where applicable
- PR-level supporting documents

Output:
- draft PR with complete requester-owned data

### Stage 2: Submission Routing

System decides route:
- if any procurement item exists: route to Procurement first
- if all items are online-sourced: route to approval immediately
- if requester is a department head: skip department-head approval level

Output:
- PR enters the next real work queue

### Stage 3: Procurement Quotation

Actor: Procurement

Procurement performs:
- review requester context
- review item specs, notes, online references, and item photos
- return for info if requester data is insufficient
- record quoted unit prices for procurement items
- record selected supplier per procurement item or per canvass set
- upload or link quotation/canvass evidence

Output:
- fully quoted PR with supporting quotation evidence

### Stage 4: Approval

Actor: Dept Head, COO, CEO

Approver performs:
- review PR details
- review pricing basis
- review requester documents and quotation evidence
- approve, reject, or return for revision

Output:
- PR is approved, rejected, or returned

## Attachment Ownership Model

This must be explicit before implementation continues.

### Item Reference Photo

Owner:
- requester

Used for:
- visual reference for one specific line item
- product/model/site visual context

UI placement:
- inside each line item in create/edit form

### PR Supporting Documents

Owner:
- requester

Examples:
- internal memo
- scope of work
- training brochure
- accreditation
- requester-supplied quotation/proposal
- technical spec sheet that applies to the whole request

UI placement:
- dedicated "Supporting Documents" section in create/edit form
- still editable later from detail page while PR is editable

### Procurement Quotation Evidence

Owner:
- procurement

Examples:
- supplier quotation PDFs
- canvass sheets
- comparison documents

UI placement:
- procurement quotation flow, not requester attachment area

Decision:
- do not overload requester-owned PR attachments to represent procurement-generated quotation evidence

## Required Decisions

These should be treated as project decisions, not optional implementation details.

1. Keep `submitted` as a visible user-facing status or remove it from the active state machine.
Recommendation:
- remove it from normal runtime transitions
- treat submit as an event, not a standing workflow state

2. Keep requester attachments and procurement quotation evidence separate or merge them.
Recommendation:
- keep them separate

3. Allow attachment edits in `returned_for_info`.
Recommendation:
- yes, frontend and backend should match

4. Require procurement to select suppliers during quotation.
Recommendation:
- yes, if `selectedSupplierId` remains in the schema it should be captured in UI

## Implementation Order

Execute in this order to minimize churn.

### Phase 1: Stabilize Existing Flow

Goal:
- remove contradictions without redesigning the whole module

Tasks:
- align frontend/backend attachment edit rules for `returned_for_info`
- audit all `submitted` references and classify them as:
  - keep
  - replace with actual next-stage statuses
  - remove
- document the real state transitions in code comments and docs
- ensure dashboards, queues, and timeline match real statuses

Acceptance criteria:
- no UI action is allowed that the backend rejects for status mismatch
- no queue relies on a status that normal submit flow never produces

### Phase 2: Move Requester Attachments Into Create/Edit Flow

Goal:
- make requester document upload part of actual request creation

Tasks:
- add "Supporting Documents" section to PR create/edit form
- support upload, remove, list, and preview there
- keep detail page attachment management for editable PRs
- clarify in UI copy:
  - item photo = per-item visual reference
  - supporting document = whole-request file

Acceptance criteria:
- requester can create a complete PR without leaving the form to upload documents
- attachment management works in `draft`, `returned`, and `returned_for_info`

### Phase 3: Define and Implement Procurement Evidence Model

Goal:
- turn quotation into a real procurement step

Tasks:
- decide whether quotation evidence is:
  - PR-level procurement attachments
  - canvass entries with attached files
  - both
- add procurement upload capability for quotation evidence
- add supplier selection UI
- record selected supplier along with quoted price
- expose quotation evidence to approvers

Acceptance criteria:
- procurement quotation is not just raw number entry
- approver can see the basis of quoted prices

### Phase 4: Simplify the Status Model

Goal:
- make the workflow legible and enforceable

Recommended runtime states:
- `draft`
- `pending_quotation`
- `quoted`
- `level1_review`
- `level2_review`
- `level3_review`
- `approved`
- `rejected`
- `returned`
- `returned_for_info`
- `cancelled`

Tasks:
- decide whether `quoted` remains separate from `level1_review`
- remove dead-path status checks
- update dashboard, queues, approval service, notifications, and timeline
- update docs and shared constants last, after code behavior is final

Acceptance criteria:
- each status has one clear owner and one clear next action
- no duplicate meaning between statuses

### Phase 5: UX Cleanup

Goal:
- make the workflow understandable to non-technical users

Tasks:
- rename sections for clarity
- add short help text in requester and procurement screens
- show stage-specific checklists where useful
- distinguish requester docs, procurement docs, and item photos visually

Acceptance criteria:
- users can tell what they are expected to upload at each stage without training

## Recommended Task Breakdown

Use this as the next implementation queue.

### Queue A: Low-Risk Fixes

1. Fix attachment remove rules for `returned_for_info`
2. Add explicit attachment purpose labels in UI
3. Add short helper copy for item photos vs supporting documents
4. Remove or replace dead `submitted` checks in obvious frontend screens

### Queue B: Requester Flow Improvements

1. Add supporting document upload UI to create/edit form
2. Reuse existing attachment endpoints
3. Preserve uploaded docs across draft save, edit, return, and resubmit
4. Add validation messaging for recommended/required documents

### Queue C: Procurement Flow Improvements

1. Add supplier selection during quotation
2. Add quotation evidence upload area
3. Add selected supplier display in PR detail and approval modal
4. Add procurement evidence section for approvers

### Queue D: Workflow State Cleanup

1. Finalize target state map
2. Update backend transitions
3. Update approval queue filters
4. Update dashboard counts
5. Update timeline labels and current-state messaging

## File-Level Starting Points

Likely files to touch first:

Backend:
- `apps/api/src/modules/purchase-requests/purchase-requests.service.ts`
- `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`
- `apps/api/src/modules/approvals/approvals.service.ts`
- `packages/shared/src/constants/pr-status.ts`
- `packages/shared/src/types/purchase-request.types.ts`

Frontend:
- `apps/web/src/features/purchase-requests/pr-form-page.tsx`
- `apps/web/src/features/purchase-requests/pr-detail-page.tsx`
- `apps/web/src/features/procurement/procurement-queue-page.tsx`
- `apps/web/src/features/approvals/pr-approval-modal.tsx`
- `apps/web/src/components/purchase-request-workflow-timeline.tsx`
- `apps/web/src/lib/api-services.ts`

## Testing Checklist Per Phase

Minimum checks after each phase:

1. Requester flow
- create draft
- add/remove item photo
- add/remove PR supporting document
- submit
- recall
- edit after return
- resubmit

2. Procurement flow
- open pending quotation queue
- return for info with note
- quote all procurement items
- verify totals update
- verify quotation evidence visibility

3. Approval flow
- dept head approve/return/reject
- COO approve/return/reject
- CEO approve/return/reject
- verify timeline and comments

4. Build checks
- `npm run build --workspace=packages/shared`
- `npm run build --workspace=apps/api`
- `npm run build --workspace=apps/web`

## Suggested Milestone Sequence

Milestone 1:
- status cleanup audit
- returned-for-info attachment rule fix

Milestone 2:
- requester supporting documents in create/edit flow

Milestone 3:
- procurement supplier selection and quotation evidence

Milestone 4:
- status model simplification across UI/API

Milestone 5:
- docs cleanup and regression pass

## Success Criteria

This plan is complete when:
- requester can fully prepare a PR in one coherent creation flow
- procurement can quote with evidence, not only with numbers
- approvers can review both request context and quotation basis
- each upload type has a clear owner and screen location
- status transitions are understandable and enforced consistently
