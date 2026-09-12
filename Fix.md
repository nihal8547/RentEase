# RentEase — Critical Fix Prompt (Post-Audit Remediation)

Paste this into the development AI working on the actual RentEase codebase (the one that produced
the audit). Fix issues in the exact order below — the 4 Critical items are real security holes and
must be fixed and verified before touching anything else.

═══════════════════════════════════════════════════
🔴 CRITICAL — fix these four first, nothing else matters until they're done
═══════════════════════════════════════════════════

### 1. Remove the mock login bypass
File: `client/src/views/LoginView.tsx` (around line 51–68)

Delete the entire fallback branch that calls `setAuth('mock-jwt-token-qatar', mockUser, mockAgency)`
when the login API call fails or the backend is unreachable. A failed login request must show a
real error message ("Invalid credentials" or "Unable to reach server") and stop there — it must
never create a session. Search the whole client codebase for any other occurrence of
`mock-jwt-token`, `mockUser`, or `mockAgency` and remove all of them; this pattern likely exists
wherever a "demo mode" fallback was used during development.

### 2. Remove pre-filled demo credentials
File: `client/src/views/LoginView.tsx` (around line 17–18)

```
const [email, setEmail] = useState('t.almansoor@alrayyan.qa');
const [password, setPassword] = useState('password123');
```
Change both to empty strings (`useState('')`). Grep the repo for `password123` and any other
hardcoded credential strings to make sure none remain in seed scripts, tests, or other views that
shouldn't ship with real-looking data pre-filled in a production build.

### 3. Fix the insecure password reset token
File: `server/src/auth/auth.module.ts` (around line 429)

```diff
- const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
+ const token = require('crypto').randomBytes(32).toString('hex');
```
`Math.random()` is not cryptographically secure and its output is predictable — this is a full
account-takeover vector via password reset. Use `crypto.randomBytes`. Also confirm the reset token
is stored hashed (not plaintext) in the database and has a short expiry (e.g. 1 hour), invalidated
after first use.

### 4. Implement real password reset email sending
File: `server/src/auth/auth.module.ts` (around line 443)

Replace the `console.log('[MOCK EMAIL SEND]...')` call with a real email send through an
`EmailService` that uses the SMTP/provider credentials from the Integrations system (or SMTP env
vars as a fallback for the platform's own transactional emails, separate from the agency-configured
Integration). Verify end-to-end: request a reset → a real email arrives → the link works → the
token is single-use and expires.

**Do not proceed past this point until all four of the above are fixed AND manually verified** —
attempt a login with the network blocked and confirm it fails cleanly with no session created.

═══════════════════════════════════════════════════
🟠 MAJOR — fix before launch
═══════════════════════════════════════════════════

### 5. Fix `hasPermission()` fail-open behavior
File: `client/src/store/useAuthStore.ts` (around line 60–86)

Every fallback path in this function currently returns `true`. Change every fallback to `false`:
```diff
- if (!perms) return true;
+ if (!perms) return false;
  ...
- return true; // bottom of function
+ return false;
```
Fail-closed is the only acceptable default for a permission check — a missing or malformed
permissions object must deny access, never grant it. Note this is a UI convenience layer only; the
real enforcement must already exist server-side per module (confirm `PermissionGuard` +
`@RequirePermission` are applied on every controller method, not just most of them — audit the full
controller list).

### 5b. Fix `RouteGuard` / `NotAuthorizedView` Suspense handling
File: `client/src/App.tsx` (around line 70)

Ensure `NotAuthorizedView` is wrapped the same way as other lazy-loaded routes (inside the same
`<Suspense>` boundary the router uses), so there's no flash-of-unauthorized-content or flash of the
protected page before the guard resolves. The guard's redirect/render decision should happen before
any protected content mounts, not after.

### 6. Add all missing environment variables
Files: `.env.example`, `server/src/env.validation.ts`

Add and document:
```
JWT_REFRESH_SECRET=      # MUST be a different value from JWT_SECRET, not reused
REDIS_HOST=
REDIS_PORT=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
ALLOWED_ORIGIN=          # the real production frontend origin, not localhost
```
Update `env.validation.ts` to validate every one of these at startup (not just `DATABASE_URL` and
`JWT_SECRET`) — the app should refuse to boot with a clear error if any required variable is missing,
rather than silently starting with insecure defaults.

### 7. Add Redis to the production Docker Compose
File: `docker-compose.prod.yml`

Add a `redis` service (e.g. `redis:7-alpine`) that `server` depends on, matching whatever
`REDIS_HOST`/`REDIS_PORT` are set to. Confirm BullMQ connects successfully on a clean
`docker-compose -f docker-compose.prod.yml up` — the server must not crash with `ECONNREFUSED
127.0.0.1:6379`.

### 8. Move file uploads off local disk to cloud object storage
File: `server/src/supporting/supporting.module.ts`

Replace the local-disk multer storage engine with an S3-compatible storage client (S3, GCS, or
Cloudflare R2 — use whichever the team has credentials for; wire it through the same `Integration`
pattern already used elsewhere in the app so the bucket/credentials are configurable, not
hardcoded). Local disk storage is ephemeral in any containerized deployment — every uploaded lease
document, tenant ID, and maintenance photo is currently lost on every container restart. This is a
data-loss bug, not just a scaling concern.

### 9. Add a separate rate limit to the password reset endpoint
File: `server/src/auth/auth.module.ts`

`/auth/forgot-password` needs its own, stricter throttle rule (e.g. 3 requests per hour per IP or
per email), independent from the general auth throttle, so it can't be used to hammer the email
provider or enumerate valid accounts.

═══════════════════════════════════════════════════
🟡 MODERATE — fix soon after launch, not blocking
═══════════════════════════════════════════════════

### 10. Remove the mock-data fallback on Dashboard fetch failure
File: `client/src/views/DashboardView.tsx` (around line 35–45)

When a dashboard query fails, it must show a real error/retry state — never silently substitute
fake KPI numbers (94.2% occupancy, QAR 584,500 revenue, etc.). Showing fabricated data when the
backend is down is worse than showing nothing; a user could make a business decision on numbers
that aren't real.

### 11. Add HTTPS termination to the production Compose stack
File: `docker-compose.prod.yml`

Only port 80 is currently exposed. Add an Nginx reverse proxy (or confirm the cloud load balancer
handles this) terminating TLS on 443 with a real certificate (Let's Encrypt via certbot, or the
platform's managed cert), redirecting all port-80 traffic to 443.

### 12. Fix the migration race condition
Replace running `prisma migrate deploy` in every server container's `prestart:prod` with a single
dedicated migration step (a one-off init container/job that runs once before any `server` replica
starts, or a deploy-pipeline step) — running migrations from every replica simultaneously on scale-up
can race and corrupt migration state.

### 13. Write a real README.md
Cover: prerequisites, local setup (`docker-compose up`), required env vars (link to `.env.example`),
how to run migrations/seed, how to run tests, and a short production deployment overview. A
developer joining the project should be able to get a working local environment from the README
alone.

### 14. Create the missing `client/Dockerfile.prod`
File: `docker-compose.prod.yml` references `client/Dockerfile.prod`, which doesn't exist yet — build
it: multi-stage (Vite build stage → Nginx serving the static output), including the SPA fallback
config (`try_files $uri /index.html;`) so deep-linked routes don't 404.

### 15. Make `SubscriptionPlan.unitLimit` nullable
File: `server/prisma/schema.prisma`
```diff
- unitLimit Int
+ unitLimit Int?
```
`null` represents "unlimited," needed for the Enterprise plan. Update the unit-limit enforcement
logic to treat `null` as no limit, then run a migration.

### 16. Add a unique constraint on `Tenant.email`
File: `server/prisma/schema.prisma`
```diff
- email String
+ email String @unique
```
Currently two tenants can be created with the same email with no database-level protection. Add the
constraint, write the migration, and handle the resulting unique-violation error gracefully in the
TenantsModule (return a clear 409 Conflict, not a raw Prisma error).

═══════════════════════════════════════════════════
VERIFICATION CHECKLIST — run through this after all fixes
═══════════════════════════════════════════════════
- [ ] Login with the network blocked → clean error, no session created, no dashboard access
- [ ] Login form loads with empty fields, no pre-filled credentials
- [ ] Request password reset → real email arrives → link works once → token expires/rejects on reuse
- [ ] A user whose role/permissions object is somehow missing sees nothing they shouldn't (fail-closed)
- [ ] `docker-compose -f docker-compose.prod.yml up` boots cleanly with Redis, no connection errors
- [ ] Upload a document, restart the containers, confirm the file still exists (not on local disk)
- [ ] Dashboard API failure shows a real error state, never fabricated KPI numbers
- [ ] Full HTTPS works end-to-end with a valid certificate, port 80 redirects to 443
- [ ] Creating a second tenant with an existing email returns a clean conflict error, not a crash