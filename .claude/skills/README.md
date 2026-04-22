# PRAMS — Project Skills

These skills encode debugging procedures and development patterns specific to this codebase. Use them when the situation matches — they are faster and more precise than reasoning from scratch.

## Available Skills

| Skill | Invoke | Use When |
|-------|--------|----------|
| `debug-blank-page` | `/debug-blank-page` | Browser shows white/blank page — no sidebar, no header, nothing |
| `debug-api-down` | `/debug-api-down` | API returns connection refused, connection reset, or ERR_NETWORK |
| `add-module` | `/add-module` | Adding a new domain entity with CRUD — backend + frontend |
| `data-flow-trace` | `/data-flow-trace` | Data is wrong, missing, or shaped unexpectedly in the UI |
| `schema-change` | `/schema-change` | Adding, removing, or renaming a field on a Mongoose schema |

## Quick Decision Tree

```
Something broke → what layer?

  Page is blank (no sidebar either)
  └─ /debug-blank-page

  API requests fail with network error
  └─ /debug-api-down

  Page loads but shows wrong/empty data
  └─ /data-flow-trace

  I need to add a new feature end-to-end
  └─ /add-module

  I'm changing a field on an existing entity
  └─ /schema-change
```

## Most Critical Things to Know Without Running a Skill

1. **`SelectItem value=""` crashes the entire app silently** — always use a named sentinel like `"all"`
2. **TypeScript compile errors prevent the API from starting** — `docker logs prams-api` is always the first debugging step
3. **`@Prop()` decorator is required for Mongoose persistence** — a class field alone does nothing
4. **Never access a field that isn't in the Mongoose schema class** — TypeScript may not warn you, but the value will always be `undefined`
5. **`TransformInterceptor` expects `{ data, meta }` from list services** — any other shape is treated as a single object
