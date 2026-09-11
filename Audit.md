# RentEase — Production Readiness Audit (v5 Addendum)

Paste alongside v2 + v3 + v4. Instruct the development AI to go through EVERY category below against
the already-built app, list what's missing or broken, then fix it before calling the build production-
ready. This is an inspection pass, not new features — the goal is to catch what gets skipped when a
large spec is built quickly.

═══════════════════════════════════════════════════
1 — ROUTING AUDIT
═══════════════════════════════════════════════════
Go through every route named across v2/v3/v4 and confirm:
- [ ] Every nav item and every button that navigates actually resolves to a real page — no dead links,
      no "TODO" placeholder pages
- [ ] A catch-all `*` route renders a proper 404 page (styled, with a link back to Dashboard) —
      not a blank screen or router error
- [ ] Refreshing the browser on ANY nested route (`/tenants/:id`, `/settings/billing`, `/portal/requests`)
      works correctly — server must serve `index.html` for all non-API paths (SPA fallback in nginx
      config), otherwise deep links 404 at the infrastructure level
- [ ] Unauthenticated access to any protected route redirects to `/login` AND preserves the originally
      requested URL, so login redirects back to where the user was headed — not always to `/dashboard`
- [ ] A logged-in user without permission for a route (Billing, Roles, Audit Log, etc.) hitting the URL
      directly (not via nav, which just hides the link) gets a proper "Not Authorized" page — confirm
      this is enforced by the ROUTE GUARD, and separately confirm the BACKEND also rejects the API
      calls that page would make. Hiding a nav link is not security; both layers must independently
      block access.
- [ ] `/portal/*` (tenant routes) and the main agency app are fully isolated — a tenant-role user
      hitting an agency URL is redirected to their portal, and vice versa
- [ ] Logout clears React Query cache, Zustand state, and any stored JWT, then redirects to `/login`
      — verify no stale data flashes for the next user on a shared device
- [ ] Expired/invalid JWT on any API call triggers a clean redirect to `/login` with a "session expired"
      message — not an infinite spinner, not a silent failure, not a raw 401 in the console with the
      UI stuck
- [ ] The Settings nested-sidebar routes (`/settings/profile`, `/settings/team`, `/settings/billing`, etc.)
      each resolve independently — confirm none of them fall through to a generic Settings landing page
      by mistake
- [ ] Breadcrumb / back-navigation is consistent — e.g. from a Tenant detail page, back returns to the
      Tenants list WITH the previous search/filter/page state intact, not a reset list

═══════════════════════════════════════════════════
2 — ERROR HANDLING
═══════════════════════════════════════════════════
- [ ] A React top-level Error Boundary wraps the app — a component crash shows a friendly fallback
      screen with a "Reload" action, never a blank white page
- [ ] Every React Query mutation has `onError` handling that surfaces a real message to the user
      (toast or inline) — no silently-failed Save/Create actions
- [ ] Every React Query query has proper `isError` handling in the UI (an error state, not an infinite
      loading skeleton)
- [ ] Backend: a global NestJS exception filter returns a consistent shape (`{ statusCode, message,
      error }`) for every error, including unhandled ones
- [ ] Production mode never leaks stack traces or internal error details in API responses
      (`NODE_ENV=production` strips them)
- [ ] Offline detection: if the network drops mid-session, show a banner, don't let forms silently
      fail
- [ ] Every DTO across every module has class-validator decorators — spot-check that none were
      skipped when modules were built quickly (a common gap under time pressure)

═══════════════════════════════════════════════════
3 — LOADING & EMPTY STATES
═══════════════════════════════════════════════════
- [ ] Every list screen (Properties, Tenants, Leases, Payments, Maintenance, Vendors, Expenses, Team,
      Audit Log, Invoices) shows a skeleton loader on first load, not a blank panel or a generic spinner
- [ ] Every list screen has a real empty state with a message + a relevant action (e.g. Tenants empty
      → "No tenants yet — Add your first tenant" button), not just "No data"
- [ ] Search/filter with zero results shows a distinct "no results for this search" state, different
      from the true-empty state

═══════════════════════════════════════════════════
4 — SECURITY HARDENING
═══════════════════════════════════════════════════
- [ ] HTTPS enforced in production (redirect http → https at the load balancer/nginx level)
- [ ] CORS configured to the actual frontend origin(s) only — never a wildcard `*` in production
- [ ] Helmet.js (or NestJS equivalent) security headers enabled on the API
- [ ] Access token lifetime shortened (e.g. 15 min) with a refresh-token flow (httpOnly cookie or
      secure storage) — a single 24h JWT with no refresh is fine for a demo, not for production
- [ ] Rate limiting on `/auth/login` and `/auth/register` (e.g. @nestjs/throttler) to block brute force
- [ ] Password policy enforced server-side (minimum length/complexity), bcrypt salt rounds ≥ 10
- [ ] Integration credentials (Step C, v3 addendum): confirm they are actually encrypted at rest, never
      appear unmasked in any GET response or log line, and the encryption key itself is not committed
      to the repo
- [ ] File uploads (Documents module) validate file type and size server-side, not just in the frontend
      input `accept` attribute — reject executables/scripts outright
- [ ] Payment gateway webhooks (`/billing/webhook/:gateway`) verify the provider's signature AND are
      idempotent — a duplicate webhook delivery for the same event must not double-charge, double-credit,
      or create duplicate Invoice rows
- [ ] No secret keys (payment gateway secret, JWT secret, S3 secret) ever end up in the Vite/frontend
      bundle — only `VITE_` public values belong on the client
- [ ] SQL injection: confirm all queries go through Prisma's parameterized query builder — no raw
      string-concatenated `$queryRawUnsafe` calls anywhere
- [ ] RBAC permission changes take effect promptly — if an Admin edits a role's permissions, users
      currently logged in with that role should have their permission set refreshed (short-lived JWT
      + refresh helps here) rather than keeping stale elevated/reduced access until next login

═══════════════════════════════════════════════════
5 — PERFORMANCE
═══════════════════════════════════════════════════
- [ ] Verify indexes exist on every foreign key column and every column used in a `WHERE`/`ORDER BY`
      in the list endpoints from v2 Step 6, not just the trigram search columns
- [ ] Check for N+1 queries — list endpoints that return related data (e.g. Tenants with their active
      Lease) must use Prisma `include`, not a loop of separate queries
- [ ] Server-side pagination `limit` is capped (e.g. max 100) regardless of what the client requests,
      to prevent a `?limit=100000` abuse case
- [ ] Frontend routes are code-split (`React.lazy` + `Suspense`) so the initial bundle isn't the entire
      app — especially Settings/Billing/Reports, which aren't needed on first paint
- [ ] React Query `staleTime`/`cacheTime` tuned so switching between already-visited screens doesn't
      always re-fetch instantly, but data doesn't go stale for long either
- [ ] Add a `/health` endpoint (checks DB connectivity) for uptime monitoring and the Docker healthcheck

═══════════════════════════════════════════════════
6 — i18n / ACCESSIBILITY COMPLETENESS
═══════════════════════════════════════════════════
- [ ] Confirm every page added in v3/v4 (Billing, Integrations, Notifications, Team, Roles, Custom
      Lists, Audit Log) has full Arabic translations — these were added after the original i18n step
      and are the most likely to have been missed
- [ ] RTL layout spot-checked on the newer pages specifically, not just the original 7 dashboard views
- [ ] Every icon-only button (Icon variant from v4) has an `aria-label`
- [ ] Full keyboard-only pass: can a user complete "invite a team member" and "add a property" using
      only Tab/Enter/Escape, with visible focus at every step, including inside modals (focus trapped
      inside the modal, returns to the trigger element on close)

═══════════════════════════════════════════════════
7 — TESTING & DEPLOYMENT
═══════════════════════════════════════════════════
- [ ] At least one end-to-end test covering the full critical path: register agency → invite team
      member → add property/unit → add tenant → create lease → record payment → submit maintenance
      request — not just isolated unit tests per module
- [ ] Production migrations use `prisma migrate deploy`, not `migrate dev`, in the deploy pipeline
- [ ] `.env.example` committed with placeholder values; real `.env` gitignored and confirmed absent
      from git history
- [ ] Structured logging (e.g. pino) instead of `console.log` on the backend, with request IDs for
      tracing
- [ ] An error-monitoring hook point (Sentry or equivalent) wired on both frontend and backend, even
      if the actual DSN is left for the team to fill in
- [ ] PostgreSQL backup strategy documented (even if just "daily pg_dump to S3" for now)
- [ ] NestJS graceful shutdown handling (finish in-flight requests, close DB pool cleanly) on SIGTERM,
      so container restarts/deploys don't drop requests mid-flight

═══════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════
For each of the 7 sections above: list what was already correct, list what was missing, then fix the
gaps. Do not mark this audit complete until every checkbox above is either confirmed present or has
been implemented.