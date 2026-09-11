# RentEase — Development Prompt v3 Addendum (Billing, Notifications, Integrations, Settings UX)

This is an ADDENDUM to `RentEase-Full-Development-Prompt-v2.md`. Paste both files into the
development AI together. This addendum REPLACES v2's thin `BillingModule` stub (Step 7) and
`Settings > Integrations/Notifications/Billing` sub-pages (Step 13), and ADDS a new frontend step
for the Settings navigation pattern. Everything else in v2 stays as-is.

═══════════════════════════════════════════════════
A — Payment & Subscription Billing (replaces v2 BillingModule)
═══════════════════════════════════════════════════
This is the agency's own SaaS subscription billing — separate from tenant rent payments (Payment
model in v2), which stays as-is.

### Schema additions
```
model Invoice {
  id           String   @id @default(uuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id])
  planId       String
  amountQar    Decimal
  status       InvoiceStatus @default(PENDING)
  gateway      String              // "fatora" | "dibsy"
  gatewayRef   String?             // transaction/session id from gateway
  issuedAt     DateTime @default(now())
  dueAt        DateTime
  paidAt       DateTime?
  failReason   String?
}
enum InvoiceStatus { PENDING PAID FAILED REFUNDED }

model PaymentMethod {
  id                String   @id @default(uuid())
  agencyId          String
  agency            Agency   @relation(fields: [agencyId], references: [id])
  gateway           String
  gatewayCustomerId String              // never store raw card data — gateway-hosted tokenization only
  cardBrand         String?
  cardLast4         String?
  isDefault         Boolean  @default(false)
  createdAt         DateTime @default(now())
}
```
Agency also gets: `billingStatus` (`ACTIVE | PAST_DUE | SUSPENDED`), `currentPeriodEnd DateTime`,
`cancelAtPeriodEnd Boolean @default(false)`.

### Endpoints
```
GET  /billing/plan                 current plan, unit usage vs limit, billingStatus, currentPeriodEnd
GET  /billing/plans                all SubscriptionPlan options for the upgrade/downgrade UI
POST /billing/checkout-session     starts a hosted checkout with the chosen gateway for a plan change,
                                    returns a redirect URL (card details never touch our backend)
POST /billing/webhook/:gateway     verifies gateway signature, on success: creates/updates Invoice
                                    (PAID), extends currentPeriodEnd, sets billingStatus ACTIVE; on
                                    failure: Invoice FAILED, triggers dunning notification
POST /billing/cancel               sets cancelAtPeriodEnd true; plan stays active until period end
GET  /billing/invoices             paginated invoice history
GET  /billing/invoices/:id/pdf     generated invoice PDF
POST /billing/payment-methods      add (via gateway token), DELETE to remove, PATCH to set default
```

### Business rules
- Enforce `unitLimit` from the plan on every Unit creation — return 402 with an `upgradeRequired: true`
  flag the frontend uses to show an upgrade prompt instead of a raw error.
- Failed payment → 3 retry attempts over 7 days (cron job) → if still failing, `billingStatus =
  PAST_DUE` (grace-period banner shown app-wide) → after grace period, `SUSPENDED` (read-only mode,
  data preserved, all mutating routes blocked except Billing itself).
- Proration: mid-cycle plan changes calculate a prorated charge/credit via the gateway's subscription
  API rather than manual math where the gateway supports it.

### Frontend — Settings > Billing
- Current plan card with a usage bar (units used / unitLimit)
- Plan comparison cards (Freemium/Starter/Agency/Enterprise) with "Upgrade"/"Downgrade" buttons
  launching the hosted checkout session
- Payment methods list (masked card, brand icon, "Set as default", "Remove")
- Invoice history table with a "Download PDF" action per row
- Cancel subscription flow with a confirmation modal explaining what happens at period end
- A persistent app-wide banner when `billingStatus` is `PAST_DUE` or `SUSPENDED`, linking straight
  to Billing

═══════════════════════════════════════════════════
B — Multi-Channel Notification System (replaces v2 NotificationsModule)
═══════════════════════════════════════════════════
### Schema additions
```
model NotificationTemplate {
  id              String   @id @default(uuid())
  agencyId        String?              // null = global default, agency can override
  agency          Agency?  @relation(fields: [agencyId], references: [id])
  eventType       String               // "lease_expiring" | "payment_overdue" |
                                        // "maintenance_assigned" | "user_invited" | "payment_received"
  channel         NotifChannel
  subjectTemplate String?              // email only
  bodyTemplate    String               // supports {{variableName}} placeholders
}
enum NotifChannel { EMAIL WHATSAPP IN_APP SMS }

model NotificationPreference {
  id        String @id @default(uuid())
  userId    String
  eventType String
  channel   NotifChannel
  enabled   Boolean @default(true)
  @@unique([userId, eventType, channel])
}
```
`Notification` model from v2 stays as the in-app record; add `channel` and `templateId` fields to it.

### Dispatch architecture
- Add Redis + BullMQ for a `notifications` queue. Every trigger point in the app (lease expiring
  cron, payment overdue cron, maintenance assigned, user invited, payment received webhook) enqueues
  a job — never sends synchronously in the request path.
- A single `NotificationDispatchService.dispatch(eventType, agencyId, recipientUserId, variables)`:
  1. Loads the agency's NotificationTemplate for (eventType, channel) — falls back to the global
     default if the agency hasn't customized it
  2. Checks NotificationPreference for that user/eventType/channel — skips if disabled
  3. Renders the template with `variables`
  4. Sends via the correct channel adapter (EmailAdapter, WhatsAppAdapter, InAppAdapter — SMS
     adapter stubbed for future use)
  5. Records the in-app Notification row regardless of channel, so there's always an audit trail
- Retry failed sends 3x with exponential backoff (BullMQ built-in), log final failures to AuditLog.
- Cron jobs (NestJS `@Cron`): daily scan for leases expiring in 30/14/7 days, daily scan for
  payments past `dueDate` with status still PENDING → mark OVERDUE + notify.

### Endpoints
```
GET   /notifications?unread=true              in-app feed (as in v2)
PATCH /notifications/:id/read
GET   /notification-templates                 agency's active set (defaults + overrides)
PATCH /notification-templates/:id             customize wording (per agency)
GET   /notification-preferences                current user's toggles
PATCH /notification-preferences                bulk update { eventType, channel, enabled }[]
```

### Frontend — Settings > Notifications
- Event list (Lease Renewal Reminder, Payment Overdue, Maintenance Assigned, New Team Member,
  Payment Received, Renewal Approved, etc.), each row with three channel toggles: Email / WhatsApp /
  In-App
- "Edit template" action per event opens an editor showing the current template text plus a chip
  list of available `{{variables}}` for that event type, with a live preview pane
- Toggles apply per-logged-in-user by default; an Owner/Admin view can additionally set agency-wide
  default templates (affects the fallback every user inherits)

═══════════════════════════════════════════════════
C — Manual Integration / API Configuration (generic system, new)
═══════════════════════════════════════════════════
One consistent pattern for every external service the agency needs to manually connect — WhatsApp,
Email, Payment Gateway, Google Maps, and an optional AI Assistant for WhatsApp auto-replies.

### Schema
```
model Integration {
  id           String   @id @default(uuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id])
  provider     IntegrationProvider
  configJson   String               // ENCRYPTED at rest (AES-256, server-side key from env, never
                                     // logged, never returned unmasked by any GET endpoint)
  status       IntegrationStatus @default(NOT_CONFIGURED)
  lastTestedAt DateTime?
  lastError    String?
  @@unique([agencyId, provider])
}
enum IntegrationProvider { WHATSAPP_BUSINESS EMAIL_SMTP PAYMENT_FATORA PAYMENT_DIBSY GOOGLE_MAPS AI_ASSISTANT }
enum IntegrationStatus { NOT_CONFIGURED CONNECTED ERROR }
```

### Endpoints (same shape for every provider)
```
GET  /integrations                          list all providers + status (config values masked,
                                             e.g. "sk_live_••••••3f2a")
GET  /integrations/:provider                one provider's masked config + status
PUT  /integrations/:provider/config         save new credentials (full values sent once over HTTPS,
                                             encrypted before storage, never echoed back unmasked)
POST /integrations/:provider/test           attempts a real call (e.g. WhatsApp: fetch phone number
                                             details; Email: send a test message to the logged-in
                                             user; Payment: fetch account/merchant info) — sets
                                             status CONNECTED or ERROR + lastError
DELETE /integrations/:provider              disconnect / clear credentials
```

### Per-provider config fields
```
WHATSAPP_BUSINESS   phoneNumberId, businessAccountId, accessToken, webhookVerifyToken
EMAIL_SMTP          provider (SMTP | SendGrid | Postmark | SES), host/port/username/password
                     (SMTP) OR apiKey (provider-based), fromName, fromEmail
PAYMENT_FATORA      merchantId, apiKey, webhookSecret
PAYMENT_DIBSY       merchantId, apiKey, webhookSecret
GOOGLE_MAPS         apiKey
AI_ASSISTANT        provider name, apiKey, enabled (toggles an AI auto-draft/auto-reply for
                     incoming WhatsApp tenant messages — replies are queued for a team member to
                     approve & send by default; a "fully automatic" mode is an explicit opt-in toggle,
                     off by default)
```

### Frontend — Settings > Integrations
- One card per provider: status badge (Not Configured / Connected / Error), "Configure" opens a
  form with masked existing values, a "Test Connection" button, and a "Disconnect" action
- WhatsApp card additionally lists the agency's Meta-approved message templates (read-only, fetched
  live via the test/fetch call — templates are managed on Meta's side, not editable here)
- AI Assistant card includes the auto-reply mode toggle (Suggest-only vs Fully automatic) with a
  clear explanation of the difference before enabling fully automatic mode

═══════════════════════════════════════════════════
D — Settings Navigation UX (new frontend step — nested sidebar + hover-expand)
═══════════════════════════════════════════════════
This replaces a flat Settings page with a proper nested-sidebar pattern (same interaction model as
Notion/Slack/Linear settings).

### Behavior spec
1. **Default state** (any non-Settings route): main sidebar renders full-width (248px), maroon-900,
   with icon + label per nav item, as already specified in v2 Step 9.
2. **Entering Settings** (route matches `/settings/*`, e.g. clicking the Settings nav item or a
   direct link): 
   - Main sidebar animates to a collapsed icon-only rail, ~72px wide, icons only, no labels,
     maroon-900 background retained, tooltip on hover per icon showing its label
   - A second sidebar — the **Settings sidebar** — slides in immediately to the right of the
     collapsed rail, ~240px wide, sand-050 background (visually distinct from the dark main rail),
     containing: a "← Back" link/button at the top (returns to the last non-Settings route and
     restores the main sidebar to full width), then the Settings sub-nav list: Profile, Team,
     Roles & Permissions, Custom Lists, Integrations, Notifications, Billing, Audit Log, Data Export
   - Main content area shifts right to sit after both rails (72px + 240px)
3. **Hovering the collapsed main rail while in Settings**: on `mouseenter` of the collapsed rail,
   it expands to full width (248px, with labels) as an **absolutely-positioned overlay** that sits
   on top of the Settings sidebar (z-index above it) rather than pushing layout — the Settings
   sidebar and main content do not reflow. On `mouseleave`, collapse back to the icon-only rail
   after a short debounce (~150ms) to avoid flicker when moving the mouse across the gap.
   Clicking any item in this hover-expanded flyout navigates normally; if the target is outside
   `/settings/*`, Settings mode exits and the main sidebar returns to its normal full-width,
   non-collapsed state on the new route.
4. **Leaving Settings**: clicking "Back", clicking a main-nav item in the flyout, or direct browser
   navigation away from `/settings/*` restores the main sidebar to its default full-width state and
   removes the Settings sidebar.

### Implementation notes
- `Sidebar` component takes a `mode: 'full' | 'collapsed'` prop, derived from whether the current
  route matches `/settings/*` (via `useLocation`), not from separate manual state — the URL is the
  source of truth.
- A local `isHoverExpanded` boolean (React state) controls the flyout overlay independent of `mode`;
  it only has a visual effect when `mode === 'collapsed'`.
- `SettingsSidebar` is its own component, mounted only when `mode === 'collapsed'`, reading its
  item list from the Settings routes so adding a new Settings sub-page automatically adds a nav entry.
- Respect `prefers-reduced-motion`: skip the width/slide transition, snap directly between states.
- On mobile (<768px), skip the two-rail pattern entirely — Settings becomes a full-screen view with
  its own back button and a simple stacked list of sub-sections, consistent with v2's existing
  mobile sidebar-collapse behavior.

═══════════════════════════════════════════════════
VERIFY BEFORE MOVING ON
═══════════════════════════════════════════════════
- A full billing cycle: subscribe → webhook marks Invoice PAID → currentPeriodEnd extends →
  simulate a failed renewal → billingStatus moves PAST_DUE → SUSPENDED after grace period → app
  goes read-only except Billing
- A notification (e.g. payment overdue) is dispatched through the queue and lands correctly in
  Email, WhatsApp, and the in-app feed, respecting per-user channel preferences
- Saving WhatsApp/Email/Payment credentials in Integrations, hitting "Test Connection", and seeing
  status flip to Connected against real (sandbox) credentials
- Opening Settings visibly collapses the main sidebar and shows the Settings sidebar; hovering the
  collapsed rail expands it as an overlay without moving the Settings sidebar or content; leaving
  Settings restores the normal full sidebar