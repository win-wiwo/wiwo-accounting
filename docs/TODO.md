# PRAMS — Remaining Work

**Last Updated:** 2026-04-19

## Completed

### Original PRAMS (Epics 01–10) — DONE
- 58/60 user stories implemented (~97%)
- See `docs/IMPLEMENTATION_STATUS.md` for details

### Phase 2A: Procurement Extension — DONE
- [x] ACCOUNTING and PROCUREMENT roles added to `packages/shared/src/constants/roles.ts`
- [x] Job Request support — `requestType` field in PR schema, JR numbering prefix
- [x] JR form toggle in PR form page, JR filter in PR list page
- [x] Shared types updated (`PurchaseRequest` type has `requestType`, `projectName`)
- [x] Supplier Management backend — full CRUD (`apps/api/src/modules/suppliers/`)
- [x] Supplier Management frontend — list, form, detail (`apps/web/src/features/suppliers/`)
- [x] Purchase Orders backend — full lifecycle, 6 endpoints (`apps/api/src/modules/purchase-orders/`)
- [x] Purchase Orders frontend — list, form, detail (`apps/web/src/features/purchase-orders/`)
- [x] API services and React Query hooks for both modules
- [x] Sidebar navigation and App.tsx routing for both modules
- [x] Both apps build clean (tsc + vite)

---

## Phase 2B: Petty Cash System (NOT STARTED)

Reference: `docs/ACCOUNTING_PROCESS.md`, Annexes C–G

### Backend

- [ ] Add `petty_cash_custodian` role to `packages/shared/src/constants/roles.ts` with label and hierarchy
- [ ] Create `packages/shared/src/constants/expense-categories.ts` with codes:
  - 5050 Water, 5060 Transportation, 5070 Office Supplies, 5071 Fuel/Oil/Lubricants, 5083 Notarial Fees, 5102 Representation
- [ ] **PCPR module** (Annex C) — Petty Cash Purchase Request
  - Schema: `apps/api/src/modules/petty-cash/schemas/pcpr.schema.ts`
  - Fields: pcprNumber, requesterId, departmentId, items[], totalAmount (max PHP 2,000), purpose, status (draft/submitted/approved/disbursed/completed), approvals
  - Service, Controller, DTOs (create, update, query)
  - Numbering: PCPR-YYYY-NNNNN
  - Business rule: max PHP 2,000 per transaction
- [ ] **PCV module** (Annex D) — Petty Cash Voucher
  - Schema: `apps/api/src/modules/petty-cash/schemas/pcv.schema.ts`
  - Fields: pcvNumber, pcprId (ref), payee, particulars, amount, expenseCategory, receiptType, receiptNumber, receiptDate, status
  - Linked to PCPR — created after PCPR approval
  - Numbering: PCV-YYYY-NNNNN
- [ ] **CERR module** (Annex E) — Certificate of Expenses Not Requiring Receipts
  - Schema: `apps/api/src/modules/petty-cash/schemas/cerr.schema.ts`
  - Fields: cerrNumber, pcvId (ref), description, amount, certifiedBy, approvedBy, reason
  - Used when official receipt is not available
  - Numbering: CERR-YYYY-NNNNN
- [ ] **PC Register module** (Annex F) — Petty Cash Register
  - Schema: `apps/api/src/modules/petty-cash/schemas/pc-register.schema.ts`
  - Fields: custodianId, departmentId, entries[] (date, description, reference, debit, credit, balance), fundAmount, currentBalance
  - Tracks all petty cash transactions per department custodian
  - Auto-populated from PCV disbursements
- [ ] **PC Liquidation module** (Annex G) — Petty Cash Liquidation Report
  - Schema: `apps/api/src/modules/petty-cash/schemas/pc-liquidation.schema.ts`
  - Fields: pclrNumber, custodianId, departmentId, period (from/to), entries[] (pcvNumber, date, payee, amount, category), totalDisbursed, fundAmount, remainingCash, status
  - Monthly liquidation for fund replenishment
  - Numbering: PCLR-YYYY-NNNNN
- [ ] Register all petty cash modules in `apps/api/src/app.module.ts`

### Frontend

- [ ] `apps/web/src/features/petty-cash/pcpr-list-page.tsx` — List with search, status filter, pagination
- [ ] `apps/web/src/features/petty-cash/pcpr-form-page.tsx` — Create/edit with PHP 2,000 max validation
- [ ] `apps/web/src/features/petty-cash/pcpr-detail-page.tsx` — Detail with approval actions
- [ ] `apps/web/src/features/petty-cash/pcv-list-page.tsx` — Voucher list
- [ ] `apps/web/src/features/petty-cash/pcv-form-page.tsx` — Voucher form with expense category select
- [ ] `apps/web/src/features/petty-cash/pcv-detail-page.tsx` — Voucher detail
- [ ] `apps/web/src/features/petty-cash/pc-register-page.tsx` — Register view per custodian/department
- [ ] `apps/web/src/features/petty-cash/pc-liquidation-page.tsx` — Liquidation report form and view
- [ ] API services in `apps/web/src/lib/api-services.ts` for petty cash endpoints
- [ ] React Query hooks in `apps/web/src/hooks/use-petty-cash.ts`
- [ ] Sidebar nav entry for "Petty Cash" (visible to: petty_cash_custodian, accounting, admin)
- [ ] Routes in `apps/web/src/App.tsx`

---

## Phase 2C: Reimbursements (NOT STARTED)

Reference: `docs/ACCOUNTING_PROCESS.md`, Annex H

### Backend

- [ ] **RRF module** (Annex H) — Reimbursement Request Form
  - Schema: `apps/api/src/modules/reimbursements/schemas/reimbursement.schema.ts`
  - Fields: rrfNumber, requesterId, departmentId, purpose, items[] (date, description, amount, receiptAttached), totalAmount, preApprovalReference, supportingDocs[] (CERR refs, receipts), status (draft/submitted/approved/processed/paid), approvals
  - Business rule: must be pre-approved by Head of Office before spending
  - Numbering: RRF-YYYY-NNNNN
- [ ] Service, Controller, DTOs (create, update, query)
- [ ] Register module in `apps/api/src/app.module.ts`

### Frontend

- [ ] `apps/web/src/features/reimbursements/` — list, form, detail pages
- [ ] API services and hooks
- [ ] Sidebar nav entry and routes

---

## Phase 2D: Disbursement Cut-off Calendar (NOT STARTED)

Reference: WIWO MEMORANDUM 2026-002

### Backend

- [ ] Calendar config schema — monthly cut-off dates, processing windows
- [ ] Service to check if a document submission falls within or outside the cut-off
- [ ] Enforcement: documents received after cut-off → queued for 1st week of next month

### Frontend

- [ ] Admin-configurable calendar view in Settings
- [ ] Visual indicator on document submission if near/past cut-off

---

## Documentation & Cleanup

- [ ] Update `docs/IMPLEMENTATION_STATUS.md` — add Phase 2A completion (Suppliers, POs, JR support)
- [ ] Update `CLAUDE.md` Key Modules table — add Suppliers, Purchase Orders, and new roles
- [ ] Create `README.md` — project overview, setup instructions, tech stack
- [ ] Add seed data for suppliers and purchase orders in `apps/api/src/database/seed-full.ts`

---

## Nice-to-Have (Not Blocking)

- [ ] Tests for Supplier and Purchase Order modules (backend Jest, frontend Vitest)
- [ ] Dashboard updates — PO stats cards, supplier count
- [ ] Reports — PO spending report, supplier activity report
- [ ] Canvass comparison UI improvements (side-by-side quote comparison in PO form)
- [ ] Supplier document uploads (BIR Form 2303/COR, bank proof)
- [ ] Email notifications (currently in-app only)

---

## Key Business Rules (from WIWO MEMOs)

1. POS Receipts are NOT accepted — only BIR Registered Sales/Service Invoices
2. Minimum 3 canvasses required for Purchase Requests and Job Requests
3. Petty Cash max PHP 2,000 per transaction
4. Incomplete documents are returned to the requesting department
5. Documents received after cut-off are processed in the 1st week of the next month
6. Reimbursements must be pre-approved by Head of Office before spending
7. New suppliers require: BIR Form 2303/COR, complete company details, bank proof
8. Department Head certifies items are "essential and necessary to daily operations"
9. Petty Cash Custodian is per-department — manages their department's fund only
