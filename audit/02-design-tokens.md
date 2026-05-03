# Design Tokens Proposal

**Date:** 2026-05-03
**Status:** Draft — review before any code changes
**Inputs:** `audit/01-inventory.md`, binding user decisions (zinc, emerald, ~8 type sizes)

---

## 1. Type Scale Proposal

### 1a. Proposed tokens (8 sizes + 1 documented half-step)

| Token name | Pixel size | rem | Weight pairing | Line-height | Tracking | Absorbs these existing sizes |
|------------|-----------|-----|----------------|-------------|----------|------------------------------|
| `text-micro` | 10px | 0.625rem | medium (500) | 1.4 | `wide` | `text-[8px]` (1), `text-[9px]` (9), `text-[10px]` (122) |
| `text-caption` | 11px | 0.6875rem | medium (500) | 1.4 | normal | `text-[11px]` (197), `text-[11.5px]` (1) |
| `text-label` | 12px | 0.75rem | medium (500) | 1.5 | normal | `text-[12px]` (221), `text-[12.5px]` (4), `text-xs` (30) |
| `text-body` | 13px | 0.8125rem | medium (500) | 1.55 | normal | `text-[13px]` (206), `text-[13.5px]` (1) |
| `text-body-lg` | 14px | 0.875rem | medium (500) | 1.55 | normal | `text-[14px]` (24), `text-sm` (26), `text-[15px]` (33) |
| `text-heading-sm` | 16px | 1rem | semibold (600) | 1.4 | normal | `text-[16px]` (15), `text-base` (5), `text-[17px]` (2), `text-[18px]` (4), `text-lg` (5) |
| `text-heading` | 20px | 1.25rem | semibold (600) | 1.3 | `tight` | `text-[20px]` (5), `text-[22px]` (4), `text-[24px]` (6), `text-2xl` (2) |
| `text-display` | 28px | 1.75rem | bold (700) | 1.2 | `tight` | `text-[26px]` (2), `text-[28px]` (8), `text-[32px]` (2), `text-[34px]` (1), `text-4xl` (2) |

**Half-step exception (documented):**

| Token name | Pixel size | rem | Justification |
|------------|-----------|-----|---------------|
| `text-body-lg` | 14px | 0.875rem | The 13->16px jump is too large for section intro text and form inputs. 83 current uses at 14-15px confirm the need. This is the only half-step. |

### 1b. One-off sizes being eliminated

| Size | Count | Fate |
|------|-------|------|
| `text-[8px]` | 1 | -> `text-micro` (10px). The 1 instance is a sidebar notification badge — 10px is still tiny. |
| `text-[9px]` | 9 | -> `text-micro` (10px). All are dashboard micro-labels. 1px increase is invisible. |
| `text-[11.5px]` | 1 | -> `text-caption` (11px). Half-pixel; no one can see the difference. |
| `text-[12.5px]` | 4 | -> `text-label` (12px). Half-pixel rounding. |
| `text-[13.5px]` | 1 | -> `text-body` (13px). Only in `.login-btn` CSS class. |
| `text-[15px]` | 33 | -> `text-body-lg` (14px). 1px reduction; these are section sub-headings that read fine at 14px. |
| `text-[17px]` | 2 | -> `text-heading-sm` (16px). Only 2 instances. |
| `text-[22px]` | 4 | -> `text-heading` (20px). Minor reduction; used for KPI values. |
| `text-[26px]` | 2 | -> `text-display` (28px). Minor increase; login heading. |
| `text-[34px]` | 1 | -> `text-display` (28px). Only the xl: responsive login heading — still large enough. |

### 1c. `@theme` syntax

```css
@theme {
  /* -- Type scale ------------------------------------------------- */
  --text-micro:      0.625rem;   /* 10px */
  --text-micro--line-height: 1.4;
  --text-caption:    0.6875rem;  /* 11px */
  --text-caption--line-height: 1.4;
  --text-label:      0.75rem;    /* 12px */
  --text-label--line-height: 1.5;
  --text-body:       0.8125rem;  /* 13px */
  --text-body--line-height: 1.55;
  --text-body-lg:    0.875rem;   /* 14px */
  --text-body-lg--line-height: 1.55;
  --text-heading-sm: 1rem;       /* 16px */
  --text-heading-sm--line-height: 1.4;
  --text-heading:    1.25rem;    /* 20px */
  --text-heading--line-height: 1.3;
  --text-display:    1.75rem;    /* 28px */
  --text-display--line-height: 1.2;
}
```

After this, `text-body` in a class becomes `font-size: 0.8125rem; line-height: 1.55`.

### 1d. Migration map (total: 937 instances across 47 files)

| New token | Replaces | Instance count |
|-----------|----------|----------------|
| `text-micro` | `text-[8px]`, `text-[9px]`, `text-[10px]` | 132 |
| `text-caption` | `text-[11px]`, `text-[11.5px]` | 198 |
| `text-label` | `text-[12px]`, `text-[12.5px]`, `text-xs` | 255 |
| `text-body` | `text-[13px]`, `text-[13.5px]` | 207 |
| `text-body-lg` | `text-[14px]`, `text-[15px]`, `text-sm` | 83 |
| `text-heading-sm` | `text-[16px]`, `text-[17px]`, `text-[18px]`, `text-base`, `text-lg` | 31 |
| `text-heading` | `text-[20px]`, `text-[22px]`, `text-[24px]`, `text-2xl` | 17 |
| `text-display` | `text-[26px]`, `text-[28px]`, `text-[32px]`, `text-[34px]`, `text-4xl` | 15 |
| **Total** | | **938** |

CSS font-size declarations (`.login-input` 14px, `.login-btn` 13.5px, `.header-search` 13px) stay in their CSS classes — they reference the same scale values but don't need token classes.

---

## 2. Shadow Scale Proposal

### 2a. Proposed tokens (8 shadows)

| Token | Value | Intent | Replaces |
|-------|-------|--------|----------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle resting state for inputs, filter pills | `shadow-[0_1px_2px_rgba(0,0,0,0.02)]` (1), `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` (9) |
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.04)` | Default card / surface resting state | `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` (27), `shadow-[0_1px_3px_rgba(0,0,0,0.05)]` (6), `shadow-[0_1px_3px_rgba(0,0,0,0.06)]` (1), `shadow-[0_1px_4px_rgba(0,0,0,0.04)]` (1) |
| `shadow-card-hover` | `0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)` | Elevated card on hover / focus | `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]` (7), `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_12px_rgba(0,0,0,0.04)]` (2) |
| `shadow-card-raised` | `0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.05)` | Highest card elevation — modals-in-cards, hero cards | `shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.05)]` (1), `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` (2) |
| `shadow-popover` | `0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)` | Popovers, dropdowns, floating menus | `shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]` (2), `shadow-[0_4px_24px_rgba(0,0,0,0.12)]` (1), `shadow-[0_8px_24px_rgba(0,0,0,0.10)]` (1), `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` (1), `shadow-[0_8px_30px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]` (1) |
| `shadow-modal` | `0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)` | Full-screen modals and overlays | `shadow-[0_24px_80px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)]` (1), `shadow-[0_8px_24px_rgba(0,0,0,0.18)]` (2) |
| `shadow-focus` | `0 0 0 3px rgba(0,0,0,0.06)` | Focus ring for inputs and interactive elements | `shadow-[0_0_0_3px_rgba(0,0,0,0.06)]` (25+), `shadow-[0_0_0_2px_rgba(0,0,0,0.04)]` (2), `shadow-[0_0_0_4px_rgba(24,24,27,0.08)]` (1) |
| `shadow-up` | `0 -4px 16px rgba(0,0,0,0.04)` | Upward shadow for sticky footers, bottom bars | `shadow-[0_-4px_12px_rgba(0,0,0,0.03)]` (1), `shadow-[0_-4px_24px_rgba(0,0,0,0.06)]` (1) |

**Change from v1:** Added `shadow-card-raised` (8th token). The `surface.tsx` component has an explicit `raised` elevation that was previously folded into `shadow-card-hover`. These are visually distinct levels — `card-hover` is a light lift for interactive feedback, `card-raised` is a heavy lift for hero cards and floating panels. The 2 instances of `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` previously assigned to `shadow-card` now correctly map to `shadow-card-raised` (they were closer in intent to the raised level than the resting card level).

### 2b. Shadows that remain inline (justified one-offs)

| Value | Count | Justification |
|-------|-------|---------------|
| `shadow-[0_6px_20px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)]` | 1 | Dashboard greeting card — unique inset+drop combo for signature visual. Not worth a token for 1 use. |
| `shadow-[inset_3px_0_0_theme(colors.emerald.400)]` | 1 | Procurement workspace active tab indicator — semantic color inset, not a shadow pattern. |
| `shadow-[0_0_0_3px_rgba(245,158,11,0.10)]` | 2 | Amber focus ring for warning-state inputs. Could become `shadow-focus-warning` if a third use appears; for now inline is fine. |
| `shadow-[0_2px_8px_rgba(0,0,0,0.25)]` | 1 | Calendar date picker dropdown — unusually dark; sits on complex background. Keep inline. |

### 2c. `@theme` syntax

```css
@theme {
  /* -- Shadows ---------------------------------------------------- */
  --shadow-xs:           0 1px 2px rgba(0,0,0,0.04);
  --shadow-card:         0 1px 3px rgba(0,0,0,0.04);
  --shadow-card-hover:   0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
  --shadow-card-raised:  0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.05);
  --shadow-popover:      0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
  --shadow-modal:        0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-focus:        0 0 0 3px rgba(0,0,0,0.06);
  --shadow-up:           0 -4px 16px rgba(0,0,0,0.04);
}
```

### 2d. Migration map (total: ~101 instances)

| New token | Instance count |
|-----------|----------------|
| `shadow-xs` | 10 |
| `shadow-card` | 35 |
| `shadow-card-hover` | 9 |
| `shadow-card-raised` | 3 |
| `shadow-popover` | 6 |
| `shadow-modal` | 3 |
| `shadow-focus` | 28 |
| `shadow-up` | 2 |
| Remain inline | 5 |
| **Total** | **~101** |

This also replaces the 27 uses of standard `shadow-sm`, `shadow-md`, `shadow-lg` — those map to `shadow-xs`, `shadow-card`, and `shadow-popover` respectively. The standard Tailwind shadow utilities can remain available but should not be used in app code.

---

## 3. Color Consolidation Proposal

### 3a. Near-blacks (8 -> 3 tokens)

| Token | Value | Role | Migrates from |
|-------|-------|------|---------------|
| `--color-foreground` (existing) | `#111827` | Primary text, headings, input text | **Unchanged** — keep current value |
| `--color-sidebar` (existing) | `#111318` | Sidebar background, login hero panel | `#131313` (login bg-[#131313]), `#111318` (unchanged) |
| `#000000` | stays as-is | Scrollbar track, html root background | `#000000` (unchanged) — only in `index.css` base layer |

**Rationale for keeping `#111827`:** The current foreground works. Shifting to `#18181b` (zinc-900) for "family purity" risks a visible hue-shift across every text element in the app. The difference is subtle (`#111827` has a faint blue undertone, zinc-900 is neutral) but it touches every single page. Not worth the risk for a cosmetic preference. `#111827` is already a near-black that works well with the zinc palette.

**Gradient blacks stay as-is:** `#0d0d0d` and `#262626` are used exclusively inside `linear-gradient(155deg, #262626 0%, #0d0d0d 100%)` for the premium button and login button. These are part of the visual effect, not semantic colors — leave them in the gradient declarations.

**Migration of eliminated values:**

| Old value | Occurrences | Maps to |
|-----------|-------------|---------|
| `#111111` | `index.css` (login input) | `var(--color-foreground)` / `text-foreground` |
| `#09090b` | `suppliers-list-page.tsx`, `index.css` | Used in gradient — stays in gradient |
| `#18181b` | `suppliers-list-page.tsx`, `index.css` | Used in gradient + zinc-900 utility classes — stays as Tailwind `zinc-900` |
| `#131313` | `login-page.tsx` | `var(--color-sidebar)` / `bg-sidebar` |

### 3b. Off-whites (5 -> 2 tokens)

| Token | Value | Role | Migrates from |
|-------|-------|------|---------------|
| `--color-background` (existing) | `#F6F7F9` | Page background, content area | `#F6F7F9` (unchanged), `#fafafa`, `#f4f4f4` |
| `--color-muted` (existing) | `#F9FAFB` | Secondary surfaces, hover backgrounds | **Unchanged** — keep current value |

**Rationale for keeping `#F9FAFB`:** Shifting muted from `#F9FAFB` to `#F3F4F6` (to align with `--color-secondary`) would darken every muted surface in the app. These tokens serve different purposes: `secondary` is for interactive backgrounds (hover states, selected items), `muted` is for passive/deemphasized surfaces (skeleton loaders, disabled zones, subtle containers). Keeping them distinct preserves the visual hierarchy.

**Migration:**

| Old value | Where | Maps to |
|-----------|-------|---------|
| `#F6F7F9` | `index.css`, `app-layout.tsx`, `sticky-footer.tsx` | `--color-background` (unchanged) |
| `#F9FAFB` | `index.css` (was `--color-muted`) | `--color-muted` (unchanged) |
| `#F3F4F6` | `index.css` (secondary, accent) | `--color-secondary` (unchanged) |
| `#fafafa` | `index.css` (login gradient stop) | Leave in gradient as-is (cosmetic, inside a radial-gradient) |
| `#f4f4f4` | `index.css` (login gradient stop) | Leave in gradient as-is |

**Note:** The login panel radial gradient (`radial-gradient(ellipse 140% 120% at 75% 115%, #dadada 0%, #e9e9e9 28%, #f4f4f4 58%, #fafafa 100%)`) uses these off-whites as gradient stops in a visual effect. These should remain as literal values inside the gradient — they're cosmetic, not semantic.

### 3c. Mid-dark grays (4 -> 2 tokens)

| Token | Value | Role | Migrates from |
|-------|-------|------|---------------|
| `zinc-800` | `#27272a` | Heavy UI elements (gradient start, table dark bg) | `#262626` (~zinc-800), `#3f3f46` (=zinc-700 — used in gradient alt row, fine) |
| `--color-secondary-foreground` | `#374151` | Secondary text | **Unchanged** — keep current value |
| Scrollbar-only | `#404040` | Scrollbar thumb | Stays inline in `index.css` — not semantic, purely cosmetic |

**Rationale for keeping `#374151`:** This is gray-700 and works as secondary text. Shifting to `#52525b` (zinc-600) would lighten secondary text across the app, reducing contrast. The current value provides good readability and the slight warm tone from the gray family is not visible at this shade.

**Migration:**

| Old value | Where | Maps to |
|-----------|-------|---------|
| `#262626` | gradients in `index.css`, `pr-detail-page`, `pr-list-page` | Keep in gradients (cosmetic) |
| `#374151` | `index.css` (`--color-secondary-foreground`) | Keep unchanged |
| `#3f3f46` | `suppliers-list-page.tsx` (gradient) | Keep in gradient (cosmetic) |
| `#404040` | `index.css` (scrollbar) | Keep inline (cosmetic) |
| `#555555` | `index.css` (scrollbar hover) | Keep inline (cosmetic) |

### 3d. Slate -> zinc migration

Only **3 files** with **7 class instances** total:

| Slate class | Zinc replacement | File(s) |
|-------------|-----------------|---------|
| `text-slate-600` | `text-zinc-600` | `purchase-request-workflow-timeline.tsx` (line 162) |
| `text-slate-700` | `text-zinc-700` | `pr-detail-page.tsx` (line 734) |
| `text-slate-800` | `text-zinc-800` | `pr-detail-page.tsx` (line 645) |
| `border-slate-200` | `border-zinc-200` | `pr-detail-page.tsx` (lines 645, 734) |
| `bg-slate-50` | `bg-zinc-50` | `pr-detail-page.tsx` (lines 645, 734) — note: the class is `bg-slate-50/80` |

**Effort:** 3 files, 7 find-replace operations. Trivial.

### 3e. Green -> emerald migration

Only **1 file** (`pr-detail-page.tsx`) with **10 class instances**:

| Green class | Emerald replacement | Line(s) |
|-------------|-------------------|---------|
| `text-green-700` | `text-emerald-700` | 161, 174, 187, 222, 246 |
| `text-green-800` | `text-emerald-800` | 230 |
| `bg-green-50` | `bg-emerald-50` | 161, 174, 187, 246 |
| `bg-green-200` | `bg-emerald-200` | 230 |
| `border-green-200` | `border-emerald-200` | 222 |

**Effort:** 1 file, 10 find-replace operations. Trivial.

### 3f. oklch arbitrary text/bg colors (16 values -> semantic tokens)

These live in `index.css` custom classes and in `sidebar.tsx` / `header.tsx`. They are all neutral grays on the oklch lightness axis (chroma=0) used on the dark sidebar and header search.

| oklch value | Approx hex | Current use | Proposed mapping |
|-------------|-----------|-------------|------------------|
| `oklch(0.115 0 0)` | ~`#0f0f0f` | Header search bg | Keep inline — scoped to `.header-search` CSS class |
| `oklch(0.13 0 0)` | ~`#131313` | Header search focus bg | Keep inline — scoped to `.header-search:focus` |
| `oklch(0.25 0 0)` | ~`#262626` | PR row hover inset | Keep inline — scoped to `.pr-row-enter:hover` |
| `oklch(0.26 0 0)` | ~`#2a2a2a` | Header search border | Keep inline — scoped to `.header-search` |
| `oklch(0.40 0 0)` | ~`#474747` | Header search focus border | Keep inline — scoped to `.header-search:focus` |
| `oklch(0.44 0 0)` | ~`#515151` | Header search placeholder, search icon | `--color-sidebar-muted` (already `#6B7280`, close enough — or keep inline for the dark-on-dark context) |
| `oklch(0.52 0 0)` | ~`#636363` | Sidebar section label | `text-sidebar-muted` (use existing token) |
| `oklch(0.55 0 0)` | ~`#6b6b6b` | Sidebar collapse button | `text-sidebar-muted` |
| `oklch(0.58 0 0)` | ~`#747474` | Sidebar user email | `text-sidebar-muted` |
| `oklch(0.60 0 0)` | ~`#7a7a7a` | Sidebar logout button | `text-sidebar-muted` |
| `oklch(0.65 0 0)` | ~`#888888` | Search icon focus state | Keep inline — transition target |
| `oklch(0.72 0 0)` | ~`#9e9e9e` | Sidebar nav inactive text | New: `--color-sidebar-inactive: oklch(0.72 0 0)` |
| `oklch(0.577 0.245 27.325)` | ~`#e85d2a` | Sidebar notification badge bg (orange) | New: `--color-sidebar-badge: oklch(0.577 0.245 27.325)` |
| `oklch(0.84 0.05 250 / 0.14)` | Transparent blue glow | Dashboard greeting glow | Keep inline — cosmetic gradient stop |
| `oklch(0.88 0 0)` | ~`#c8c8c8` | Header search input text | Keep inline — scoped to `.header-search` |
| `oklch(1 0 0 / 0.05)` | Transparent white | Header search focus ring | Keep inline — scoped to `.header-search:focus` |

**Summary:** 10 of 16 stay inline (they're scoped to CSS classes in `index.css` and don't leak). 4 map to existing `sidebar-muted`. 2 become new sidebar tokens.

### 3g. Dead and duplicate tokens

| Token(s) | Issue | Recommendation |
|----------|-------|----------------|
| `--color-accent` / `--color-accent-foreground` | Identical to `--color-secondary` / `--color-secondary-foreground` | **Drop `--color-accent` and `--color-accent-foreground`** from `@theme`. Migrate the ~7 usages (`bg-accent`, `text-accent-foreground`, `data-[state=open]:bg-accent` in `button.tsx`, `dialog.tsx`, `sidebar.tsx`) to use `secondary` instead. |
| `--color-card-foreground` / `--color-popover-foreground` | Both identical to `--color-foreground` (`#111827`) | Keep for now — shadcn/ui convention expects them. But note they'll always equal `--color-foreground` in this light-only app. |
| `--color-input` | Identical to `--color-border` (`#E5E7EB`) | Keep — semantic distinction is useful (input borders vs. divider borders may diverge). |
| `@custom-variant dark` | Defined but never used — no dark mode styles exist | **Remove.** Dead code. Can re-add if dark mode is ever implemented. |

---

## 4. Component-Level Decisions

### 4a. Button: `ui/button.tsx` vs `premium/primary-button.tsx`

**Keep both.** These are not duplicates — they serve different layers:

- `ui/button.tsx` (13 imports) — Radix-based primitive with variants (`default`, `outline`, `ghost`, `secondary`, `destructive`, `link`). Used for generic interactive buttons throughout the app.
- `premium/primary-button.tsx` exports `PrimaryButton` (54 imports) + `GhostButton` (75 imports) — Styled CTA buttons with the premium gradient treatment. Built on top of the button primitive.

**Action:** None. This is intentional layering.

### 4b. Badge: `ui/badge.tsx` -> delete

| Component | Imports | Action |
|-----------|---------|--------|
| `ui/badge.tsx` | 1 | **Delete.** |
| `premium/status-badge.tsx` | 25 | **Canonical.** |

**Migration:** Find the 1 import of `Badge` from `@/components/ui/badge`, replace with `StatusBadge` from `@/components/premium/status-badge`. Verify the variant prop is compatible (it uses `variant` string, StatusBadge likely needs a `status` prop — check the call site).

### 4c. EmptyState: `ui/empty-state.tsx` -> delete

| Component | Imports | Action |
|-----------|---------|--------|
| `ui/empty-state.tsx` | 1 | **Delete.** |
| `premium/empty-state.tsx` | 18 | **Canonical.** |

**Migration:** Find the 1 import, switch to `@/components/premium/empty-state`. Check prop compatibility.

### 4d. Table: `ui/table.tsx` -> delete

| Component | Imports | Action |
|-----------|---------|--------|
| `ui/table.tsx` | 0 | **Delete immediately.** |
| `premium/data-table.tsx` | 0 (from features) | **Also delete** — confirmed dead in Section 8. |

**Migration:** None — both have 0 feature imports. Just delete both files.

### 4e. Pagination: `ui/pagination.tsx` -> delete

| Component | Imports | Action |
|-----------|---------|--------|
| `ui/pagination.tsx` | 0 | **Delete immediately.** |
| `premium/pagination.tsx` | 14 | **Canonical.** |

**Migration:** None — 0 imports. Delete.

### 4f. PageHeader: `layout/page-header.tsx` — keep for now

| Component | Imports | Action |
|-----------|---------|--------|
| `layout/page-header.tsx` | 6 | **Keep, but evaluate.** |
| `premium/page-header.tsx` | 30 | **Canonical for feature pages.** |

These serve different purposes: the layout PageHeader is a simpler wrapper used in a few admin pages. The premium PageHeader has richer features (breadcrumbs, action slots, status). Migration would require verifying prop compatibility at 6 call sites. **Defer to Phase 4** — low leverage.

### 4g. Dead components -> delete immediately

| File | Imports | Action |
|------|---------|--------|
| `ui/table.tsx` | 0 | Delete |
| `ui/pagination.tsx` | 0 | Delete |
| `ui/stepper.tsx` | 0 | Delete |
| `ui/segmented-control.tsx` | 0 | Delete |
| `ui/separator.tsx` | 0 | Delete |
| `premium/data-table.tsx` | 0 (from features) | Delete |

**6 files, 0 risk.** Delete in a single commit.

---

## 5. Final Proposed `@theme` Block

```css
@import "tailwindcss";

@theme {
  /* -- Surfaces --------------------------------------------------- */
  --color-background:          #F6F7F9;
  --color-foreground:          #111827;   /* unchanged — keep current value */
  --color-card:                #FFFFFF;
  --color-card-foreground:     #111827;
  --color-popover:             #FFFFFF;
  --color-popover-foreground:  #111827;

  /* -- Brand / Primary -------------------------------------------- */
  --color-primary:             oklch(0.205 0.042 265.755);
  --color-primary-foreground:  #FFFFFF;

  /* -- Secondary / Muted ------------------------------------------ */
  --color-secondary:             #F3F4F6;
  --color-secondary-foreground:  #374151;  /* unchanged — keep current value */
  --color-muted:                 #F9FAFB;  /* unchanged — keep current value */
  --color-muted-foreground:      #6B7280;  /* unchanged — keep current value */

  /* NOTE: --color-accent removed (was identical to secondary) */

  /* -- Semantic --------------------------------------------------- */
  --color-destructive:             #B42318;
  --color-destructive-foreground:  #FFFFFF;

  /* -- Borders / Inputs ------------------------------------------- */
  --color-border:  #E5E7EB;
  --color-input:   #E5E7EB;
  --color-ring:    oklch(0.205 0.042 265.755);

  /* -- Status tones ----------------------------------------------- */
  --color-tone-success-bg:      theme(colors.emerald.50);
  --color-tone-success-text:    theme(colors.emerald.700);
  --color-tone-success-border:  theme(colors.emerald.200);

  --color-tone-warning-bg:      theme(colors.amber.50);
  --color-tone-warning-text:    theme(colors.amber.700);
  --color-tone-warning-border:  theme(colors.amber.200);

  --color-tone-danger-bg:       theme(colors.red.50);
  --color-tone-danger-text:     theme(colors.red.700);
  --color-tone-danger-border:   theme(colors.red.200);

  --color-tone-info-bg:         theme(colors.blue.50);
  --color-tone-info-text:       theme(colors.blue.700);
  --color-tone-info-border:     theme(colors.blue.200);

  --color-tone-accent-bg:       theme(colors.violet.50);
  --color-tone-accent-text:     theme(colors.violet.700);
  --color-tone-accent-border:   theme(colors.violet.200);

  --color-tone-neutral-bg:      theme(colors.zinc.100);
  --color-tone-neutral-text:    theme(colors.zinc.600);
  --color-tone-neutral-border:  theme(colors.zinc.200);

  /* -- Charts ----------------------------------------------------- */
  --color-chart-1:  oklch(0.646 0.222 41.116);  /* Orange */
  --color-chart-2:  oklch(0.6 0.118 184.714);   /* Cyan */
  --color-chart-3:  oklch(0.398 0.07 227.392);  /* Dark blue */
  --color-chart-4:  oklch(0.828 0.189 84.429);  /* Gold */
  --color-chart-5:  oklch(0.769 0.188 70.08);   /* Orange-gold */

  /* -- Sidebar ---------------------------------------------------- */
  --color-sidebar:                   #111318;
  --color-sidebar-foreground:        #E5E7EB;
  --color-sidebar-primary:           #FFFFFF;
  --color-sidebar-primary-foreground:#111318;
  --color-sidebar-border:            #1E2229;
  --color-sidebar-ring:              #71717a;  /* zinc-500 */
  --color-sidebar-muted:             #6B7280;  /* unchanged */
  --color-sidebar-inactive:          oklch(0.72 0 0);   /* NEW: nav item inactive text */
  --color-sidebar-badge:             oklch(0.577 0.245 27.325); /* NEW: notification badge orange */

  /* NOTE: --color-sidebar-accent removed (was identical to sidebar-primary) */

  /* -- Radius ----------------------------------------------------- */
  --radius-sm:  0.375rem;  /* 6px  */
  --radius-md:  0.5rem;    /* 8px  */
  --radius-lg:  0.75rem;   /* 12px */
  --radius-xl:  1rem;      /* 16px */

  /* -- Typography ------------------------------------------------- */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

  /* -- Type scale (8 sizes + line-heights) ------------------------ */
  --text-micro:                0.625rem;   /* 10px */
  --text-micro--line-height:   1.4;
  --text-caption:              0.6875rem;  /* 11px */
  --text-caption--line-height: 1.4;
  --text-label:                0.75rem;    /* 12px */
  --text-label--line-height:   1.5;
  --text-body:                 0.8125rem;  /* 13px */
  --text-body--line-height:    1.55;
  --text-body-lg:              0.875rem;   /* 14px */
  --text-body-lg--line-height: 1.55;
  --text-heading-sm:           1rem;       /* 16px */
  --text-heading-sm--line-height: 1.4;
  --text-heading:              1.25rem;    /* 20px */
  --text-heading--line-height: 1.3;
  --text-display:              1.75rem;    /* 28px */
  --text-display--line-height: 1.2;

  /* -- Shadows ---------------------------------------------------- */
  --shadow-xs:           0 1px 2px rgba(0,0,0,0.04);
  --shadow-card:         0 1px 3px rgba(0,0,0,0.04);
  --shadow-card-hover:   0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
  --shadow-card-raised:  0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.05);
  --shadow-popover:      0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
  --shadow-modal:        0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-focus:        0 0 0 3px rgba(0,0,0,0.06);
  --shadow-up:           0 -4px 16px rgba(0,0,0,0.04);
}
```

**Changes from current `@theme`:**
- `--color-foreground` — **unchanged** (stays `#111827`)
- `--color-secondary-foreground` — **unchanged** (stays `#374151`)
- `--color-muted` — **unchanged** (stays `#F9FAFB`)
- `--color-muted-foreground` — **unchanged** (stays `#6B7280`)
- `--color-sidebar-ring` aligned to `#71717a` (zinc-500)
- **Removed:** `--color-accent`, `--color-accent-foreground`, `--color-sidebar-accent`, `--color-sidebar-accent-foreground`
- **Added:** `--color-sidebar-inactive`, `--color-sidebar-badge`
- **Added:** 18 `--color-tone-*` tokens (6 tones x 3 properties)
- **Added:** 8 `--text-*` tokens with line-heights
- **Added:** 8 `--shadow-*` tokens (including `shadow-card-raised`)

---

## 6. Migration Effort Estimate

| # | Migration | Files | Instances | Complexity | Notes |
|---|-----------|-------|-----------|------------|-------|
| A | Delete dead components | 6 | 0 imports | **Low** | Delete 6 files, zero code changes elsewhere. 5 min. |
| B | Slate -> zinc | 3 | 7 | **Low** | Find-replace 7 class names. 10 min. |
| C | Green -> emerald | 1 | 10 | **Low** | Find-replace 10 class names in 1 file. 5 min. |
| D | Delete duplicate components (badge, empty-state) | 4 | 2 imports to rewire | **Low** | Delete 2 files, update 2 import sites. 15 min. |
| E | Remove `--color-accent` tokens | 4 | ~7 | **Low** | Replace `accent` -> `secondary` in button.tsx, dialog.tsx, sidebar.tsx. 15 min. |
| F | Shadow migration | ~25 | ~96 | **Medium** | Add tokens to `@theme`, then find-replace arbitrary shadow classes. Most replacements are mechanical but need visual verification that the new token looks right. The Surface and Card components handle ~40 instances alone. |
| G | Near-black consolidation | ~6 | ~15 | **Medium** | Update 2-3 bg-[#xxx] classes to use semantic tokens. Must verify login page and supplier dark table look correct. No `@theme` value changes needed (keeping current values). |
| H | Off-white consolidation | 3 | ~8 | **Low** | The bg-[#F6F7F9] in app-layout and sticky-footer become `bg-background`. Login gradient stays. No `@theme` value changes needed. |
| J | Status-tone token migration | ~8 | ~60 | **Medium** | Add tone tokens to `@theme`, then find-replace inline color class clusters (e.g. `bg-amber-50 text-amber-700` -> `bg-tone-warning-bg text-tone-warning-text`). Structurally identical to shadow migration. Does NOT change component structure or JSX — purely CSS class swaps. |
| K | Type scale migration | 47 | 938 | **High** | Largest migration. Add tokens to `@theme`, then systematically replace across all 47 files. Recommend doing it in batches: (1) components/premium + components/ui first, (2) then features/* pages. Each file needs a visual spot-check. |

### Leverage ranking (chaos eliminated per unit of effort)

| Rank | Migration | Effort | Chaos eliminated | Leverage |
|------|-----------|--------|-----------------|----------|
| 1 | **A. Delete dead components** | 5 min | 6 dead files gone | Highest — instant cleanup |
| 2 | **B+C. Slate->zinc + Green->emerald** | 15 min | 2 competing color families eliminated | Very high — tiny effort, removes ambiguity |
| 3 | **F. Shadow tokens** | 1-2 hrs | 25 arbitrary values -> 8 tokens, 96+ instances normalized | High — second-largest source of inline chaos |
| 4 | **J. Status-tone tokens** | 1-2 hrs | ~10 color cluster patterns -> 6 tone tokens, ~60 instances normalized, inconsistencies fixed | High — eliminates a category of semantic bugs (conflicting color meanings) |
| 5 | **E. Remove accent tokens** | 15 min | Duplicate design tokens eliminated | High — prevents future confusion |
| 6 | **D. Delete duplicate components** | 15 min | 2 nearly-dead components removed | Medium-high |
| 7 | **G+H. Near-black + off-white consolidation** | 30 min | 13 near-identical colors -> 5 tokens | Medium — mostly class replacements, no @theme value changes |
| 8 | **K. Type scale migration** | 3-5 hrs | 869 arbitrary sizes -> 8 tokens | Medium — highest absolute impact but also highest effort. Best done last when tokens are stable. |

### Recommended execution order

1. **Phase 3a** (15 min): A + B + C + D + E — delete dead code, fix color families, remove accent dupes
2. **Phase 3b** (2-3 hrs): F + J + G + H — shadow tokens, status-tone tokens, and color consolidation
3. **Phase 3c** (3-5 hrs): K — type scale migration (the big one)

Each phase produces a clean, committable state. Phase 3a can ship today. Phase 3b needs visual QA on shadows and status pills. Phase 3c needs per-page spot-checks.

---

## 7. Status-Tone Color System

### 7a. The problem

Status pill colors are implemented inline across 8+ feature files, plus a `StatusBadge` component that defines its own tone system. There is no single source of truth for "what color means what status." This leads to inconsistencies:

- Priority "medium" maps to `neutral` (gray) in `StatusBadge.prPriorityTone()` and `pr-list-page.tsx`, but to `blue` in `approvals-page.tsx` and `pr-detail-page.tsx`
- Each feature page picks its own colors for the same semantic concept (e.g., "approved" is sometimes emerald-600, sometimes green-700)
- `StatusBadge` internally collapses 12 named tones to 6 actual color sets, but the mapping is undocumented
- `pr-detail-page.tsx` uses `indigo-50/indigo-700` for level3_review and `violet-50/violet-700` for pending_quotation/quoted, while every other file uses `blue-50/blue-700` for all of these
- `amber-800` vs `amber-700` for warning text is inconsistent across files

### 7b. Proposed canonical tones (6)

| Tone | Semantic meaning | bg | text | border | Current sources |
|------|-----------------|-----|------|--------|-----------------|
| `success` | Approved, active, completed, received | `emerald-50` | `emerald-700` | `emerald-200` | StatusBadge emerald, inline green-50/green-700 |
| `warning` | Pending, in-review, needs attention | `amber-50` | `amber-700` | `amber-200` | StatusBadge amber, inline amber-50/amber-700/amber-800 |
| `danger` | Rejected, cancelled, overdue, inactive | `red-50` | `red-700` | `red-200` | StatusBadge red, inline red-50/red-600/red-700 |
| `info` | In-progress, quotation, procurement stages | `blue-50` | `blue-700` | `blue-200` | StatusBadge blue/indigo/violet (collapsed) |
| `accent` | Draft, returned, special attention | `violet-50` | `violet-700` | `violet-200` | StatusBadge violet (currently collapsed to blue) |
| `neutral` | Default, unknown, n/a | `zinc-100` | `zinc-600` | `zinc-200` | StatusBadge neutral, inline zinc/gray |

### 7c. PR status -> tone mapping (canonical)

| PR Status | Tone | Rationale |
|-----------|------|-----------|
| `draft` | `neutral` | Not yet submitted — no urgency |
| `level1_review` | `warning` | Awaiting action |
| `level2_review` | `warning` | Awaiting action |
| `level3_review` | `warning` | Awaiting action |
| `pending_quotation` | `info` | In procurement pipeline |
| `quoted` | `info` | In procurement pipeline |
| `returned` | `accent` | Returned for revision — distinct from pending |
| `returned_for_info` | `accent` | Returned for clarification |
| `approved` | `success` | Terminal positive |
| `rejected` | `danger` | Terminal negative |
| `cancelled` | `danger` | Terminal negative |

### 7d. PR priority -> tone mapping (canonical)

| Priority | Tone | Rationale |
|----------|------|-----------|
| `low` | `neutral` | No urgency signal |
| `medium` | **`warning`** | Moderate attention — resolves the inconsistency (was `neutral` in some places, `blue` in others) |
| `high` | `danger` | High urgency |
| `urgent` | `danger` | Highest urgency |

### 7e. PO status -> tone mapping (canonical)

| PO Status | Tone | Rationale |
|-----------|------|-----------|
| `pending` | `warning` | Awaiting action |
| `ordered` | `info` | In progress |
| `partially_received` | `info` | In progress |
| `received` | `success` | Complete |
| `cancelled` | `danger` | Terminal negative |

### 7f. Phase 3 scope: Tone token definition + inline class migration

This phase adds the 6 tone tokens to `@theme` (see Section 5) and migrates inline color class clusters to use tone-token classes. This is a pure CSS class find-and-replace — no JSX structure changes, no component refactoring.

**Inline class migration map:**

Each row shows the current inline class cluster and its replacement using tone-token classes.

| Current inline classes | Replacement | Tone | Files affected |
|----------------------|-------------|------|---------------|
| `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-tone-success-bg text-tone-success-text border-tone-success-border` | success | pr-list, po-list, procurement-queue, dashboard |
| `bg-emerald-50 text-emerald-700 border-emerald-100` | `bg-tone-success-bg text-tone-success-text border-tone-success-border` | success | procurement-workspace |
| `bg-emerald-50 text-emerald-700` (borderless) | `bg-tone-success-bg text-tone-success-text` | success | pr-detail, po-detail, dashboard |
| `bg-emerald-50/70 text-emerald-700` (muted) | `bg-tone-success-bg/70 text-tone-success-text` | success | procurement-workspace |
| `bg-amber-50 text-amber-800 border-amber-200` | `bg-tone-warning-bg text-tone-warning-text border-tone-warning-border` | warning | pr-list, po-list, procurement-queue |
| `bg-amber-50 text-amber-700 border-amber-200` | `bg-tone-warning-bg text-tone-warning-text border-tone-warning-border` | warning | dashboard |
| `bg-amber-50 text-amber-700 border-amber-100` | `bg-tone-warning-bg text-tone-warning-text border-tone-warning-border` | warning | procurement-workspace |
| `bg-amber-50 text-amber-700` (borderless) | `bg-tone-warning-bg text-tone-warning-text` | warning | pr-detail, approvals |
| `bg-amber-50/70 text-amber-800` (muted) | `bg-tone-warning-bg/70 text-tone-warning-text` | warning | pr-list, procurement-queue |
| `bg-red-50 text-red-700 border-red-200` | `bg-tone-danger-bg text-tone-danger-text border-tone-danger-border` | danger | pr-list, po-list |
| `bg-red-50 text-red-600 border-red-100` | `bg-tone-danger-bg text-tone-danger-text border-tone-danger-border` | danger | procurement-workspace |
| `bg-red-50 text-red-600` (borderless) | `bg-tone-danger-bg text-tone-danger-text` | danger | pr-detail, approvals |
| `bg-red-50/70 text-red-700` (muted) | `bg-tone-danger-bg/70 text-tone-danger-text` | danger | pr-list, procurement-queue |
| `bg-blue-50 text-blue-700 border-blue-200` | `bg-tone-info-bg text-tone-info-text border-tone-info-border` | info | pr-list, po-list, procurement-queue |
| `bg-blue-50 text-blue-700 border-blue-100` | `bg-tone-info-bg text-tone-info-text border-tone-info-border` | info | procurement-workspace |
| `bg-blue-50 text-blue-700` (borderless) | `bg-tone-info-bg text-tone-info-text` | info | pr-detail |
| `bg-blue-50 text-blue-600` (borderless) | `bg-tone-info-bg text-tone-info-text` | info | approvals (medium priority) |
| `bg-indigo-50 text-indigo-700` | `bg-tone-info-bg text-tone-info-text` | info | pr-detail (level3_review — **inconsistency fixed**) |
| `bg-violet-50 text-violet-700` | `bg-tone-info-bg text-tone-info-text` | info | pr-detail (pending_quotation, quoted — **inconsistency fixed**), po-list (active value pill), dashboard |
| `bg-zinc-100 text-zinc-600` | `bg-tone-neutral-bg text-tone-neutral-text` | neutral | pr-detail (draft) |
| `bg-zinc-100 text-zinc-500` | `bg-tone-neutral-bg text-tone-neutral-text` | neutral | pr-detail (cancelled), approvals (low priority) |
| `bg-zinc-50 text-zinc-700 border-zinc-200` | `bg-tone-neutral-bg text-tone-neutral-text border-tone-neutral-border` | neutral | pr-list (draft) |
| `bg-zinc-50 text-zinc-500` (muted) | `bg-tone-neutral-bg text-tone-neutral-text` | neutral | pr-list, procurement-queue (low priority) |
| `bg-zinc-50 text-zinc-700` (muted) | `bg-tone-neutral-bg text-tone-neutral-text` | neutral | pr-list, procurement-queue (medium priority) |

**Inconsistencies resolved by this migration:**
1. `amber-800` vs `amber-700` text -> all become `tone-warning-text` (= `amber-700`)
2. `red-600` vs `red-700` text -> all become `tone-danger-text` (= `red-700`)
3. `indigo-50/indigo-700` in pr-detail -> becomes `tone-info-*` (= `blue-50/blue-700`)
4. `violet-50/violet-700` in pr-detail/dashboard -> becomes `tone-info-*` (= `blue-50/blue-700`)
5. `zinc-600` vs `zinc-500` vs `zinc-700` for neutral text -> all become `tone-neutral-text` (= `zinc-600`)

**What this does NOT touch (deferred to Phase 4):**
- The `StatusBadge` component's internal tone definitions (it keeps its own color maps for now)
- The inline status maps in each feature page remain as JS objects — only their CSS class values change
- No JSX elements are replaced with `<StatusBadge>` — that's component consolidation, not tokenization

**Effort:** ~1-2 hours. Add 18 tone tokens to `@theme`, then find-replace ~60 inline class clusters across 8 files. Each file needs a visual spot-check to confirm the color normalization looks right (especially the indigo/violet->blue shifts in pr-detail and dashboard).

### 7g. Phase 4 scope: StatusBadge refactor + inline pill consolidation (deferred)

The following work belongs to a future component-consolidation phase. It is documented here for planning but is **out of scope for Phase 3**.

**Phase 4a — StatusBadge refactor (~1 hour):**
- Collapse `StatusBadge`'s 12 internal tone aliases (`neutral`, `gray`, `info`, `blue`, `indigo`, `violet`, `success`, `emerald`, `warn`, `amber`, `danger`, `red`) to the 6 canonical tones (`success`, `warning`, `danger`, `info`, `accent`, `neutral`)
- Update internal color maps to reference the tone CSS custom properties instead of hardcoded Tailwind classes
- Export canonical mapping functions: `prStatusTone()`, `prPriorityTone()`, `poStatusTone()` as the single source of truth

**Phase 4b — Inline pill replacement (~2-3 hours):**
- Replace the inline status-map JS objects in each feature page with calls to the exported mapping functions
- Replace inline `<span className={...}>` status pills with `<StatusBadge tone={prStatusTone(status)}>` component calls
- Files to migrate: `pr-list-page.tsx`, `pr-detail-page.tsx`, `po-list-page.tsx`, `approvals-page.tsx`, `procurement-queue-page.tsx`, `procurement-workspace-page.tsx`, `dashboard-page.tsx`
- `po-detail-page.tsx` already uses `StatusBadge` correctly — no changes needed

**Phase 4 total effort:** ~3-4 hours with visual QA.

**Why defer:** Phase 4 changes JSX structure (replacing inline spans with component calls), modifies imports, and touches component APIs. This is fundamentally different from the Phase 3 token migrations which are pure CSS class find-and-replace. Mixing the two creates a harder-to-review diff and increases regression risk.

---

## 8. DataTable Density Audit

### 8a. Finding: DataTable is dead code

`premium/data-table.tsx` is exported from `premium/index.ts` but has **zero imports from any feature page**. All 14 table views in the app build their own inline `<table>` elements.

**Evidence:**

```
grep -r "data-table" --include="*.tsx" apps/web/src/features/  ->  0 results
grep -r "DataTable" --include="*.tsx" apps/web/src/features/   ->  0 results
```

The component exists in the premium library but was never adopted. Every feature page that renders a table does so with its own inline markup, its own column definitions, and its own styling.

### 8b. Current inline table density (survey)

Since there's no shared DataTable component, each table defines its own cell padding and text sizes. Here's the actual density across the 14 table views:

| Page | Header text | Cell padding | Cell text | Row height (approx) |
|------|------------|-------------|-----------|---------------------|
| `users-list-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |
| `departments-list-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |
| `suppliers-list-page.tsx` | `text-[11px]` | `px-5 py-3` | `text-[13px]` | ~48px |
| `pr-list-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |
| `po-list-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |
| `approvals-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |
| `procurement-queue-page.tsx` | `text-[11px]` | `px-5 py-3.5` | `text-[13px]` | ~52px |
| `reports-page.tsx` | `text-[11px]` | `px-4 py-3` | `text-[13px]` | ~48px |
| `pr-detail-page.tsx` (items) | `text-[11px]` | `px-4 py-3` | `text-[13px]` | ~48px |
| `po-detail-page.tsx` (items) | `text-[11px]` | `px-4 py-3` | `text-[13px]` | ~48px |
| `department-detail-page.tsx` | `text-[11px]` | `px-5 py-3` | `text-[13px]` | ~48px |
| `procurement-workspace-page.tsx` (canvass) | `text-[11px]` | `px-4 py-3` | `text-[12px]` | ~44px |
| `procurement-workspace-page.tsx` (items) | `text-[11px]` | `px-4 py-3` | `text-[13px]` | ~48px |
| `search-page.tsx` | `text-[11px]` | `px-5 py-4` | `text-[13px]` | ~56px |

### 8c. Density observations

1. **Header text is perfectly consistent:** All 14 tables use `text-[11px]` for headers. After migration: `text-caption`.
2. **Cell text is nearly consistent:** 13/14 use `text-[13px]`, 1 uses `text-[12px]` (canvass table — denser because it has many columns). After migration: `text-body` (and `text-label` for the canvass table).
3. **Cell padding varies between two patterns:**
   - **Default density** (`px-5 py-4`): list pages with fewer columns — users, departments, PRs, POs, approvals, search
   - **Compact density** (`px-4 py-3` or `px-5 py-3`): detail sub-tables and data-heavy pages — suppliers, reports, PR items, PO items, procurement

### 8d. Recommendation

**Do NOT create a density prop on a shared DataTable.** The current inline tables work fine and the density split is natural (list pages are spacious, detail sub-tables are compact). Instead:

1. **Delete `premium/data-table.tsx`** — it's dead code with 0 imports. Included in Phase 3a delete list (Section 4g).
2. **Standardize padding during type-scale migration (Phase 3c):** When touching each table file for font-size tokens, also normalize the padding to one of two patterns:
   - Default: `px-5 py-4` (keep for list pages)
   - Compact: `px-4 py-3` (keep for detail/dense pages)
3. **Defer table componentization** to a future phase. Extracting a shared DataTable is a much larger task (column definitions, sorting, selection, pagination integration) that doesn't belong in the design-token migration.

---

## 9. Visual-Primitive Risk Audit

### 9a. Purpose

For each high-use premium/UI component, predict the visual impact of applying the proposed design tokens. This lets us flag components that need extra QA attention during migration.

### 9b. Risk assessment per component

#### Surface (`premium/surface.tsx`) — 15+ imports

**Current inline values:**
- Border: `border-zinc-200/80`
- Background: `bg-white`
- Radius: `rounded-xl`
- Elevation map: flat=none, subtle=`shadow-[0_1px_3px_rgba(0,0,0,0.04)]`, default=`shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]`, raised=`shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.05)]`

**After migration:**
- subtle -> `shadow-card`
- default -> `shadow-card-hover`
- raised -> `shadow-card-raised`

**Risk: LOW.** Shadow token values are almost identical to current inline values. The raised elevation shifts slightly (outer shadow `0 2px 6px 0.06` -> `0 2px 8px 0.04` — marginally softer spread, lower opacity). Visually indistinguishable. No font sizes in this component.

---

#### FormField (`premium/form-field.tsx`) — 20+ imports

**Current inline values:**
- Label: `text-[12px] font-semibold text-zinc-700`
- Error: `text-[12px] text-red-600`
- Help text: `text-[11px] text-zinc-400 leading-relaxed`
- Textarea class: `text-[13px]`, focus shadow `shadow-[0_0_0_3px_rgba(0,0,0,0.06)]`

**After migration:**
- Label: `text-label font-semibold text-zinc-700` (12px, no change)
- Error: `text-label text-red-600` (12px, no change)
- Help: `text-caption text-zinc-400` (11px, no change — but gains `line-height: 1.4` from token; currently has `leading-relaxed` = 1.625)
- Textarea: `text-body` (13px, no change), focus `shadow-focus`

**Risk: LOW-MEDIUM.** The help text line-height changes from `leading-relaxed` (1.625) to the token default (1.4). This will tighten help text slightly. Decision: keep `leading-relaxed` as an override on help text, or accept the tighter spacing. Flag for visual QA.

---

#### PrimaryButton + GhostButton (`premium/primary-button.tsx`) — 129 combined imports

**Current inline values:**
- PrimaryButton: `rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-white`, uses `premium-primary-btn` CSS class for gradient
- GhostButton: `rounded-[10px] px-4 py-2 text-[13px] font-medium text-zinc-700 border border-zinc-200 bg-white`

**After migration:**
- Both: `text-body` (13px, no change)
- `rounded-[10px]` stays inline — it's between `radius-md` (8px) and `radius-lg` (12px), intentionally distinct

**Risk: LOW.** Only font-size changes, and the value stays the same. The `rounded-[10px]` intentionally doesn't map to a radius token — it's the button's signature rounding.

---

#### StatusBadge (`premium/status-badge.tsx`) — 25 imports

**Current inline values:**
- Height: `h-[22px]`
- Text: `text-[11px] font-semibold`
- 12 tone aliases collapsing to 6 color sets

**After migration:**
- Text: `text-caption` (11px, no change)
- Height stays inline (`h-[22px]` — not a type-scale concern)
- Colors: unchanged in Phase 3 (refactored in Phase 4, see Section 7g)

**Risk: LOW.** Font size is exact match. Color refactor is deferred to Phase 4 with its own QA.

---

#### PageHeader (`premium/page-header.tsx`) — 30 imports

**Current inline values:**
- Title: `text-[28px] font-bold tracking-[-0.01em] leading-tight text-zinc-900`
- Description: `text-[14px] text-zinc-500`
- MetricPill: `text-[11px]` label, `text-[16px]` value

**After migration:**
- Title: `text-display font-bold` (28px, gains `line-height: 1.2` from token; currently `leading-tight` = 1.25)
- Description: `text-body-lg text-zinc-500` (14px, no change)
- MetricPill label: `text-caption` (11px), value: `text-heading-sm` (16px)

**Risk: LOW.** Line-height on title shifts from 1.25 to 1.2 — titles are typically single-line so this is invisible. The custom tracking (`-0.01em`) stays as an override.

---

#### EmptyState (`premium/empty-state.tsx`) — 18 imports

**Current inline values:**
- Title: `text-[16px] font-semibold text-zinc-900`
- Description: `text-[13px] text-zinc-500`
- 5 icon tones: neutral, success, warn, info, danger

**After migration:**
- Title: `text-heading-sm` (16px, no change)
- Description: `text-body` (13px, no change)

**Risk: LOW.** Exact size matches. Icon tones are color-only and align with the status-tone system.

---

#### Pagination (`premium/pagination.tsx`) — 14 imports

**Current inline values:**
- All text: `text-[12px]`
- Active page: `bg-zinc-900 text-white shadow-sm`
- Per-page select focus: `shadow-[0_0_0_3px_rgba(0,0,0,0.06)]`

**After migration:**
- Text: `text-label` (12px, no change)
- Active shadow: `shadow-xs` (replacing `shadow-sm`)
- Focus: `shadow-focus`

**Risk: LOW.** Font size exact match. Shadow changes are subtle (shadow-sm -> shadow-xs is nearly identical visually).

---

#### Input (`ui/input.tsx`) — 20+ imports

**Current inline values:**
- Text: `text-[13px]`
- Resting shadow: `shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
- Focus: `shadow-[0_0_0_3px_rgba(0,0,0,0.06)]`

**After migration:**
- Text: `text-body` (13px, no change)
- Resting: `shadow-xs`
- Focus: `shadow-focus`

**Risk: LOW.** All values are exact matches to proposed tokens.

---

#### Dialog (`ui/dialog.tsx`) — 15+ imports

**Current inline values:**
- Uses `shadow-lg` (Tailwind default)
- Close button: `bg-accent` (being removed -> `bg-secondary`)
- Title: `text-lg` -> `text-heading-sm` (16px, exact match)
- Description: `text-sm text-muted-foreground` -> `text-body-lg text-muted-foreground` (14px, exact match)

**After migration:**
- Shadow: `shadow-lg` -> `shadow-modal`
- `bg-accent` -> `bg-secondary` (same value — accent was identical to secondary)
- Title and description font sizes stay the same

**Risk: LOW.** Shadow changes from Tailwind `shadow-lg` to the larger `shadow-modal` — this is intentionally a more dramatic shadow for modal overlays. The accent->secondary swap is invisible (same values).

---

#### Skeleton (`ui/skeleton.tsx`) — 10+ imports

**Current:** `animate-pulse rounded-md bg-muted`

**After migration:** No change. Uses semantic token `bg-muted` which we're keeping at `#F9FAFB`.

**Risk: NONE.**

---

#### GuidedStepper (`features/purchase-requests/form/guided-stepper.tsx`) — 1 import (PR form only)

**Current inline values:**
- Step number: `text-[15px]` (desktop), `text-[10px]` (mobile dot)
- Step label: `text-[13px]` (desktop)
- Active ring: `shadow-[0_0_0_4px_rgba(24,24,27,0.08)]`
- Progress text: `text-[14px]`

**After migration:**
- Step number: `text-body-lg` (14px, -1px), mobile dot: `text-micro` (10px, no change)
- Step label: `text-body` (13px, no change)
- Active ring: `shadow-focus` (`0 0 0 3px rgba(0,0,0,0.06)` — slightly thinner ring, slightly lower opacity)
- Progress text: `text-body-lg` (14px, no change)

**Risk: LOW-MEDIUM.** The step number shrinks 1px (15->14) and the focus ring changes from 4px/0.08 to 3px/0.06. Both are minor but this component has intricate layout on mobile. Flag for mobile QA on the PR form.

### 9c. Stepper deletion confirmation

| File | Imports | Notes |
|------|---------|-------|
| `ui/stepper.tsx` | 0 | Generic shadcn/ui stepper — uses `bg-primary`, `text-primary-foreground`. Never imported. |
| `features/purchase-requests/form/guided-stepper.tsx` | 1 (from PR form page) | Canonical stepper with mobile-responsive design, progress bar, animated transitions. |

**Verdict:** `ui/stepper.tsx` is confirmed dead. It uses completely different patterns from the canonical `GuidedStepper` (generic shadcn tokens vs. custom inline styling). Safe to delete in Phase 3a with the other dead components.

### 9d. Risk summary

| Risk Level | Components | QA Priority |
|------------|-----------|-------------|
| **NONE** | Skeleton | Skip — no changes |
| **LOW** | Surface, PrimaryButton, GhostButton, StatusBadge, EmptyState, Pagination, Input, Dialog, PageHeader | Normal spot-check per component |
| **LOW-MEDIUM** | FormField (help text line-height), GuidedStepper (step number size, focus ring) | Extra QA on: (1) any form with help text visible, (2) PR form stepper on mobile |

No components are HIGH risk. The proposed tokens are conservative — they match current values closely and the few shifts (1px font size, slightly different shadow spread) are within the threshold of "nobody will notice."
