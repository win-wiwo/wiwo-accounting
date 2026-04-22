---
name: debug-blank-page
description: Diagnose a completely blank React page in the PRAMS frontend — no sidebar, no header, no content. Covers the most common causes found in this codebase.
allowed_tools: ["Bash", "Read", "Grep"]
---

# Debug: Blank Page in PRAMS Frontend

Use this skill when the browser shows a white/blank page at any route, especially when the sidebar and header are also missing.

## Why the Whole Page Goes Blank

There are no React error boundaries in this app. An unhandled error thrown during render propagates all the way up and unmounts the entire tree — sidebar, header, and content all disappear. The network tab may still show requests because hooks set up queries before the render function throws.

---

## Step 1 — Check the Browser Console

Open DevTools → Console tab. Look for a red error. The error message tells you exactly what threw and from which file/line. This is always the first step.

If you cannot access the browser, proceed to Step 2.

---

## Step 2 — Search for Empty String SelectItem Values

This is the most common silent crash in this codebase.

```bash
grep -rn 'SelectItem.*value=""' apps/web/src/
grep -rn 'value=""' apps/web/src/features/
```

Radix UI v2 (`@radix-ui/react-select ^2.1.0`) throws a runtime error when any `SelectItem` has `value=""`. It uses empty string internally as its "no value" sentinel.

**Fix pattern:**
```tsx
// BROKEN — crashes silently
<Select value={filter} onValueChange={setFilter}>
  <SelectItem value="">All</SelectItem>

// FIXED — use a named sentinel, convert in handler
<Select value={filter || 'all'} onValueChange={(v) => setFilter(v === 'all' ? '' : v)}>
  <SelectItem value="all">All</SelectItem>
```

Apply this fix everywhere a filter Select needs an "all/none" option.

---

## Step 3 — Check All Imports on the Affected Page

A missing named export causes a runtime ReferenceError.

```bash
# For the page that's blank, e.g. projects-page.tsx:
grep "^import" apps/web/src/features/projects/projects-page.tsx
```

For each import, verify the exported name exists:
```bash
grep -n "export.*Badge\|export.*EmptyState\|export.*PageHeader" \
  apps/web/src/components/ui/badge.tsx \
  apps/web/src/components/ui/empty-state.tsx \
  apps/web/src/components/layout/page-header.tsx
```

---

## Step 4 — Check the Route's ProtectedRoute Roles

If the logged-in user's role is not in `allowedRoles`, `ProtectedRoute` redirects to `/403`. That wouldn't cause a blank page, but if `/403` itself has a render error, the result is blank.

```bash
grep -A4 'path="/THE-ROUTE"' apps/web/src/App.tsx
```

Verify the logged-in user has one of the listed roles.

---

## Step 5 — Check Hooks in Sidebar and Header

The `Sidebar` and `Header` are part of `AppLayout`. If any hook inside them throws, the whole layout disappears.

Sidebar uses: `usePendingCount()`, `useAuthStore()`, `useLocation()`
Header uses: `useUnreadCount()`, `useNotifications()`, `usePurchaseRequests()`, `useAuthStore()`

```bash
# Check for any undefined access that could throw
grep -n "user\." apps/web/src/components/layout/header.tsx | head -20
grep -n "user\." apps/web/src/components/layout/sidebar.tsx | head -20
```

Look for `user.something` without optional chaining (`user?.something`) where `user` could be null.

---

## Step 6 — Check the API is Actually Running

Some hooks call the API on mount. If the API returns an error response, React Query catches it gracefully — but if the API throws something unexpected (like a JSON parse error), Axios may throw in a way that propagates.

```bash
docker logs prams-api --tail 20
curl -s http://localhost:3000/api/projects | head -c 200
```

Expected: JSON. If you see connection refused or HTML, the API has a problem — switch to the `debug-api-down` skill.

---

## Verification

After fixing, confirm:
1. Browser console shows no red errors
2. Sidebar and header are visible
3. The page content renders (loading skeletons or data)
4. No `SelectItem` with `value=""` in the fixed file
