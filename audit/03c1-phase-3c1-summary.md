# Phase 3c-1 Execution Summary

**Date:** 2026-05-03
**Branch:** `staging` (working tree, not yet committed)
**Base:** `staging` (commit `db9b4e2`)

---

## Tasks Completed

### Step 1: Type scale tokens added to @theme (8 tokens, 16 lines)

Added to `apps/web/src/index.css` inside the `@theme` block:

| Token | Size | Line-height |
|-------|------|-------------|
| `--text-micro` | 0.625rem (10px) | 1.4 |
| `--text-caption` | 0.6875rem (11px) | 1.4 |
| `--text-label` | 0.75rem (12px) | 1.5 |
| `--text-body` | 0.8125rem (13px) | 1.55 |
| `--text-body-lg` | 0.875rem (14px) | 1.55 |
| `--text-heading-sm` | 1rem (16px) | 1.4 |
| `--text-heading` | 1.25rem (20px) | 1.3 |
| `--text-display` | 1.75rem (28px) | 1.2 |

Line-heights use the Tailwind v4 `--text-*--line-height` convention and are automatically applied when using the corresponding `text-*` utility.

### Step 2: Typography class migration (75 replacements across 20 files)

**Scope:** `apps/web/src/components/` only (ui/, premium/, layout/, root-level). No features/** touched.

| New token | Replaces | Count |
|-----------|----------|-------|
| `text-micro` | `text-[8px]`, `text-[9px]`, `text-[10px]` | 8 |
| `text-caption` | `text-[11px]` | 10 |
| `text-label` | `text-[12px]`, `text-xs` | 16 |
| `text-body` | `text-[13px]` | 22 |
| `text-body-lg` | `text-[14px]`, `text-sm` | 12 |
| `text-heading-sm` | `text-[16px]`, `text-lg` | 2 |
| `text-heading` | `text-2xl` | 1 |
| `text-display` | `text-[28px]` | 1 |
| **Total** | | **~72** |

### Leading overrides preserved

These explicit `leading-*` classes were kept alongside the new tokens:

| File | Token | Override | Reason |
|------|-------|----------|--------|
| `form-field.tsx` | `text-caption` | `leading-relaxed` | Help text needs extra breathing room |
| `toast.tsx` | `text-body` | `leading-snug` | Toast title is tighter |
| `toast.tsx` | `text-caption` | `leading-relaxed` | Toast description needs breathing room |
| `purchase-request-workflow-timeline.tsx` (compact) | `text-caption` | `leading-snug` | Note text in compact timeline |
| `purchase-request-workflow-timeline.tsx` (normal) | `text-label` | `leading-relaxed` | Note text in normal timeline |
| `dialog.tsx` | `text-heading-sm` | `leading-none` | Dialog title matches Radix convention |
| `label.tsx` | `text-body-lg` | `leading-none` | Label matches Radix convention |
| `page-header.tsx` (premium) | `text-display` | `leading-tight` | Page title with tracking adjustment |

### Items NOT touched (by design)

- `text-[oklch(...)]` values in sidebar.tsx — these are **colors**, not typography
- `.header-search` CSS class in header.tsx — styled via index.css
- `.login-input`, `.login-btn` CSS classes — styled via index.css
- `text-base` in commented-out JSX in sidebar.tsx
- `[&>button]:shadow-[...]` in calendar.tsx — shadow, not typography
- All files under `features/**` — deferred to Phase 3c-2

---

## Files Modified (22 total)

### index.css (1 file)
- Added 8 type-scale tokens (16 lines) to `@theme` block

### Premium components (7 files)
- `form-field.tsx` — 4 replacements (label, error, help, textarea class)
- `page-header.tsx` — 3 replacements (title, description, MetricPill)
- `primary-button.tsx` — 2 replacements (PrimaryButton, GhostButton)
- `pagination.tsx` — 7 replacements (rows label, trigger, page info, prev/next, dots, page buttons)
- `filter-bar.tsx` — 1 replacement (SearchInput)
- `empty-state.tsx` — 2 replacements (title, description)
- `status-badge.tsx` — 1 replacement (badge text)

### UI components (10 files)
- `select.tsx` — 3 replacements (trigger, item, label)
- `dialog.tsx` — 2 replacements (title, description)
- `avatar.tsx` — 1 replacement (fallback)
- `toast.tsx` — 2 replacements (title, description)
- `card.tsx` — 1 replacement (CardDescription)
- `calendar.tsx` — 3 replacements (month caption, weekday header, day button)
- `date-picker.tsx` — 3 replacements (trigger, clear btn, today btn)
- `input.tsx` — 2 replacements (input text, file text)
- `button.tsx` — 2 replacements (base variant, sm size)
- `label.tsx` — 1 replacement (labelVariants)

### Layout components (3 files)
- `page-header.tsx` — 2 replacements (title, description)
- `sidebar.tsx` — 10 replacements (nav links, admin label, badge count, profile, avatar fallback, role label, logout)
- `header.tsx` — 11 replacements (notifications header, search results, notification items, mark-all, empty state, view-all link, unread badge)

### Root-level components (1 file)
- `purchase-request-workflow-timeline.tsx` — 13 replacements (compact cls, normal cls, CurrentState)

### Non-app file (1 file)
- `audit/capture.ts` — updated from previous phase (already in working tree)

---

## Verification

### Step 3: Grep verification

```
# No arbitrary text-[Npx] remaining in components:
grep -r 'text-\[\d+px\]' apps/web/src/components/ → 0 matches

# No text-sm remaining:
grep -r '\btext-sm\b' apps/web/src/components/ → 0 matches

# No text-xs remaining:
grep -r '\btext-xs\b' apps/web/src/components/ → 0 matches

# No text-lg/text-2xl/text-base/text-4xl remaining:
grep -r '\btext-(lg|2xl|base|4xl)\b' apps/web/src/components/ → 1 match (commented-out JSX in sidebar.tsx, OK)
```

### Step 4: Build verification

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | Exit 0 — no errors |
| Build (`npm run build`) | 10 pre-existing TS errors, 0 new errors |
| Lint (`npm run lint`) | 1 pre-existing error + 7 warnings, 0 new issues |

---

## Diff Stat

```
22 files changed, 195 insertions(+), 103 deletions(-)
```

21 component/CSS files + 1 audit file (capture.ts).
