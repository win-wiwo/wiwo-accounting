---
name: debug-api-down
description: Diagnose why the PRAMS API is not responding — covers TypeScript compile errors (the most common cause), container crashes, and MongoDB connection issues.
allowed_tools: ["Bash", "Read"]
---

# Debug: API Not Responding

Use this skill when API calls fail with connection refused, connection reset, or ERR_NETWORK.

## How the API Runs

```
docker-compose up → prams-api container → nest start --watch → TypeScript compiler → NestJS app
```

The API uses `nest start --watch`. **A single TypeScript error prevents the server from starting entirely.** No routes are registered. Every request gets connection-reset. This is the most common failure mode.

---

## Step 1 — Read the API Container Logs

```bash
docker logs prams-api --tail 50
```

**Scenario A — TypeScript compile error (most common):**
```
src/modules/purchase-orders/purchase-orders.service.ts:75:48 - error TS2339:
Property 'projectName' does not exist on type '...'
Found 1 error. Watching for file changes.
```

The server never started. Fix the TypeScript error, save the file, and wait ~5 seconds for the watcher to recompile. You'll see `Nest application successfully started` when it's healthy.

**Scenario B — Server started but crashed at runtime:**
```
[Nest] LOG [NestApplication] Nest application successfully started
...
TypeError: Cannot read properties of undefined
```

Look for the stack trace. The error is in the service/controller code, not the compiler.

**Scenario C — Server started successfully:**
```
[NestApplication] Nest application successfully started
PRAMS API running on http://localhost:3000
```
If you see this but requests still fail, the problem is on the caller side. Jump to Step 4.

---

## Step 2 — Fix TypeScript Errors

TypeScript errors are almost always one of these:

**Accessing a property not on the Mongoose document type:**
```typescript
// PurchaseRequest has projectId (ObjectId ref), not projectName (string)
sourcePr.projectName  // TS2339 — field doesn't exist on the class

// Fix: use only what's in the schema class
dto.projectName || null
```

**Missing `@Prop()` decorator:**
```typescript
// Added a field to the class body but not decorated → TypeScript sees it, Mongoose ignores it
class PurchaseRequest extends Document {
  projectName: string | null;  // ← no @Prop() = TS knows it, DB doesn't store it
}
```

**Wrong generic on Mongoose model:**
```typescript
// Must match the schema class exactly
@InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>
```

**Import that doesn't exist:**
```bash
# Find what the file actually exports
grep "^export" apps/api/src/modules/xxx/xxx.service.ts
```

---

## Step 3 — Verify Recovery

After fixing, watch for the watcher output:
```bash
docker logs prams-api -f --tail 5
# Wait for:
# [NestApplication] Nest application successfully started
```

Then test directly:
```bash
curl -s http://localhost:3000/api/projects \
  -H "Authorization: Bearer SOME_TOKEN" | head -c 200
# Expected: {"success":false,"data":null,"message":"Unauthorized"}
# (401 is correct — it means the server is alive and routing)
```

Connection reset or empty response = still broken.

---

## Step 4 — If Server Is Running But Frontend Can't Reach It

The frontend calls the API at `http://localhost:3000/api` (set via `VITE_API_URL` in `docker-compose.yml`). This is a direct browser-to-container call — it works because Docker maps port 3000 to the host.

```bash
# Test from the host (not inside a container):
curl http://localhost:3000/api/projects
```

If this works but the browser still fails:
- Check browser DevTools → Network tab → click the failed request → check the actual URL
- Check for CORS errors in the Console tab
- Check if `VITE_API_URL` is set correctly in `docker-compose.yml`

```yaml
web:
  environment:
    - VITE_API_URL=http://localhost:3000/api  # ← must be this
```

---

## Step 5 — MongoDB Connection Issues

If the API starts but immediately crashes with a Mongoose connection error:

```bash
docker logs prams-mongodb --tail 20
docker ps  # verify prams-mongodb is "healthy", not just "Up"
```

MongoDB needs to be in replica set mode for transactions:
```bash
# Should see rs0 in the command
docker inspect prams-mongodb | grep -A5 '"Cmd"'
```

If MongoDB is unhealthy, restart it:
```bash
docker compose restart mongodb
# Wait for healthy status, then:
docker compose restart api
```

---

## Module Not Registered

If a specific route returns 404 but others work, the module may not be registered:

```bash
grep "ProjectsModule\|PurchaseOrdersModule" apps/api/src/app.module.ts
```

If missing, add it:
```typescript
// app.module.ts
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    // ... existing modules
    ProjectsModule,
  ],
})
```
