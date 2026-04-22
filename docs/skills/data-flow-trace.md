---
name: data-flow-trace
description: Trace the full data path from MongoDB to the browser in PRAMS — use when data is wrong, missing, or shaped unexpectedly on the frontend. Teaches how to verify each layer.
allowed_tools: ["Bash", "Read", "Grep"]
---

# Data Flow Trace — MongoDB → Browser

Use this skill when the frontend shows wrong data, empty data that should exist, or crashes due to unexpected data shape. Trace each layer in sequence.

---

## The Full Path

```
MongoDB document
  → Mongoose Model (toJSON transform)
  → NestJS Service (returns { data, meta } or raw object)
  → TransformInterceptor (wraps in envelope)
  → HTTP response JSON
  → Axios (api-client.ts, adds r.data)
  → api-services.ts (.then(r => r.data))
  → React Query (stores in cache)
  → Hook (returns { data, isLoading, error })
  → Component (unpacks data?.data)
```

---

## Layer 1 — Verify MongoDB Has the Data

```bash
# Connect to MongoDB and query directly
docker exec -it prams-mongodb mongosh prams --eval \
  'db.projects.find({}, {name:1, status:1}).limit(5).pretty()'

# Check collection names:
docker exec -it prams-mongodb mongosh prams --eval 'db.getCollectionNames()'
```

If the collection is empty or the document doesn't have the expected field, the problem is at data entry (seeding, creation, migration).

---

## Layer 2 — Verify the Schema Stores the Field

If a Mongoose document is missing a field that you added:

```bash
grep -n "fieldName\|@Prop" apps/api/src/modules/xxx/schemas/xxx.schema.ts
```

A TypeScript class field WITHOUT `@Prop()` is **invisible to Mongoose** — TypeScript accepts the property access, but the value is never stored or retrieved.

```typescript
// This field is NOT stored by Mongoose:
class Xxx extends Document {
  projectName: string | null;   // ← missing @Prop()
}

// This IS stored:
@Prop({ type: String, default: null })
projectName: string | null;
```

---

## Layer 3 — Verify toJSON Transform

The `User` schema strips `passwordHash`, `refreshToken`, and `__v` in its `toJSON` transform. The `PurchaseRequest` schema also strips `__v`. If a field is missing from the JSON response but exists in MongoDB, check if the `toJSON` transform is accidentally removing it:

```bash
grep -A20 "toJSON" apps/api/src/modules/xxx/schemas/xxx.schema.ts
```

---

## Layer 4 — Verify the Service Return Shape

The `TransformInterceptor` only unwraps the response envelope correctly if the service returns exactly `{ data: ..., meta: ... }` for list endpoints.

```bash
grep -n "return {" apps/api/src/modules/xxx/xxx.service.ts
```

**List endpoint must return:**
```typescript
return {
  data: items,          // ← key must be "data"
  meta: { total, page, limit, totalPages },  // ← key must be "meta"
};
```

**Single resource must return the object directly:**
```typescript
return item;  // NOT { data: item }
```

If a list endpoint returns `{ items, total }` instead of `{ data, meta }`, the interceptor treats it as a single object and wraps it wrong — the frontend receives `{ success, data: { items, total }, message }`.

---

## Layer 5 — Verify the HTTP Response

Use curl to see the raw response the browser receives:

```bash
# First, get a token by logging in:
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"your-password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])")

# Then test the endpoint:
curl -s http://localhost:3000/api/xxx \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected structure for a list endpoint:
```json
{
  "success": true,
  "data": [ ... array of items ... ],
  "message": "Success",
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## Layer 6 — Verify api-services.ts Unpacking

```bash
grep -A5 "xxxApi" apps/web/src/lib/api-services.ts
```

The `.then((r) => r.data)` extracts the response body from Axios. After this, the value is the full envelope `{ success, data, message, meta }`.

**Common mistake:** Calling `.then((r) => r.data.data)` in `api-services.ts` would double-unwrap and skip the meta. The convention is to return the full envelope from `api-services.ts` and let the component unwrap `.data`.

---

## Layer 7 — Verify Hook and Component Unpacking

```bash
grep -n "data?\.data\|data\?\.meta\|as.*\[\]" apps/web/src/features/xxx/xxx-page.tsx
```

The standard pattern in components:
```typescript
const { data, isLoading } = useXxxList(params);

// data = { success, data: Item[], message, meta }
const items = (data?.data ?? []) as Item[];
const total = data?.meta?.total ?? 0;
```

If `data?.data` is used but the service returned a single object (not paginated), `data?.data` is the object itself, not an array — calling `.map()` on it would throw `TypeError: data.data.map is not a function`.

---

## Common Mismatches Table

| Symptom | Likely Layer | What to Check |
|---------|-------------|---------------|
| Field always `undefined` in component | Schema | Is `@Prop()` decorator present? |
| Field in DB but missing from API response | toJSON | Does `toJSON` strip it? |
| `data` is an object, not an array | Service | Does it return `{ data, meta }`? |
| `meta` is undefined | Service | Does it return `meta` alongside `data`? |
| Component renders `[object Object]` | Component | Accessing `.data` one too few times |
| `data.map is not a function` | Component | Service returned single object; component expects array |
| Stale data after mutation | Hook | Does `onSuccess` invalidate the right query key? |
