# WIWO Accounting Process & Documentary Requirements

**Source:** ACCTG-MEMO2026-001 & ACCTG-MEMO2026-002 (March 3, 2026)
**Company:** Wilson Works Trading Inc.
**Last Updated:** 2026-04-19

---

## Table of Contents

1. [Overview](#overview)
2. [Roles & Responsibilities](#roles--responsibilities)
3. [Process 1: Procurement of Goods and Services](#process-1-procurement-of-goods-and-services)
4. [Process 2: Petty Cash Fund Management](#process-2-petty-cash-fund-management)
5. [Process 3: Reimbursements](#process-3-reimbursements)
6. [Process 4: Disbursement Cut-off Schedule](#process-4-disbursement-cut-off-schedule)
7. [Process 5: Supplies & Materials Request](#process-5-supplies--materials-request)
8. [Current PRAMS Coverage Gap Analysis](#current-prams-coverage-gap-analysis)
9. [Implementation Roadmap](#implementation-roadmap)
10. [New Modules Required](#new-modules-required)
11. [Schema Design Notes](#schema-design-notes)

---

## Overview

The accounting department issued Memorandum 2026-001 defining **three major process areas** and their documentary requirements. The current PRAMS application only covers **Purchase Requests (Annex A)** partially. This document maps the complete accounting process to guide full system integration.

### Process Areas

| # | Process Area | Forms (Annexes) | Current Coverage |
|---|-------------|-----------------|-----------------|
| 1 | Procurement of Goods & Services | A, B, + Purchase Order | Partial (Annex A only) |
| 2 | Petty Cash Fund Management | C, D, E, F, G | Not implemented |
| 3 | Reimbursements | H | Not implemented |
| 4 | Disbursement Cut-off Schedule | (Calendar/Config) | Not implemented |
| 5 | Supplies & Materials Request | (Separate form) | Not implemented |

---

## Roles & Responsibilities

| Role | Description | System Role Mapping |
|------|-------------|---------------------|
| **Office Personnel** | Any employee requesting purchases, services, or reimbursements | `staff` |
| **Department Head** | Certifies items are essential to operations, first-level approver | `dept_head` |
| **Petty Cash Custodian** | Manages petty cash fund per department, prepares PCV and registers | New role: `petty_cash_custodian` (or permission flag on existing user) |
| **Procurement Officer** | Prepares Purchase Orders after PR/JR approval, manages supplier canvass | New role: `procurement_officer` |
| **Bookkeeper** | Checks petty cash liquidation reports | New role or `accounting` sub-role |
| **Accounting Officer** | Nicole Ann P. Roaring — approves CERR, verifies reimbursements, certifies liquidation | `accounting` |
| **Chief, Operations Officer (COO)** | Patrick Ryan L. Po — second-level approver for PR/JR/RRF | `coo` |
| **President/CEO** | Cesar Manuel S. Lorenzo — final approver for PR/JR/RRF, certifies items essential | `ceo` |
| **Head of the Office** | Approves Purchase Orders, pre-approves reimbursement expenses | `ceo` or `coo` |

---

## Process 1: Procurement of Goods and Services

### 1a. Purchase Request Form (Annex A) — For Goods

**Purpose:** Request purchase of goods essential to daily operations.

**Workflow (Approve First, Procure After):**
```
Office Personnel (Preparer)
    ↓ fills form and submits
Department Head (Level 1 — certifies need)
    ↓ approves
COO - Patrick Ryan L. Po (Level 2 — approves need)
    ↓ approves
CEO - Cesar Manuel S. Lorenzo (Level 3 — final need-approval)
    ↓ approves
    ├─ (no procurement items) → APPROVED → Accounting receives
    └─ (has procurement items) → Pending Procurement
         ↓
Procurement Officer (Sources suppliers, gathers 3+ quotes)
    ↓ submits canvass & quotation
COO - Patrick Ryan L. Po (Price Review — validates supplier & pricing)
    ↓ approves pricing
APPROVED → Accounting Department (Receives approved form)
    ↓
Procurement Officer (Creates Purchase Order)
```

> **Design rationale:** Management approves the *need* before procurement spends time sourcing. This prevents wasted canvassing effort on requests that may be rejected. The COO reviews pricing separately to ensure spend matches what was approved.

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | date | Yes | Auto-populated |
| PR No. | string | Yes | Auto-generated (existing system) |
| Requestor | string | Yes | Auto-populated from logged-in user |
| Department | string | Yes | Auto-populated from user's department |
| Project Name | string | Yes | User input |
| Purpose | text | Yes | Detailed description |
| Line Items | array | Yes (min 1) | |
| → Item Description | string | Yes | With complete technical specifications |
| → Qty | number | Yes | |
| → Estimated Cost | currency | Yes | |
| → Total | currency | Yes | Auto-calculated (Qty × Est. Cost) |
| Grand Total | currency | Yes | Auto-calculated sum of all items |
| Prepared by (Requestor) | signature | Yes | Name + Designation + Date |
| Certified by (Dept Head) | signature | Yes | "I certify items are essential to operations" + Name + Designation + Date |
| Approved by (COO) | signature | Yes | Patrick Ryan L. Po, COO + Date |
| Certified by (President) | signature | Yes | Cesar Manuel S. Lorenzo, President + Date |

**Required Attachments:**
1. Requestor's Complete Name and Designation
2. Detailed Project Name, Purpose, and Item Description with technical specifications
3. At least **Three (3) Canvasses** to support Estimated Costs
4. Picture/Screenshot of the Item being requested
5. Must be duly Approved and Signed by Department Head

**Rejection Criteria:** Incomplete documentary attachments and signatures → returned to department.

**Current PRAMS Status:** ✅ Mostly implemented. Workflow redesigned Apr 2026 ("Approve First, Procure After"). Remaining alignment:
- [x] Approval chain completed before procurement (v2 workflow)
- [x] COO price sign-off on supplier selection
- [x] Project field implemented
- [x] Item photo/screenshot attachment category
- [ ] Add "Certified by" (Dept Head) signature block distinct from approval
- [ ] Enforce minimum 3 canvass attachments (currently validated but with justification override)
- [ ] PDF export should match exact Annex A layout

---

### 1b. Job Request Form (Annex B) — For Services

**Purpose:** Request purchase of services essential to daily operations.

**Workflow:** Same as Purchase Request (1a).

**Form Fields:** Identical to Annex A except:
| Field | Difference from Annex A |
|-------|------------------------|
| Title | "JOB REQUEST" instead of "PURCHASE REQUEST" |
| JR No. | Uses JR numbering series (not PR) |
| Item Description | Describes service scope instead of goods |

**Required Attachments:**
1. Requestor's Complete Name and Designation
2. Detailed Project Name, Purpose, and Item Description with technical specifications
3. At least **Three (3) Canvasses** to support Estimated Costs
4. **Service Inspection Report** (instead of item pictures)
5. Must be duly Approved and Signed by Department Head

**Current PRAMS Status:** ❌ Not implemented. Nearly identical to PR — can share most code.

**Implementation Notes:**
- Add `requestType` field to purchase-requests: `'goods' | 'services'`
- OR create separate `job-requests` module (cleaner separation)
- Separate JR numbering sequence (JR-YYYY-NNNNN)
- Add "Service Inspection Report" as attachment category

---

### 1c. Purchase Order (Odoo Generated) — For Goods and Services

**Purpose:** Procurement Officer creates PO after receiving approved PR/JR from Accounting Department.

**Workflow:**
```
Accounting Department receives approved PR/JR
    ↓
Procurement Officer prepares PO
    ↓ includes canvass from 3 suppliers
Head of Office approves PO
    ↓
Approved PO submitted to Accounting Department
    ↓
Disbursement / Check preparation
```

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| PO Number | string | Yes | Auto-generated |
| Reference PR/JR Number | string | Yes | Links back to approved PR/JR |
| Project Name | string | Yes | For monitoring purposes |
| Supplier Details | object | Yes | See below |
| Line Items | array | Yes | Inherited from PR/JR, may differ after canvass |
| Canvass Schedule | array | Yes | Minimum 3 suppliers for new suppliers |

**Supplier Details Required:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Complete Company Name | string | Yes | |
| Address | string | Yes | |
| VAT or NON-VAT Registration | enum | Yes | `'vat' \| 'non_vat'` |
| TIN (Tax ID Number) | string | Yes | |
| Payment Terms | string | Yes | |
| Bank Account Name | string | Yes | |
| Bank Account Number | string | Yes | |

**Required Attachments:**
1. Approved Purchase/Job Request Form and all its attachments
2. Purchase/Job Request Number as reference
3. Canvass Schedule with costing from at least 3 Suppliers (for new suppliers)
4. BIR Form 2303/BIR COR (for new suppliers)
5. Supplier's Proof of Account (Passbook)

**Current PRAMS Status:** ❌ Not implemented. This is a **new module** post-approval.

**Implementation Notes:**
- New `purchase-orders` module
- New `suppliers` module (supplier master data)
- Links to approved PR/JR via reference
- Canvass comparison view (side-by-side supplier quotes)
- New workflow: `DRAFT → SUBMITTED → APPROVED → ISSUED`

---

## Process 2: Petty Cash Fund Management

### Overview

Petty cash is for small purchases **not exceeding PHP 2,000**. Each department has a **Petty Cash Custodian** who manages the fund. The process has two phases:

1. **Utilization** — Requesting and spending petty cash (Annexes C, D, E)
2. **Liquidation & Replenishment** — Accounting for spent funds and requesting replenishment (Annexes F, G)

### 2a. Petty Cash Purchase Request (Annex C) — Utilization

**Purpose:** Employee requests purchase of goods from petty cash fund (≤ PHP 2,000).

**Workflow:**
```
Office Personnel (Requestor)
    ↓ fills form
Petty Cash Custodian (Approver)
    ↓ approves and releases cash
Office Personnel (makes purchase)
    ↓ returns with receipts
Petty Cash Voucher (Annex D) created
```

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | date | Yes | |
| PCPR No. | string | Yes | Auto-generated |
| Requestor | string | Yes | Auto-populated |
| Designation | string | Yes | Auto-populated |
| Purpose | text | Yes | |
| Line Items | array | Yes | |
| → Item Description | string | Yes | |
| → Qty | number | Yes | |
| → Estimated Cost | currency | Yes | |
| → Total | currency | Yes | Auto-calculated |
| Grand Total | currency | Yes | Must be ≤ PHP 2,000 |
| Prepared by (Requestor) | signature | Yes | Name + Designation + Date |
| Approved by (Petty Cash Custodian) | signature | Yes | Name + Designation + Date |

**Validation Rules:**
- Grand Total must not exceed PHP 2,000
- Only Petty Cash Custodian approves (not Department Head)

**Current PRAMS Status:** ❌ Not implemented.

---

### 2b. Petty Cash Voucher (Annex D) — Cash Release

**Purpose:** Documents the actual release of petty cash and tracks the transaction breakdown.

**Workflow:**
```
Petty Cash Custodian prepares PCV
    ↓ after PCPR is approved
Requestor signs as recipient
    ↓ purchases items
Requestor returns with:
    - Sales/Service Invoice (BIR Registered, NOT POS receipts)
    - CERR (Annex E) for no-receipt expenses
    - Picture of purchased items
    ↓
PCV is completed with actual amounts
```

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | date | Yes | |
| PCV No. | string | Yes | Auto-generated |
| Payee | string | Yes | Requestor's name |
| Position | string | Yes | Requestor's designation |
| PCPR No. | string | Yes | Links to approved PCPR |
| Particulars | text | Yes | Detailed description and purpose |
| Amount (line items) | currency[] | Yes | Individual expense amounts |
| **Breakdown of Transaction** | | | |
| → Amount Granted | currency | Yes | From approved PCPR |
| → Total Amount Paid | currency | Yes | Actual spend |
| → Amount Refunded | currency | Auto | Granted - Paid (if positive) |
| → Official Receipt No. | string | Conditional | If supplier provided OR |
| → Invoice No. | string | Conditional | If supplier provided invoice |
| Total | currency | Yes | Sum of all line items |
| Requested by (Requestor) | signature | Yes | Name + Date |
| Received Refund | checkbox | Conditional | If there's a refund |
| Reimbursement Paid | checkbox | Conditional | If requestor overspent |
| Paid by (Petty Cash Custodian) | signature | Yes | Name + Date |

**Required Attachments:**
1. Approved Petty Cash Purchase Request Form (PCPR) and all its attachments
2. Sales/Service Invoice (BIR Registered — POS receipts NOT accepted)
3. Certificate of Expenses Not Requiring Receipts (Annex E) — for tricycle fare, xerox, small store purchases
4. Picture of purchased items

**Current PRAMS Status:** ❌ Not implemented.

---

### 2c. Certificate of Expenses Not Requiring Receipts — CERR (Annex E)

**Purpose:** Certifies small expenses where official receipts cannot be obtained (tricycle fare, photocopying, small store-bought supplies).

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Employee Name | string | Yes | Auto-populated |
| Date | date | Yes | |
| Designation | string | Yes | Auto-populated |
| CERR No. | string | Yes | Auto-generated |
| Line Items | array | Yes | |
| → Particulars | string | Yes | Description of expense |
| → Amount | currency | Yes | |
| Total | currency | Yes | Sum of all items |
| Prepared by (Employee) | signature | Yes | Name + Date |
| Approved by (Accounting Officer) | signature | Yes | Nicole Ann P. Roaring + Date |

**Current PRAMS Status:** ❌ Not implemented.

---

### 2d. Petty Cash Register (Annex F) — Fund Ledger

**Purpose:** Running ledger maintained by the Petty Cash Custodian to track the petty cash fund balance and categorize expenses.

**This is NOT a transactional form** — it is a **continuous register/ledger** that records all petty cash movements.

**Register Columns:**
| Column | Type | Notes |
|--------|------|-------|
| Date | date | Transaction date |
| PCV# | string | Reference to Petty Cash Voucher |
| PCPR# | string | Reference to Petty Cash Purchase Request |
| Payee | string | Who received the cash |
| Particulars | text | Description |
| **Petty Cash Fund (1011)** | | Account code 1011 |
| → Receipts (+) | currency | Cash added to fund |
| → Payments (-) | currency | Cash disbursed from fund |
| → Balance | currency | Running balance |
| **Breakdown of Expenses** | | Expense categorization |
| → Office Supplies (5070) | currency | |
| → Representation (5102) | currency | |
| → Transportation (5060) | currency | |
| → Fuel, Oil and Lubricants (5071) | currency | |
| → Notarial Fees (5083) | currency | |
| → Water (5050) | currency | |

**Expense Account Codes:**
| Code | Category |
|------|----------|
| 1011 | Petty Cash Fund |
| 5050 | Water |
| 5060 | Transportation |
| 5070 | Office Supplies |
| 5071 | Fuel, Oil and Lubricants |
| 5083 | Notarial Fees |
| 5102 | Representation |

**Implementation Notes:**
- Auto-populated from completed PCVs
- Per department, per Petty Cash Custodian
- Beginning balance set at start of period
- Running balance auto-calculated
- Printable as Excel report matching Annex F layout

**Current PRAMS Status:** ❌ Not implemented.

---

### 2e. Petty Cash Liquidation Report (Annex G) — Period Liquidation

**Purpose:** Summarizes all petty cash expenses for a period, submitted to Accounting Department for replenishment of the fund.

**Workflow:**
```
Petty Cash Custodian prepares PCLR
    ↓ attaches all PCVs for the period
Bookkeeper checks
    ↓ verifies amounts
Accounting Officer certifies
    ↓
Fund replenishment is processed
```

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Petty Cash Custodian | string | Yes | Auto-populated |
| Department | string | Yes | Auto-populated |
| PCLR # | string | Yes | Auto-generated |
| Period | string | Yes | e.g., "March 1-31, 2026" |
| Line Items (from PCVs) | array | Yes | |
| → Date | date | Yes | |
| → PCV# | string | Yes | Reference |
| → Particulars | text | Yes | |
| → Amount | currency | Yes | |
| → Office Supplies (5070) | currency | | Expense breakdown |
| → Representation (5102) | currency | | |
| → Transportation (5060) | currency | | |
| → Fuel, Oil and Lubricants (5071) | currency | | |
| → Notarial Fees (5083) | currency | | |
| → Water (5050) | currency | | |
| → TOTAL | currency | Yes | Row total |
| Grand Total | currency | Yes | Sum of all rows |
| Prepared by (Petty Cash Custodian) | signature | Yes | |
| Checked by (Bookkeeper) | signature | Yes | |
| Certified Correct (Accounting Officer) | signature | Yes | |

**Required Attachments:**
- Petty Cash Register Form and its attachments
- All PCV forms for the period
- PCV Number References, Particulars and Amounts
- Petty Cash Custodian's Name and Department

**Current PRAMS Status:** ❌ Not implemented.

---

## Process 3: Reimbursements

### 3a. Reimbursement Request Form (Annex H)

**Purpose:** Employee requests reimbursement for expenses that were **urgently needed and pre-approved by the Head of Office** prior to spending.

**Important:** Reimbursements are ONLY for expenses that were **approved before spending occurred**. This is not for retroactive expense claims.

**Workflow:**
```
Office Personnel (Preparer)
    ↓ fills form with receipts
Accounting Officer — Nicole Ann P. Roaring (Verifier)
    ↓ verifies documentation
COO — Patrick Ryan L. Po (Approver)
    ↓ approves
President — Cesar Manuel S. Lorenzo (Final Approver)
    ↓ certifies
Disbursement is processed
```

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Requestor | string | Yes | Auto-populated |
| Department | string | Yes | Auto-populated |
| Date | date | Yes | |
| Line Items | array | Yes | |
| → Period Covered | string | Yes | Date range of expense |
| → Particulars | text | Yes | Detailed description and purpose |
| → Amount | currency | Yes | |
| Total | currency | Yes | Sum of all items |
| Attachments list | text | Yes | List of supporting documents |
| Prepared by (Requestor) | signature | Yes | Name + Position + Date |
| Verified by (Accounting Officer) | signature | Yes | Nicole Ann P. Roaring + Date |
| Approved by (COO) | signature | Yes | Patrick Ryan L. Po + Date |
| Approved by (President) | signature | Yes | Cesar Manuel S. Lorenzo + Date |

**Required Attachments:**
1. Sales/Service Invoice (BIR Registered — POS receipts NOT accepted)
2. Certificate of Expenses Not Requiring Receipts (Annex E) — for small expenses
3. Period Covered, Particulars, and Amount details
4. Requestor's Name and Department

**Current PRAMS Status:** ❌ Not implemented.

---

## Process 4: Disbursement Cut-off Schedule

**Source:** ACCTG-MEMO2026-002

Monthly schedule that controls when documents must be submitted, when checks are released, and when bank deposits occur.

### 2026 Monthly Cut-off Schedule

| Month | Document Receiving Deadline | Check Release | Bank Deposit |
|-------|---------------------------|---------------|--------------|
| March | 20 (Fri) — 12:00 NN | 25 (Wed) | 26 (Thu) |
| April | 20 (Mon) — 12:00 NN | 23 (Thu) | 24 (Fri) |
| May | 18 (Mon) — 12:00 NN | 21 (Thu) | 22 (Fri) |
| June | 19 (Fri) — 12:00 NN | 24 (Wed) | 25 (Thu) |
| July | 20 (Mon) — 12:00 NN | 23 (Thu) | 24 (Fri) |
| August | 20 (Thu) — 12:00 NN | 25 (Tue) | 26 (Wed) |
| September | 18 (Fri) — 12:00 NN | 23 (Wed) | 24 (Thu) |
| October | 19 (Mon) — 12:00 NN | 22 (Thu) | 23 (Fri) |
| November | 19 (Thu) — 12:00 NN | 24 (Tue) | 25 (Wed) |
| December | 18 (Fri) — 12:00 NN | 23 (Wed) | 24 (Thu) |

**Rules:**
- Documents received **after** the cut-off are processed in the **1st week of the following month**
- Schedule **may vary** depending on urgency of transaction
- Must be strictly observed effective March 3, 2026

**Implementation Notes:**
- Admin-configurable annual schedule
- Dashboard warning when approaching cut-off dates
- Visual indicator on PR/JR/RRF forms showing submission deadline
- Post-cut-off submissions auto-flagged for next month processing

---

## Process 5: Supplies & Materials Request

**Separate from procurement process** — internal supply room/inventory request.

This form is for requesting supplies and materials that are already in stock (office supplies, etc.) — NOT for purchasing new items.

**Implementation Notes:**
- Could be a simple form module if inventory tracking is desired
- Lower priority — assess if this is digital or stays paper-based

---

## Current PRAMS Coverage Gap Analysis

### What EXISTS (Phase 1 — Complete)

| Feature | Annex | Status | Notes |
|---------|-------|--------|-------|
| Purchase Request Filing | A (partial) | ✅ Done | Missing: Project Name field, canvass enforcement, exact form layout |
| Multi-level Approval | A | ✅ Done | Dept Head → COO → CEO |
| PR Numbering | A | ✅ Done | Auto-increment with configurable format |
| Notifications | — | ✅ Done | In-app via EventEmitter2 |
| Reports | — | ✅ Done | PR Summary, Dept Spending, Turnaround |
| Dashboard | — | ✅ Done | Role-based dashboards |
| User/Dept Management | — | ✅ Done | Full CRUD with RBAC |
| Search & Monitoring | — | ✅ Done | Advanced search, quick search |
| Audit Trail | — | ✅ Done | Immutable audit log |

### What NEEDS to be BUILT (Phase 2+)

| Module | Annexes | Priority | Complexity | Dependencies |
|--------|---------|----------|------------|--------------|
| **Job Requests** | B | High | Medium | Extends existing PR module |
| **Purchase Orders** | — | High | High | New module, requires Supplier master |
| **Supplier Management** | — | High | Medium | Required for PO |
| **Petty Cash Requests** | C | Medium | Medium | New module |
| **Petty Cash Vouchers** | D | Medium | High | Depends on PCPR |
| **CERR** | E | Medium | Low | Simple form |
| **Petty Cash Register** | F | Medium | High | Auto-populated ledger from PCVs |
| **Petty Cash Liquidation** | G | Medium | Medium | Aggregates PCVs for a period |
| **Reimbursement Requests** | H | Medium | Medium | New module, similar to PR workflow |
| **Disbursement Calendar** | — | Low | Low | Admin config + dashboard widget |
| **New Roles** | — | High | Low | petty_cash_custodian, procurement_officer |

---

## Implementation Roadmap

### Phase 2A: Procurement Extension (Priority: HIGH)

**Goal:** Complete the procurement cycle from request → order.

1. **Align existing PR with Annex A**
   - Add `projectName` field to PR schema
   - Add attachment categories: `canvass`, `item_photo`, `technical_spec`
   - Enforce minimum 3 canvass attachments on submission
   - Update PDF export to match Annex A layout exactly
   - Add "Certified by" signature block for Dept Head

2. **Job Request Module (Annex B)**
   - Option A: Add `type: 'goods' | 'services'` to existing PR schema
   - Option B: Separate `job-requests` module (recommended for cleaner numbering)
   - Separate JR numbering sequence
   - Add "Service Inspection Report" attachment category
   - Reuse approval workflow engine

3. **Supplier Management Module (NEW)**
   - Supplier CRUD (name, address, VAT/non-VAT, TIN, bank details)
   - BIR Form 2303/COR attachment
   - Passbook/proof of account attachment
   - Supplier status: `active`, `inactive`, `blacklisted`

4. **Purchase Order Module (NEW)**
   - Created by Procurement Officer after PR/JR approved
   - Links to source PR/JR
   - Canvass comparison (3 supplier quotes)
   - PO approval workflow: Draft → Submitted → Approved → Issued
   - PO numbering: PO-YYYY-NNNNN

### Phase 2B: Petty Cash System (Priority: MEDIUM)

**Goal:** Digitize the complete petty cash lifecycle.

1. **New Roles Setup**
   - Add `petty_cash_custodian` role or permission flag
   - Assign custodian per department

2. **Petty Cash Purchase Request (Annex C)**
   - Similar to PR but simpler (no multi-level approval)
   - Max PHP 2,000 validation
   - Approved by Petty Cash Custodian only
   - PCPR numbering: PCPR-YYYY-NNNNN

3. **Petty Cash Voucher (Annex D)**
   - Created by Custodian after PCPR approved
   - Tracks: amount granted, paid, refunded
   - Receipt/invoice number tracking
   - PCV numbering: PCV-YYYY-NNNNN

4. **CERR (Annex E)**
   - Simple form for no-receipt expenses
   - Approved by Accounting Officer
   - Can be attached to PCV or RRF
   - CERR numbering: CERR-YYYY-NNNNN

5. **Petty Cash Register (Annex F)**
   - Auto-generated ledger view from PCVs
   - Per department, per custodian
   - Running balance calculation
   - Expense category breakdown (account codes 5050-5102)
   - Printable Excel export matching Annex F layout

6. **Petty Cash Liquidation Report (Annex G)**
   - Period-based aggregation of PCVs
   - Three-level sign-off: Custodian → Bookkeeper → Accounting Officer
   - PCLR numbering: PCLR-YYYY-NNNNN
   - Triggers fund replenishment

### Phase 2C: Reimbursements (Priority: MEDIUM)

1. **Reimbursement Request Form (Annex H)**
   - Similar workflow to PR: Preparer → Accounting Officer → COO → President
   - Period-covered line items (not qty-based)
   - CERR attachment support
   - RRF numbering: RRF-YYYY-NNNNN

### Phase 2D: Disbursement Calendar (Priority: LOW)

1. **Admin-configurable annual schedule**
   - Monthly cut-off dates: receiving, check release, bank deposit
   - Dashboard widget showing next deadline
   - Warning notifications before cut-off
   - Auto-flag late submissions

---

## New Modules Required

### Backend (NestJS) — `apps/api/src/modules/`

```
modules/
├── job-requests/              # Annex B — services procurement
│   ├── schemas/
│   │   └── job-request.schema.ts
│   ├── dto/
│   ├── job-requests.controller.ts
│   ├── job-requests.service.ts
│   └── job-requests.module.ts
│
├── suppliers/                 # Supplier master data
│   ├── schemas/
│   │   └── supplier.schema.ts
│   ├── dto/
│   ├── suppliers.controller.ts
│   ├── suppliers.service.ts
│   └── suppliers.module.ts
│
├── purchase-orders/           # Post-approval procurement
│   ├── schemas/
│   │   └── purchase-order.schema.ts
│   ├── dto/
│   ├── purchase-orders.controller.ts
│   ├── purchase-orders.service.ts
│   └── purchase-orders.module.ts
│
├── petty-cash/                # Annexes C, D, E, F, G
│   ├── schemas/
│   │   ├── petty-cash-request.schema.ts    # PCPR (Annex C)
│   │   ├── petty-cash-voucher.schema.ts    # PCV (Annex D)
│   │   ├── cerr.schema.ts                 # CERR (Annex E)
│   │   ├── petty-cash-register.schema.ts   # PCR (Annex F) — may be virtual/computed
│   │   └── petty-cash-liquidation.schema.ts # PCLR (Annex G)
│   ├── dto/
│   ├── petty-cash.controller.ts
│   ├── petty-cash.service.ts
│   └── petty-cash.module.ts
│
├── reimbursements/            # Annex H
│   ├── schemas/
│   │   └── reimbursement-request.schema.ts
│   ├── dto/
│   ├── reimbursements.controller.ts
│   ├── reimbursements.service.ts
│   └── reimbursements.module.ts
│
└── disbursement-calendar/     # Cut-off schedule (Memo 002)
    ├── schemas/
    │   └── disbursement-schedule.schema.ts
    ├── dto/
    ├── disbursement-calendar.controller.ts
    ├── disbursement-calendar.service.ts
    └── disbursement-calendar.module.ts
```

### Frontend (React) — `apps/web/src/features/`

```
features/
├── job-requests/              # JR list, form, detail pages
├── suppliers/                 # Supplier list, form pages
├── purchase-orders/           # PO list, form, detail, canvass comparison
├── petty-cash/                # PCPR, PCV, CERR, Register, Liquidation
├── reimbursements/            # RRF list, form, detail pages
└── disbursement-calendar/     # Calendar view, admin config
```

### Shared Types — `packages/shared/src/`

```
constants/
├── request-types.ts           # 'purchase_request' | 'job_request' | 'petty_cash' | 'reimbursement'
├── expense-categories.ts      # Account codes (5050, 5060, 5070, etc.)
├── document-types.ts          # Annex types for numbering
└── disbursement-status.ts     # Cut-off states

types/
├── job-request.types.ts
├── supplier.types.ts
├── purchase-order.types.ts
├── petty-cash.types.ts
├── reimbursement.types.ts
└── disbursement.types.ts
```

---

## Schema Design Notes

### New Roles to Add

```typescript
// Update packages/shared/src/constants/roles.ts
export const ROLES = {
  STAFF: 'staff',
  DEPT_HEAD: 'dept_head',
  PETTY_CASH_CUSTODIAN: 'petty_cash_custodian',  // NEW
  PROCUREMENT_OFFICER: 'procurement_officer',      // NEW
  ACCOUNTING: 'accounting',                        // Already exists or map to existing
  COO: 'coo',
  CEO: 'ceo',
  ADMIN: 'admin',
} as const;
```

### Expense Category Account Codes

```typescript
// packages/shared/src/constants/expense-categories.ts
export const EXPENSE_CATEGORIES = {
  WATER: { code: '5050', label: 'Water' },
  TRANSPORTATION: { code: '5060', label: 'Transportation' },
  OFFICE_SUPPLIES: { code: '5070', label: 'Office Supplies' },
  FUEL_OIL_LUBRICANTS: { code: '5071', label: 'Fuel, Oil and Lubricants' },
  NOTARIAL_FEES: { code: '5083', label: 'Notarial Fees' },
  REPRESENTATION: { code: '5102', label: 'Representation' },
} as const;
```

### Key Schema Relationships

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Purchase Request │────→│  Purchase Order   │────→│    Supplier     │
│    (Annex A)     │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
┌─────────────────┐           │
│   Job Request   │───────────┘
│    (Annex B)     │
└─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Petty Cash Req  │────→│  Petty Cash       │────→│  Petty Cash     │
│    (Annex C)     │     │  Voucher (Annex D)│     │  Register (F)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                         │
                              │                         ↓
                        ┌─────┴──────┐           ┌─────────────────┐
                        │    CERR     │           │  PC Liquidation │
                        │  (Annex E)  │           │    (Annex G)    │
                        └────────────┘           └─────────────────┘

┌─────────────────┐
│ Reimbursement   │──→ Uses CERR (Annex E) as attachment
│    (Annex H)     │
└─────────────────┘
```

---

## Document Numbering Summary

| Document | Code | Format | Example |
|----------|------|--------|---------|
| Purchase Request | PR | PR-YYYY-NNNNN | PR-2026-00001 |
| Job Request | JR | JR-YYYY-NNNNN | JR-2026-00001 |
| Purchase Order | PO | PO-YYYY-NNNNN | PO-2026-00001 |
| Petty Cash Purchase Request | PCPR | PCPR-YYYY-NNNNN | PCPR-2026-00001 |
| Petty Cash Voucher | PCV | PCV-YYYY-NNNNN | PCV-2026-00001 |
| Certificate of Expenses NRR | CERR | CERR-YYYY-NNNNN | CERR-2026-00001 |
| Petty Cash Liquidation Report | PCLR | PCLR-YYYY-NNNNN | PCLR-2026-00001 |
| Reimbursement Request Form | RRF | RRF-YYYY-NNNNN | RRF-2026-00001 |

---

## Key Business Rules

1. **POS Receipts are NOT accepted** — only BIR Registered Sales/Service Invoices
2. **Minimum 3 canvasses required** for Purchase Requests and Job Requests
3. **Petty Cash max PHP 2,000** per transaction
4. **Incomplete documents are returned** to the requesting department
5. **Documents received after cut-off** are processed in the 1st week of the next month
6. **Reimbursements must be pre-approved** by Head of Office before spending
7. **Non-compliance results in:** disallowance of claims, delay in approval/payment/completion
8. **New suppliers require:** BIR Form 2303/COR, complete company details, bank proof
9. **Department Head certifies** that items are "essential and necessary to daily operations"
10. **Petty Cash Custodian is per-department** — manages their department's fund only
