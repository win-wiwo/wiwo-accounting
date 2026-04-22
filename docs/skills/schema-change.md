---
name: schema-change
description: How to safely add, rename, or remove fields on a Mongoose schema in PRAMS without breaking the API, TypeScript, or existing data.
allowed_tools: ["Bash", "Read", "Edit", "Grep"]
---

# Safely Change a Mongoose Schema in PRAMS

Use this skill when adding a new field to an existing entity, renaming a field, removing a field, or changing a field's type.

---

## The Two Files That Must Stay in Sync

Every entity field lives in two places:

| File | Purpose |
|------|---------|
| `apps/api/src/modules/xxx/schemas/xxx.schema.ts` | Mongoose knows what to store |
| `packages/shared/src/types/xxx.types.ts` | TypeScript knows the shape everywhere |

If you update one without the other, you get either a type error (TypeScript) or silent data loss (Mongoose stores nothing).

---

## Adding a New Field

### Step 1 — Add `@Prop()` to the schema class

```typescript
// apps/api/src/modules/xxx/schemas/xxx.schema.ts

@Prop({ type: String, default: null, trim: true })
newField: string | null;
```

Rules:
- `@Prop()` is always required — the TypeScript class field alone does nothing for Mongoose
- Match the TypeScript type to the Mongoose type: `type: String` → `string | null`, `type: Number` → `number`
- Always provide a `default` for optional fields so existing documents are not broken
- Add `| null` to the TypeScript type when `default: null`

### Step 2 — Update the shared interface

```typescript
// packages/shared/src/types/xxx.types.ts
export interface Xxx {
  _id: string;
  // ...existing fields...
  newField: string | null;   // ← add here
}
```

### Step 3 — Update DTOs if the field is user-settable

```typescript
// apps/api/src/modules/xxx/dto/create-xxx.dto.ts
@IsString()
@IsOptional()
newField?: string;
```

### Step 4 — Verify the service uses the new field correctly

If the field is set during creation:
```typescript
// xxx.service.ts create():
const item = new this.xxxModel({
  // ...existing fields...
  newField: dto.newField || null,
});
```

### Step 5 — Check if the field is referenced anywhere else

```bash
grep -rn "newField\|new_field" apps/ packages/ --include="*.ts" | grep -v "node_modules"
```

---

## Removing a Field

Removing a field is safer than it looks — MongoDB documents simply retain the old field data, but it is ignored by the application.

### Step 1 — Remove from the shared interface first

Check if anything uses it:
```bash
grep -rn "fieldToRemove" apps/web/src/ packages/shared/src/ --include="*.ts"
```

Fix all usages before removing the definition. TypeScript will catch misses.

### Step 2 — Remove `@Prop()` from the schema class

The data remains in MongoDB (harmless). If you need to remove the data too, write a migration script — do not do it in application code.

### Step 3 — Remove from DTOs

```bash
grep -rn "fieldToRemove" apps/api/src/ --include="*.ts"
```

---

## Renaming a Field

**Do not rename in place** — existing documents in MongoDB still have the old field name. A rename is: add the new field, migrate data, remove the old field. In development (no production data), you can rename directly.

Development rename:
1. Update `@Prop()` decorator with new name
2. Update the TypeScript class property name
3. Update shared interface
4. Update all service/DTO references
5. Drop and recreate the database (dev only):
   ```bash
   docker exec prams-mongodb mongosh prams --eval 'db.dropDatabase()'
   docker compose restart api
   ```

---

## Changing a Field Type

This is dangerous with existing data. In development only:

```typescript
// Before:
@Prop({ required: true })
amount: number;

// After (to nullable):
@Prop({ type: Number, default: null })
amount: number | null;
```

Update everywhere:
1. Schema `@Prop()` and class type
2. Shared interface type
3. Any DTO validator (add `@IsOptional()` if now optional)
4. Service code that reads/writes the field (null checks)
5. Frontend component code (null guards: `amount ?? 0`)

---

## Adding a Cross-Collection Reference

```typescript
// Schema:
@Prop({ type: Types.ObjectId, ref: 'OtherEntity', default: null })
otherEntityId: Types.ObjectId | null;
```

```typescript
// Shared interface:
export interface Xxx {
  otherEntityId: string | null;       // as string (serialized ObjectId)
  // populated version when you use .populate():
  otherEntity?: { _id: string; name: string } | null;
}
```

When using `.populate()` in the service:
```typescript
this.xxxModel.findById(id).populate('otherEntityId', 'name code').exec()
```

After populate, `doc.otherEntityId` in TypeScript is still typed as `Types.ObjectId`. Cast or use `as unknown as` when needed, or type the return explicitly.

---

## After Any Schema Change — Verify

```bash
# 1. TypeScript compiles (no errors in watcher):
docker logs prams-api --tail 5
# Expected: "Nest application successfully started"

# 2. New field appears in API response:
curl -s http://localhost:3000/api/xxx/SOME_ID \
  -H "Authorization: Bearer TOKEN" | python3 -m json.tool | grep newField

# 3. No TypeScript errors in frontend:
docker logs prams-web --tail 5
```
