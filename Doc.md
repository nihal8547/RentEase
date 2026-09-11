# RentEase — Project Concept & Development Brief

> Hand this entire file to a development AI (Claude Code, Cursor, etc.) as project context before starting work. It contains the business concept, design system, and technical architecture in one place, so the AI doesn't lose context across sessions.

---

## 1. What This Is

**RentEase** is a property & tenant management SaaS built for the Qatar real estate market — real estate agencies, individual landlords with multiple units, and facility management companies operating in Doha (The Pearl, West Bay, Lusail, Msheireb).

**The problem it solves:** Qatar has a very high expat rental population (~85% of residents). Most agencies and landlords still run leases, maintenance, and rent collection through Excel sheets, WhatsApp, and phone calls. There's a clear digitization gap, especially for mid-size agencies and individual landlords who are underserved by global proptech tools that don't support local payment rails or Arabic.

**Who uses it:**
- Real estate agencies (primary customer, pays subscription)
- Individual landlords with multiple units
- Facility management companies in towers/compounds
- Tenants (secondary users — submit maintenance requests, view payment status)

**What makes it different from generic property-management SaaS (Buildium, AppFolio, etc.):**
- Local Qatar payment gateway support (Fatora, Dibsy) instead of Stripe-only
- Arabic-first bilingual design, not a bolted-on translation layer
- WhatsApp-native communication for notifications, since that's how people in Qatar actually communicate
- Pricing in QAR, local support

---

## 2. Core Features (MVP scope)

1. **Lease & Tenant Management** — contract tracking, auto-renewal alerts, QAR billing
2. **Maintenance Request Portal** — tenant-submitted requests, vendor assignment, status tracking
3. **Online Rent Collection** — Qatar payment gateway integration (Fatora / Dibsy)
4. **Bilingual UI** — full English + Arabic, RTL layout
5. **Document Management** — rental agreements, ID/visa copies
6. **Owner/Agency Dashboard** — occupancy, revenue, expenses
7. **WhatsApp Business API notifications** — renewal reminders, payment confirmations, maintenance updates

## 3. Monetization

| Plan | Price | Scope |
|---|---|---|
| Freemium | Free | 1–5 units |
| Starter | QAR 199/mo | Up to 20 units |
| Agency | QAR 599/mo | Unlimited units, team access |
| Enterprise | Custom | Large facility management companies |

---

## 4. Design System (single source of truth — do not deviate without reason)

The visual identity is "premium corporate proptech," grounded in Qatar's national maroon kept dark and desaturated so it reads corporate rather than flag-literal. It deliberately avoids generic AI-SaaS defaults: no purple/indigo gradients, no cream+terracotta combo, no near-black+neon theme, no identical-radius-and-shadow card kit.

### Color tokens
```
maroon-900  #4A0F22   sidebar background, primary dark surface
maroon-700  #6E1731   primary buttons, active nav state
maroon-600  #7F1B39   hover state
gold-500    #B9924A   accent edges/highlights — sparingly, never a background fill
gold-300    #D9BE8C   accent text on dark surfaces
sand-100    #F4EFE4   subtle fills, tag backgrounds
sand-050    #FBF9F3   app background
ink-900     #221E1C   primary text
ink-600     #5B534C   secondary text
ink-400     #8B8279   muted/placeholder text
line        #E4DCCB   borders and dividers
green-600   #3F7A5C / green-100  #E4EFE7   positive/success
amber-600   #A9711C / amber-100  #F5E7CE   warning/pending
red-600     #A23B3B / red-100   #F5E1E1    urgent/error
```

### Typography
- Display/numerics: **Fraunces** (serif) — headings, KPI figures. Weight 500–600.
- UI/body: **Manrope** (sans) — nav, labels, tables, buttons. Weight 500–700.
- No third typeface, no all-caps labels, no single-word bolding inside headlines.

### Layout & component principles
- Fixed left sidebar (248px), maroon-900, grouped nav sections, thin gold gradient hairline on the right edge.
- Corner radius is meaningful, not uniform: 3px on structural elements, sharp on dividers/tables.
- Hairline 1px borders over soft box-shadows. Emphasis = solid 3px color edge tied to meaning (gold=primary metric, green=revenue, amber=attention, maroon=time-sensitive).
- One deliberate staggered entrance animation on dashboard load; simple 150ms hover transitions elsewhere — no scattered scroll-fade effects.

---

## 5. Technical Architecture

### Stack
```
Frontend:   React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
Routing:    React Router v6
State:      Zustand (global) + React Query (server cache)
Charts:     Recharts
Forms:      React Hook Form + Zod
i18n:       i18next + react-i18next (EN + Arabic, full RTL)
Backend:    NestJS + TypeScript
ORM:        Prisma
Database:   PostgreSQL
Auth:       JWT (passport-jwt), bcrypt password hashing
Infra:      Docker Compose (postgres + server + client)
```

**Why React over Nuxt/Vue:** stronger dashboard/charting component ecosystem, larger React hiring pool in Qatar/MENA, and shadcn/ui + Tailwind — the best fit for this premium corporate look — is React-first.

**Why PostgreSQL + Prisma:** relational data (agencies → properties → units → leases → tenants → payments) is inherently relational with real foreign-key integrity needs (a lease must belong to exactly one unit and one tenant); Prisma gives type-safe queries that match the TypeScript frontend.

### Monorepo structure
```
rentease/
  client/     React + Vite + Tailwind frontend
  server/     NestJS backend API
  docker-compose.yml
```

### Database schema (core entities)
```
Agency 1—* User (roles: OWNER, ADMIN, AGENT)
Agency 1—* Property 1—* Unit
Agency 1—* Tenant
Unit 1—* Lease *—1 Tenant
Lease 1—* Payment
Unit 1—* MaintenanceRequest *—1 Tenant
Agency 1—* Vendor
```
All queries are scoped by `agencyId` — no agency can ever see another agency's data.

### REST API surface (by module)
```
/auth            register, login (JWT)
/properties       CRUD, agency-scoped
/properties/:id/units   CRUD
/tenants          CRUD, search
/leases           CRUD, filter by status / expiringInDays
/payments         list, mark-paid, summary (collected/outstanding/overdue)
/maintenance      CRUD, status/priority filters, assign vendor
/dashboard        KPIs, revenue chart data
```

### Application views (7 screens, all reusing shared Panel / KpiCard / StatusPill / DataTable primitives)
1. **Dashboard** — KPI row (Occupancy, Monthly Revenue QAR, Pending Maintenance, Renewals Due), revenue chart, upcoming renewals, recent maintenance
2. **Properties** — grid + unit-level detail
3. **Tenants** — searchable table + lease-history detail panel
4. **Maintenance** — kanban board (Open / In Progress / Completed)
5. **Payments** — ledger + collected/outstanding/overdue summary
6. **Reports** — date range + report type + preview
7. **Settings** — agency profile, team, language preference

---

## 6. Development Roadmap (phased)

| Phase | Scope | Depends on |
|---|---|---|
| 1. Scaffolding | Monorepo, Vite + NestJS init, Docker Compose skeleton | — |
| 2. Database | Prisma schema, migrations, verify tables in Postgres | Phase 1 |
| 3. Auth | Register/login, JWT guard, agency-scoping | Phase 2 |
| 4. Backend modules | REST endpoints for all 7 resources | Phase 3 |
| 5. Design foundation | Tailwind tokens, shared UI primitives (KpiCard, Panel, DataTable, Sidebar) | Phase 1 |
| 6. Frontend data layer | Axios/React Query hooks, login flow, protected routes | Phase 4, 5 |
| 7. Views | All 7 screens wired to live API, no mock data | Phase 6 |
| 8. Bilingual | Full EN/AR translation, RTL layout | Phase 7 |
| 9. Seed & test | Realistic Qatar seed data, Jest + Vitest coverage | Phase 4, 7 |
| 10. Docker & env | Full `docker-compose up` from clean clone | All above |

Each phase should be verified working before the next begins — this keeps a development AI from losing coherence across a long build.

---

## 7. Success Criteria for the Build

- No mock/hardcoded data remains in the final build — everything flows through PostgreSQL via the API.
- No agency can access another agency's data under any query path.
- Every screen matches the design tokens in Section 4 exactly — no ad hoc colors or radii in component code.
- Full Arabic RTL experience, not a partial translation.
- `docker-compose up` brings the entire stack up from a clean clone with no manual steps beyond setting `.env` values.