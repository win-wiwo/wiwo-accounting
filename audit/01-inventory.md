# Component Library Audit — Full Inventory

**Date:** 2026-05-03
**Branch:** staging
**Scope:** `apps/web/src/` (React + Tailwind v4 + Vite)

---

## 1. Project Structure

### Directory tree (3 levels deep)

```
apps/web/src/
├── assets/
├── components/
│   ├── layout/
│   ├── premium/
│   └── ui/
├── features/
│   ├── approvals/
│   ├── auth/
│   ├── dashboard/
│   ├── departments/
│   ├── procurement/
│   │   └── workspace/
│   ├── profile/
│   ├── projects/
│   ├── purchase-orders/
│   ├── purchase-requests/
│   │   └── form/
│   ├── reports/
│   ├── search/
│   ├── settings/
│   ├── suppliers/
│   └── users/
├── hooks/
├── lib/
├── routes/
└── stores/
```

### Pages / Routes

All routes defined in `src/App.tsx` using `BrowserRouter`.

| Route | Page Component | File | Guard |
|-------|---------------|------|-------|
| `/login` | LoginPage | `features/auth/login-page.tsx` | Public |
| `/dashboard` | DashboardPage | `features/dashboard/dashboard-page.tsx` | Auth |
| `/users` | UsersListPage | `features/users/users-list-page.tsx` | Admin |
| `/departments` | DepartmentsListPage | `features/departments/departments-list-page.tsx` | Admin |
| `/departments/:id` | DepartmentDetailPage | `features/departments/department-detail-page.tsx` | Admin |
| `/suppliers` | SuppliersListPage | `features/suppliers/suppliers-list-page.tsx` | Admin/Accounting/Procurement |
| `/suppliers/new` | SupplierFormPage | `features/suppliers/supplier-form-page.tsx` | Admin/Accounting/Procurement |
| `/suppliers/:id` | SupplierDetailPage | `features/suppliers/supplier-detail-page.tsx` | Admin/Accounting/Procurement |
| `/suppliers/:id/edit` | SupplierFormPage | `features/suppliers/supplier-form-page.tsx` | Admin/Accounting/Procurement |
| `/purchase-orders` | PoListPage | `features/purchase-orders/po-list-page.tsx` | Auth |
| `/purchase-orders/:id` | PoDetailPage | `features/purchase-orders/po-detail-page.tsx` | Auth |
| `/search` | SearchPage | `features/search/search-page.tsx` | Admin/DeptHead/COO/CEO/Accounting/Procurement |
| `/purchase-requests` | PrListPage | `features/purchase-requests/pr-list-page.tsx` | Auth |
| `/purchase-requests/new` | PrFormPage | `features/purchase-requests/pr-form-page.tsx` | Auth |
| `/purchase-requests/:id` | PrDetailPage | `features/purchase-requests/pr-detail-page.tsx` | Auth |
| `/purchase-requests/:id/edit` | PrFormPage | `features/purchase-requests/pr-form-page.tsx` | Auth |
| `/approvals` | ApprovalsPage | `features/approvals/approvals-page.tsx` | DeptHead/COO/CEO |
| `/projects` | ProjectsPage | `features/projects/projects-page.tsx` | Admin/CEO/COO |
| `/procurement` | ProcurementQueuePage | `features/procurement/procurement-queue-page.tsx` | Procurement/Admin |
| `/procurement/:id` | ProcurementWorkspacePage | `features/procurement/workspace/procurement-workspace-page.tsx` | Procurement/Admin |
| `/reports` | ReportsPage | `features/reports/reports-page.tsx` | Auth |
| `/settings` | SettingsPage | `features/settings/settings-page.tsx` | Admin |
| `/profile` | ProfilePage | `features/profile/profile-page.tsx` | Auth |
| `/403` | ForbiddenPage | `routes/error-pages.tsx` | — |
| `/404` | NotFoundPage | `routes/error-pages.tsx` | — |
| `/` | redirect → `/dashboard` | — | — |
| `*` | NotFoundPage | `routes/error-pages.tsx` | — |

### Total component file count

**70 `.tsx` files**

---

## 2. Component Inventory

### A. Base UI primitives (`components/ui/`)

| File | Export(s) | Type | Imports elsewhere |
|------|-----------|------|-------------------|
| `ui/avatar.tsx` | Avatar, AvatarFallback, AvatarImage | Primitive | ~4 |
| `ui/badge.tsx` | Badge | Primitive | 1 |
| `ui/button.tsx` | Button | Primitive | 13 |
| `ui/calendar.tsx` | Calendar | Primitive (internal) | 1 (date-picker only) |
| `ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | Primitive | ~10 |
| `ui/date-picker.tsx` | DatePicker | Primitive | ~5 |
| `ui/dialog.tsx` | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose | Primitive | 12 |
| `ui/empty-state.tsx` | EmptyState | Primitive | 1 |
| `ui/input.tsx` | Input | Primitive | 12 |
| `ui/label.tsx` | Label | Primitive | ~8 |
| `ui/pagination.tsx` | Pagination, PaginationContent, ... | Primitive | 0 (unused) |
| `ui/popover.tsx` | Popover, PopoverContent, PopoverTrigger | Primitive (internal) | 2 (date-picker, header) |
| `ui/segmented-control.tsx` | SegmentedControl | Primitive | 0 (unused) |
| `ui/select.tsx` | Select, SelectTrigger, SelectContent, SelectItem, SelectValue | Primitive | 15 |
| `ui/separator.tsx` | Separator | Primitive | 0 (unused) |
| `ui/skeleton.tsx` | Skeleton | Primitive | 18 |
| `ui/stepper.tsx` | Stepper | Primitive | 0 (unused) |
| `ui/sticky-footer.tsx` | StickyFooter | Primitive | ~3 |
| `ui/table.tsx` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell | Primitive | 0 (unused) |
| `ui/toast.tsx` | Toast, Toaster, useToast | Primitive | ~5 |

### B. Premium / design-system layer (`components/premium/`)

| File | Export(s) | Type | Imports elsewhere |
|------|-----------|------|-------------------|
| `premium/data-table.tsx` | DataTable | Composed | ~8 |
| `premium/empty-state.tsx` | EmptyState | Composed | 18 |
| `premium/filter-bar.tsx` | FilterBar | Composed | ~6 |
| `premium/form-field.tsx` | FormField | Composed | 95 |
| `premium/list-skeleton.tsx` | ListSkeleton | Composed | ~5 |
| `premium/page-header.tsx` | PageHeader | Composed | 30 |
| `premium/pagination.tsx` | Pagination | Composed | 14 |
| `premium/primary-button.tsx` | PrimaryButton, GhostButton | Composed | 54 / 75 |
| `premium/status-badge.tsx` | StatusBadge | Composed | 25 |
| `premium/surface.tsx` | Surface | Composed | 104 |

### C. Layout (`components/layout/`)

| File | Export(s) | Type | Imports elsewhere |
|------|-----------|------|-------------------|
| `layout/app-layout.tsx` | AppLayout | Layout shell | 1 (App.tsx) |
| `layout/header.tsx` | Header | Layout | 1 (AppLayout) |
| `layout/page-header.tsx` | PageHeader | Layout | 6 |
| `layout/sidebar.tsx` | Sidebar | Layout | 1 (AppLayout) |

### D. Standalone shared component

| File | Export(s) | Type | Imports elsewhere |
|------|-----------|------|-------------------|
| `components/purchase-request-workflow-timeline.tsx` | PurchaseRequestWorkflowTimeline | Composed | ~3 |

### E. Near-duplicates / overlap groups

| Concept | Files | Notes |
|---------|-------|-------|
| **Button** | `ui/button.tsx`, `premium/primary-button.tsx` (PrimaryButton + GhostButton) | Intentional hierarchy: base Radix primitive vs. styled CTA variants |
| **Badge** | `ui/badge.tsx` (1 use), `premium/status-badge.tsx` (25 uses) | `ui/badge` is largely superseded by StatusBadge |
| **EmptyState** | `ui/empty-state.tsx` (1 use), `premium/empty-state.tsx` (18 uses) | Premium version dominates; ui version nearly dead |
| **Table** | `ui/table.tsx` (0 uses), `premium/data-table.tsx` (~8 uses) | ui/table is completely dead code |
| **Pagination** | `ui/pagination.tsx` (0 uses), `premium/pagination.tsx` (14 uses) | ui/pagination is dead code |
| **PageHeader** | `layout/page-header.tsx` (6 uses), `premium/page-header.tsx` (30 uses) | Two different components; layout version is secondary |

### F. Dead / unused components (0 imports)

- `ui/table.tsx`
- `ui/pagination.tsx`
- `ui/stepper.tsx`
- `ui/segmented-control.tsx`
- `ui/separator.tsx`

---

## 3. Color Inventory

### 3a. CSS custom properties (defined in `index.css` `@theme {}`)

**Surfaces:**
| Variable | Value |
|----------|-------|
| `--color-background` | `#F6F7F9` |
| `--color-foreground` | `#111827` |
| `--color-card` | `#FFFFFF` |
| `--color-card-foreground` | `#111827` |
| `--color-popover` | `#FFFFFF` |
| `--color-popover-foreground` | `#111827` |

**Brand / Primary:**
| Variable | Value |
|----------|-------|
| `--color-primary` | `oklch(0.205 0.042 265.755)` |
| `--color-primary-foreground` | `#FFFFFF` |

**Secondary / Muted:**
| Variable | Value |
|----------|-------|
| `--color-secondary` | `#F3F4F6` |
| `--color-secondary-foreground` | `#374151` |
| `--color-muted` | `#F9FAFB` |
| `--color-muted-foreground` | `#6B7280` |
| `--color-accent` | `#F3F4F6` |
| `--color-accent-foreground` | `#111827` |

**Semantic:**
| Variable | Value |
|----------|-------|
| `--color-destructive` | `#B42318` |
| `--color-destructive-foreground` | `#FFFFFF` |

**Borders / Inputs:**
| Variable | Value |
|----------|-------|
| `--color-border` | `#E5E7EB` |
| `--color-input` | `#E5E7EB` |
| `--color-ring` | `oklch(0.205 0.042 265.755)` |

**Charts (oklch):**
| Variable | Value | Approx hue |
|----------|-------|-------------|
| `--color-chart-1` | `oklch(0.646 0.222 41.116)` | Orange |
| `--color-chart-2` | `oklch(0.6 0.118 184.714)` | Cyan |
| `--color-chart-3` | `oklch(0.398 0.07 227.392)` | Dark blue |
| `--color-chart-4` | `oklch(0.828 0.189 84.429)` | Gold |
| `--color-chart-5` | `oklch(0.769 0.188 70.08)` | Orange-gold |

**Sidebar:**
| Variable | Value |
|----------|-------|
| `--color-sidebar` | `#111318` |
| `--color-sidebar-foreground` | `#E5E7EB` |
| `--color-sidebar-primary` | `#FFFFFF` |
| `--color-sidebar-primary-foreground` | `#111318` |
| `--color-sidebar-accent` | `#FFFFFF` |
| `--color-sidebar-accent-foreground` | `#111827` |
| `--color-sidebar-border` | `#1E2229` |
| `--color-sidebar-ring` | `#6B7280` |
| `--color-sidebar-muted` | `#6B7280` |

**Radius tokens:**
| Variable | Value |
|----------|-------|
| `--radius-sm` | `0.375rem` (6px) |
| `--radius-md` | `0.5rem` (8px) |
| `--radius-lg` | `0.75rem` (12px) |
| `--radius-xl` | `1rem` (16px) |

### 3b. Hex codes in CSS / inline styles

| Hex | Where |
|-----|-------|
| `#000000` | `index.css` (scrollbar track/bg, html bg) |
| `#09090b` | `suppliers-list-page.tsx`, `index.css` |
| `#0d0d0d` | `pr-detail-page.tsx`, `pr-list-page.tsx`, `index.css` (gradient end) |
| `#111111` | `index.css` (login input color) |
| `#111318` | `index.css` (sidebar) |
| `#111827` | `index.css` (foreground tokens) |
| `#131313` | `login-page.tsx` (dark panel bg) |
| `#18181b` | `suppliers-list-page.tsx`, `index.css` |
| `#1E2229` | `index.css` (sidebar border) |
| `#262626` | `pr-detail-page.tsx`, `pr-list-page.tsx`, `index.css` (gradient start) |
| `#374151` | `index.css` (secondary-foreground) |
| `#3f3f46` | `suppliers-list-page.tsx` |
| `#404040` | `index.css` (scrollbar thumb) |
| `#555555` | `index.css` (scrollbar hover) |
| `#6B7280` | `index.css` (muted-foreground, sidebar-muted) |
| `#B42318` | `index.css` (destructive) |
| `#c2c2c2` | `index.css` (login placeholder) |
| `#dadada` | `index.css` (login panel gradient) |
| `#E5E7EB` | `index.css` (border, input, sidebar-foreground) |
| `#e9e9e9` | `index.css` (login panel gradient) |
| `#F3F4F6` | `index.css` (secondary, accent) |
| `#f4f4f4` | `index.css` (login panel gradient) |
| `#F6F7F9` | `index.css`, `app-layout.tsx`, `sticky-footer.tsx` |
| `#F9FAFB` | `index.css` (muted) |
| `#fafafa` | `index.css` (login panel gradient) |
| `#ffffff` / `#FFFFFF` | `index.css` (many tokens) |

### 3c. oklch values (beyond @theme)

Used in `index.css` custom classes and as arbitrary Tailwind values:

| Value | Purpose | File(s) |
|-------|---------|---------|
| `oklch(0.25 0 0)` | Row hover inset | `index.css` |
| `oklch(0.26 0 0)` | Header search border | `index.css` |
| `oklch(0.40 0 0)` | Header search focus border | `index.css` |
| `oklch(0.44 0 0)` | Header search placeholder | `index.css` |
| `oklch(0.52_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.55_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.577_0.245_27.325)` | Orange bg | `app-layout.tsx` |
| `oklch(0.58_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.60_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.65_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.72_0_0)` | Arbitrary text color | `index.css` |
| `oklch(0.84 0.05 250 / 0.14)` | Greeting glow | `index.css` |
| `oklch(0.88 0 0)` | Header search text | `index.css` |
| `oklch(0.115 0 0)` | Header search bg | `index.css` |
| `oklch(0.13 0 0)` | Header search focus bg | `index.css` |
| `oklch(1 0 0 / 0.05)` | Light white overlay | `index.css` |

### 3d. rgba values

There are **34 unique rgba values** across the codebase. The vast majority are black at varying opacity for shadows and subtle borders:

| Opacity range | Count | Usage pattern |
|---------------|-------|---------------|
| `rgba(0,0,0, 0.01–0.05)` | 8 values | Micro-shadows on surfaces, premium components |
| `rgba(0,0,0, 0.06–0.12)` | 7 values | Focus rings, card borders, inset shadows |
| `rgba(0,0,0, 0.14–0.18)` | 4 values | Button shadows, heavy overlays |
| `rgba(0,0,0, 0.25–0.30)` | 3 values | Header search insets, scrollbar hovers |
| `rgba(255,255,255, 0.025–0.10)` | 6 values | White insets/sheens on dark backgrounds |
| `rgba(255,255,255, 0.55–1.0)` | 3 values | Grid lines, login card background |
| `rgba(10,10,10,0.72)` | 1 value | Login card rule |
| `rgba(12,12,12,0.72)` | 1 value | Login input focus border |
| `rgba(245,158,11,0.10)` | 1 value | Amber tint on empty-state |

**Files with most rgba values:** `index.css` (20+), `premium/surface.tsx` (8), `premium/filter-bar.tsx` (3), `premium/form-field.tsx` (3)

### 3e. Tailwind color classes

**Hue families in use:** `zinc`, `amber`, `red`, `emerald`, `blue`, `green`, `violet`, `indigo`, `slate`, `white`, `black`

**Background classes (bg-):**
```
amber:    bg-amber-50, bg-amber-100, bg-amber-200, bg-amber-400, bg-amber-500
blue:     bg-blue-50, bg-blue-100, bg-blue-400, bg-blue-500
emerald:  bg-emerald-50, bg-emerald-100, bg-emerald-400, bg-emerald-500, bg-emerald-600, bg-emerald-700
green:    bg-green-50, bg-green-200
indigo:   bg-indigo-50, bg-indigo-500
red:      bg-red-50, bg-red-100, bg-red-200, bg-red-400, bg-red-500, bg-red-600, bg-red-700
slate:    bg-slate-50
violet:   bg-violet-50, bg-violet-400, bg-violet-500, bg-violet-600
zinc:     bg-zinc-50, bg-zinc-100, bg-zinc-200, bg-zinc-300, bg-zinc-400, bg-zinc-700, bg-zinc-800, bg-zinc-900
neutral:  bg-white, bg-black
```

**Text classes (text-):**
```
amber:    text-amber-400, -500, -600, -700, -800, -900
blue:     text-blue-400, -500, -600, -700, -800, -900
emerald:  text-emerald-400, -500, -600, -700, -800, -900
green:    text-green-700, -800
indigo:   text-indigo-700
red:      text-red-400, -500, -600, -700, -800, -900
slate:    text-slate-600, -700, -800
violet:   text-violet-400, -600, -700
zinc:     text-zinc-200, -300, -400, -500, -600, -700, -800, -900, -950
neutral:  text-white
```

**Border classes (border-):**
```
amber:    border-amber-100, -200, -300, -400
blue:     border-blue-100, -200, -300
emerald:  border-emerald-100, -200, -300, -400
green:    border-green-200
red:      border-red-100, -200, -300, -400
slate:    border-slate-200
violet:   border-violet-100
zinc:     border-zinc-100, -200, -300, -400, -800, -900
neutral:  border-white
```

**Ring classes (ring-):**
```
amber:    ring-amber-300
emerald:  ring-emerald-200, -300
red:      ring-red-200, -300
zinc:     ring-zinc-300, -400, -900
neutral:  ring-white
```

**Other:** `fill-zinc-900`, `divide-zinc-100`

### 3f. Arbitrary Tailwind color brackets

| Class | File(s) |
|-------|---------|
| `bg-[#131313]` | `login-page.tsx` |
| `bg-[#F6F7F9]` | `app-layout.tsx`, `sticky-footer.tsx` |
| `bg-[oklch(0.577_0.245_27.325)]` | `app-layout.tsx` |
| `text-[oklch(0.44_0_0)]` | inline styles |
| `text-[oklch(0.52_0_0)]` | inline styles |
| `text-[oklch(0.55_0_0)]` | inline styles |
| `text-[oklch(0.58_0_0)]` | inline styles |
| `text-[oklch(0.65_0_0)]` | inline styles |
| `text-[oklch(0.72_0_0)]` | inline styles |

### 3g. Visually-similar color groups (flag: potential consolidation)

| Group | Colors | Notes |
|-------|--------|-------|
| **Near-black neutrals** | `#000000`, `#09090b`, `#0d0d0d`, `#111111`, `#111318`, `#111827`, `#131313`, `#18181b` | 8 near-blacks; only 2-3 are probably needed |
| **Mid-dark grays** | `#262626`, `#374151`, `#3f3f46`, `#404040` | 4 values in close range |
| **Mid grays** | `#555555`, `#6B7280` | 2 values |
| **Light grays** | `#c2c2c2`, `#dadada`, `#E5E7EB`, `#e9e9e9` | 4 values |
| **Off-whites** | `#F3F4F6`, `#f4f4f4`, `#F6F7F9`, `#F9FAFB`, `#fafafa` | 5 values — hard to tell apart visually |
| **Green vs. emerald** | `bg-green-50/200`, `text-green-700/800` alongside full `emerald-*` scale | Two green families; consolidate to one |
| **Slate vs. zinc** | `text-slate-600/700/800`, `border-slate-200` alongside full `zinc-*` scale | Two gray families; consolidate to one |

---

## 4. Typography Inventory

### 4a. Font families

**One font family in use:**

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

Applied globally via `body { font-family: var(--font-sans); }`. No `@font-face`, no CDN import — relies on system Inter or fallback.

`font-mono` is used 29 times for numeric/tabular data (e.g., amounts, PR numbers).

### 4b. Font sizes

**Standard Tailwind classes (68 total uses):**

| Class | Count |
|-------|-------|
| `text-xs` (12px) | 30 |
| `text-sm` (14px) | 26 |
| `text-base` (16px) | 5 |
| `text-lg` (18px) | 5 |
| `text-2xl` (24px) | 2 |
| `text-4xl` (36px) | 2 |

**Arbitrary pixel sizes (869 total uses across 47 files):**

| Size | Count | Rough equivalent |
|------|-------|-----------------|
| `text-[8px]` | 1 | — |
| `text-[9px]` | 9 | — |
| `text-[10px]` | 122 | ~text-[2.5] |
| `text-[11px]` | 197 | between xs and 2xs |
| `text-[11.5px]` | 1 | — |
| `text-[12px]` | 221 | = text-xs |
| `text-[12.5px]` | 4 | — |
| `text-[13px]` | 206 | between xs and sm |
| `text-[13.5px]` | 1 | — |
| `text-[14px]` | 24 | = text-sm |
| `text-[15px]` | 33 | between sm and base |
| `text-[16px]` | 15 | = text-base |
| `text-[17px]` | 2 | — |
| `text-[18px]` | 4 | = text-lg |
| `text-[20px]` | 5 | = text-xl |
| `text-[22px]` | 4 | between xl and 2xl |
| `text-[24px]` | 6 | = text-2xl |
| `text-[26px]` | 2 | — |
| `text-[28px]` | 8 | between 2xl and 3xl |
| `text-[32px]` | 2 | = text-3xl |
| `text-[34px]` | 1 | — |

**Top 5 files by arbitrary text-size count:**

1. `procurement-workspace-page.tsx` — 84
2. `pr-detail-page.tsx` — 77
3. `dashboard-page.tsx` — 77
4. `pr-approval-modal.tsx` — 65
5. `canvass-matrix.tsx` — 56

**CSS font-size declarations (index.css):**

| Class | Value |
|-------|-------|
| `.login-input` | `14px` |
| `.login-btn` | `13.5px` |
| `.header-search` | `13px` |

### 4c. Font weights

| Weight | Tailwind class | Count |
|--------|---------------|-------|
| 400 | `font-normal` | 7 |
| 500 | `font-medium` | 212 |
| 600 | `font-semibold` | 312 |
| 700 | `font-bold` | 61 |

No `font-thin`, `font-light`, `font-extrabold`, or `font-black` in use. CSS `font-weight: 600` appears once in `.login-btn`.

### 4d. Line heights

**Standard Tailwind classes (110 total):**

| Class | CSS value | Count |
|-------|-----------|-------|
| `leading-none` | `1` | 31 |
| `leading-tight` | `1.25` | 21 |
| `leading-snug` | `1.375` | 14 |
| `leading-relaxed` | `1.625` | 44 |

**Arbitrary values (2 total):**

| Value | File |
|-------|------|
| `leading-[1.25]` | `login-page.tsx` |
| `leading-[1.7]` | `pr-detail-page.tsx` |

### 4e. Letter spacing / tracking

| Class | Count |
|-------|-------|
| `tracking-tight` | 16 |
| `tracking-wide` | 10 |
| `tracking-widest` | 5 |
| `tracking-wider` | 1 |
| (default / no class) | 142 context refs |

CSS: `letter-spacing: 0.02em` in `.login-btn`.

### 4f. Typography style groups (inferred intent)

| Role | Likely size | Weight | Tracking | Leading | Notes |
|------|------------|--------|----------|---------|-------|
| Page title | `text-[28px]` | semibold | tight | tight | 8 uses |
| Section heading | `text-[15px]`–`text-[16px]` | semibold | — | — | ~48 uses |
| Body / description | `text-[13px]` | medium or normal | — | relaxed | 206 uses |
| Table cell / form input | `text-[13px]` | medium | — | — | Dominant body size |
| Label | `text-[12px]` | medium | — | — | 221 uses |
| Caption / meta | `text-[11px]` | medium | — | — | 197 uses |
| Micro / badge | `text-[10px]` | medium | wide/wider | — | 122 uses |
| KPI number | `text-[24px]`+ | bold | tight | none | Dashboard values |
| Error page heading | `text-4xl` | bold | — | — | 2 uses |

---

## 5. Spacing, Radius, Shadow Inventory

### 5a. Border-radius

**Standard Tailwind classes:**

| Class | CSS | Count |
|-------|-----|-------|
| `rounded-sm` | `0.125rem` (2px) | 2 |
| `rounded-md` | `0.375rem` (6px) | 68 |
| `rounded-lg` | `0.5rem` (8px) | 147 |
| `rounded-xl` | `0.75rem` (12px) | 92 |
| `rounded-2xl` | `1rem` (16px) | 11 |
| `rounded-full` | `9999px` | 138 |
| `rounded-b` (bottom only) | — | 1 |

**Arbitrary Tailwind:**

| Value | Count | File(s) |
|-------|-------|---------|
| `rounded-[10px]` | 3 | `primary-button.tsx` (2), `pr-list-page.tsx` (1) |

**CSS `border-radius`:**

| Value | Context |
|-------|---------|
| `22px` | `.login-card` |
| `10px` | `.login-input`, `.login-btn` |
| `8px` | `.header-search` |
| `7px` | scrollbar thumb |
| `50%` | `.login-glow` |
| `9999px` | `.scrollbar-modern` thumb |

### 5b. Shadows

**Standard Tailwind shadow classes:**

| Class | Count |
|-------|-------|
| `shadow-sm` | 21 |
| `shadow-md` | 4 |
| `shadow-lg` | 2 |

**Arbitrary shadow values (unique, grouped by complexity):**

*Simple (single layer):*

| Value | Count | Key files |
|-------|-------|-----------|
| `shadow-[0_1px_2px_rgba(0,0,0,0.02)]` | 1 | `seller-references-section.tsx` |
| `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` | 9 | `filter-bar`, `input`, `select`, + 6 more |
| `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | 27 | `card`, `surface`, `filter-bar`, widespread |
| `shadow-[0_1px_3px_rgba(0,0,0,0.05)]` | 6 | `dashboard-page.tsx` |
| `shadow-[0_1px_3px_rgba(0,0,0,0.06)]` | 1 | `select.tsx` |
| `shadow-[0_1px_4px_rgba(0,0,0,0.04)]` | 1 | `pr-approval-modal.tsx` |
| `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` | 2 | `po-form-page`, `pr-detail-page` |
| `shadow-[0_2px_8px_rgba(0,0,0,0.25)]` | 1 | `calendar.tsx` |
| `shadow-[0_4px_24px_rgba(0,0,0,0.12)]` | 1 | `header.tsx` |
| `shadow-[0_8px_24px_rgba(0,0,0,0.10)]` | 1 | `date-picker.tsx` |
| `shadow-[0_8px_24px_rgba(0,0,0,0.18)]` | 2 | `pr-detail-page`, `canvass-matrix` |
| `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` | 1 | `header.tsx` |

*Focus rings:*

| Value | Count |
|-------|-------|
| `shadow-[0_0_0_2px_rgba(0,0,0,0.04)]` | 2 |
| `shadow-[0_0_0_3px_rgba(0,0,0,0.06)]` | 25+ |
| `shadow-[0_0_0_3px_rgba(245,158,11,0.10)]` | 2 |
| `shadow-[0_0_0_4px_rgba(24,24,27,0.08)]` | 1 |

*Multi-layer composites:*

| Value | Count |
|-------|-------|
| `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]` | 7 |
| `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_12px_rgba(0,0,0,0.04)]` | 2 |
| `shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.05)]` | 1 |
| `shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]` | 2 |
| `shadow-[0_8px_30px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]` | 1 |
| `shadow-[0_24px_80px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)]` | 1 |
| `shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)]` | 1 |

*Directional (upward, inset):*

| Value | Count |
|-------|-------|
| `shadow-[0_-4px_12px_rgba(0,0,0,0.03)]` | 1 |
| `shadow-[0_-4px_24px_rgba(0,0,0,0.06)]` | 1 |
| `shadow-[inset_3px_0_0_theme(colors.emerald.400)]` | 1 |

**Total unique arbitrary shadow values: ~25**

### 5c. Arbitrary padding / margin values

| Value | Count | File(s) |
|-------|-------|---------|
| `p-[2px]` | 1 | `purchase-request-workflow-timeline.tsx` |
| `p-[3px]` | 2 | `purchase-request-workflow-timeline.tsx`, `po-detail-page.tsx` |
| `pt-[6px]` | 1 | `login-page.tsx` |
| `gap-[3px]` | 1 | `login-page.tsx` |

Only 5 arbitrary spacing values — spacing discipline is generally good.

### 5d. Gap values (standard Tailwind)

| Class | Count |
|-------|-------|
| `gap-0` | 1 |
| `gap-0.5` (2px) | 11 |
| `gap-1` (4px) | 64 |
| `gap-1.5` (6px) | 77 |
| `gap-2` (8px) | 126 |
| `gap-2.5` (10px) | 22 |
| `gap-3` (12px) | 68 |
| `gap-3.5` (14px) | 1 |
| `gap-4` (16px) | 49 |
| `gap-5` (20px) | 17 |
| `gap-6` (24px) | 13 |

### 5e. Notable arbitrary width / height / position values

| Value | Count | File(s) |
|-------|-------|---------|
| `w-[94vw]` | 1 | `pr-approval-modal.tsx` |
| `w-[360px]` | 1 | `header.tsx` |
| `w-[220px]` | 1 | `profile-page.tsx` |
| `w-[22px]` | 1 | `po-detail-page.tsx` |
| `w-[3px]`, `w-[5px]` | 2 | `dashboard-page.tsx` (dots) |
| `h-[90vh]` | 1 | `pr-approval-modal.tsx` |
| `h-[85vh]` | 1 | `pr-detail-page.tsx` |
| `h-[60vh]` | 1 | `po-detail-page.tsx` |
| `h-[60px]` | 2 | `po-list-page`, `pr-detail-page` |
| `h-[56px]` | 1 | `suppliers-list-page.tsx` |
| `h-[80px]` | 1 | `profile-page.tsx` |
| `h-[22px]` | 5+ | `status-badge`, `po-list-page`, `suppliers-list-page` |
| `h-[3px]`, `h-[5px]` | 2 | `dashboard-page.tsx` (dots) |
| `max-w-[1200px]` | 1 | `pr-approval-modal.tsx` |
| `max-w-[320px]` | 1 | `canvass-matrix.tsx` |
| `max-w-[240px]` | 1 | `pr-detail-page.tsx` |
| `max-h-[80vh]` | 1 | `pr-detail-page.tsx` |
| `left-[9px]`, `left-[11px]` | 2 | `purchase-request-workflow-timeline.tsx` |
| `top-[18px]`, `top-[22px]` | 2 | `purchase-request-workflow-timeline.tsx` |
| `z-[1]` | 4 | timeline, `po-detail-page` |

---

## 6. Tailwind Config

**No separate `tailwind.config.js` or `tailwind.config.ts` file.** This project uses **Tailwind CSS v4** with configuration via the `@theme {}` directive in `index.css`.

### Full `@theme {}` block (the entire config):

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme {
  /* Surfaces */
  --color-background: #F6F7F9;
  --color-foreground: #111827;
  --color-card: #FFFFFF;
  --color-card-foreground: #111827;
  --color-popover: #FFFFFF;
  --color-popover-foreground: #111827;

  /* Brand / Primary */
  --color-primary: oklch(0.205 0.042 265.755);
  --color-primary-foreground: #FFFFFF;

  /* Secondary / Muted */
  --color-secondary: #F3F4F6;
  --color-secondary-foreground: #374151;
  --color-muted: #F9FAFB;
  --color-muted-foreground: #6B7280;
  --color-accent: #F3F4F6;
  --color-accent-foreground: #111827;

  /* Semantic */
  --color-destructive: #B42318;
  --color-destructive-foreground: #FFFFFF;

  /* Borders / Inputs */
  --color-border: #E5E7EB;
  --color-input: #E5E7EB;
  --color-ring: oklch(0.205 0.042 265.755);

  /* Charts */
  --color-chart-1: oklch(0.646 0.222 41.116);
  --color-chart-2: oklch(0.6 0.118 184.714);
  --color-chart-3: oklch(0.398 0.07 227.392);
  --color-chart-4: oklch(0.828 0.189 84.429);
  --color-chart-5: oklch(0.769 0.188 70.08);

  /* Sidebar */
  --color-sidebar: #111318;
  --color-sidebar-foreground: #E5E7EB;
  --color-sidebar-primary: #FFFFFF;
  --color-sidebar-primary-foreground: #111318;
  --color-sidebar-accent: #FFFFFF;
  --color-sidebar-accent-foreground: #111827;
  --color-sidebar-border: #1E2229;
  --color-sidebar-ring: #6B7280;
  --color-sidebar-muted: #6B7280;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}
```

### Notes on config:

- **No `theme.extend`** — Tailwind v4 doesn't use a JS config; everything is in `@theme`
- **No custom spacing scale** — relies on Tailwind defaults (4px grid)
- **No custom breakpoints** — uses Tailwind defaults (`sm`, `md`, `lg`, `xl`, `2xl`)
- **No custom font-size scale** — the 869 arbitrary `text-[Xpx]` values bypass the type scale entirely
- **No custom shadow tokens** — the 25+ unique shadow values are all inline arbitrary
- **No plugins** — just `@import "tailwindcss"` with `@custom-variant dark`
- **`--color-secondary` and `--color-accent` are identical** (`#F3F4F6`) — same for their foreground values (`#111827`)
- **Dark mode** is defined (`@custom-variant dark`) but no dark-mode styles exist in the codebase

---

## Summary of key observations

| Finding | Severity | Detail |
|---------|----------|--------|
| 869 arbitrary font sizes | High | 93% of text sizing bypasses Tailwind's type scale |
| 25+ unique arbitrary shadows | High | No shadow tokens; every shadow is hand-crafted inline |
| 8 near-black hex values | Medium | Candidates for consolidation to 2–3 |
| 5 off-white hex values | Medium | Visually indistinguishable; consolidate |
| `green-*` + `emerald-*` dual usage | Medium | Two green families; pick one |
| `slate-*` + `zinc-*` dual usage | Medium | Two gray families; pick one |
| 5 dead components | Low | `ui/table`, `ui/pagination`, `ui/stepper`, `ui/segmented-control`, `ui/separator` |
| `ui/badge` + `ui/empty-state` nearly dead | Low | 1 import each; premium versions dominate |
| 3 arbitrary border-radius values | Low | Only `rounded-[10px]` — manageable |
| 5 arbitrary padding/gap values | Low | Spacing discipline is good overall |
