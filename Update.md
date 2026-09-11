# RentEase — Full Development Prompt v2 (Complete, Gap-Audited)

Paste this entire file into a development AI (Claude Code, Cursor, etc.). It supersedes earlier
prompts — it includes everything previously scoped PLUS role-based access control, user management,
a powerful settings module, an agency-extensible custom-items system, server-side search/filter, and
every other module identified in a full gap audit. Follow steps in order; verify each before the next.

Build "RentEase" — a premium property & tenant management SaaS for the Qatar real estate market
(agencies, landlords, facility managers in Doha: The Pearl, West Bay, Lusail, Msheireb).
Stack: React + Tailwind frontend, NestJS backend, PostgreSQL database, Docker Compose.

═══════════════════════════════════════════════════
STEP 1 — Project Scaffolding
═══════════════════════════════════════════════════
Monorepo:
  rentease/client/    React 18 + Vite + TypeScript + Tailwind
  rentease/server/    NestJS + TypeScript
  docker-compose.yml  postgres + server + client

Backend deps: @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt prisma
  @prisma/client bcrypt class-validator class-transformer multer (file uploads)
  @aws-sdk/client-s3 (or compatible, for document storage)

Frontend deps: tailwindcss shadcn/ui react-router-dom zustand @tanstack/react-query recharts
  lucide-react react-hook-form zod i18next react-i18next axios cmdk (for combobox/add-new UI)

Verify both apps run independently before continuing.

═══════════════════════════════════════════════════
STEP 2 — PostgreSQL Schema (Prisma) — full, RBAC + custom items included
═══════════════════════════════════════════════════
model Agency {
  id            String   @id @default(uuid())
  name          String
  logoUrl       String?
  tradeLicense  String?
  taxNumber     String?
  address       String?
  planId        String
  plan          SubscriptionPlan @relation(fields: [planId], references: [id])
  unitLimit     Int      @default(5)
  createdAt     DateTime @default(now())
  users         User[]
  roles         Role[]
  properties    Property[]
  tenants       Tenant[]
  vendors       Vendor[]
  listTypes     ListType[]
  auditLogs     AuditLog[]
  notifications Notification[]
}

// ---------- RBAC ----------
model Role {
  id           String   @id @default(uuid())
  agencyId     String?              // null = system default role, cloned per agency on creation
  agency       Agency?  @relation(fields: [agencyId], references: [id])
  name         String               // "Owner", "Admin", "Property Manager", "Accountant", custom names allowed
  isSystemRole Boolean  @default(false)   // system roles cannot be deleted, only cloned
  permissions  Json     // { properties: {view,create,edit,delete}, tenants: {...}, leases: {...},
                         //   payments: {...}, maintenance: {...}, vendors: {...}, reports: {view},
                         //   settings: {view,edit}, users: {view,create,edit,delete},
                         //   billing: {view,edit} }
  users        User[]
}

model User {
  id           String   @id @default(uuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id])
  roleId       String
  role         Role     @relation(fields: [roleId], references: [id])
  name         String
  email        String   @unique
  passwordHash String?
  status       UserStatus @default(INVITED)
  invitedAt    DateTime @default(now())
  lastLoginAt  DateTime?
}
enum UserStatus { INVITED ACTIVE SUSPENDED }

// ---------- Custom / dynamic dropdown items ----------
model ListType {
  id            String   @id @default(uuid())
  agencyId      String?              // null = global default list definition
  agency        Agency?  @relation(fields: [agencyId], references: [id])
  key           String               // "unit_type" | "maintenance_category" | "vendor_specialty" |
                                      // "payment_method" | "amenity" | "lease_type" | "document_type" |
                                      // "expense_category" | "nationality"
  label         String               // display name shown in Settings
  items         ListItem[]
  @@unique([agencyId, key])
}
model ListItem {
  id          String   @id @default(uuid())
  listTypeId  String
  listType    ListType @relation(fields: [listTypeId], references: [id])
  value       String               // machine value
  label       String               // display label
  isDefault   Boolean  @default(false)   // seeded item — can be deactivated, not deleted
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdById String?
  createdAt   DateTime @default(now())
}

// ---------- Core domain (as before, extended) ----------
model Property {
  id         String @id @default(uuid())
  agencyId   String
  agency     Agency @relation(fields: [agencyId], references: [id])
  name       String
  area       String
  address    String
  createdAt  DateTime @default(now())
  units      Unit[]
  expenses   Expense[]
}
model Unit {
  id          String @id @default(uuid())
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
  unitNumber  String
  floor       Int?
  bedrooms    Int
  bathrooms   Int
  sizeSqm     Decimal
  unitTypeId  String        // FK -> ListItem (key = "unit_type")
  status      UnitStatus @default(VACANT)
  leases      Lease[]
  maintenanceRequests MaintenanceRequest[]
}
enum UnitStatus { VACANT OCCUPIED MAINTENANCE }

model Tenant {
  id          String @id @default(uuid())
  agencyId    String
  agency      Agency @relation(fields: [agencyId], references: [id])
  name        String
  email       String
  phone       String
  nationalityListItemId String?   // FK -> ListItem (key = "nationality")
  createdAt   DateTime @default(now())
  leases      Lease[]
  maintenanceRequests MaintenanceRequest[]
  documents   Document[]
}

model Lease {
  id              String @id @default(uuid())
  unitId          String
  unit            Unit @relation(fields: [unitId], references: [id])
  tenantId        String
  tenant          Tenant @relation(fields: [tenantId], references: [id])
  leaseTypeListItemId String?   // FK -> ListItem (key = "lease_type")
  startDate       DateTime
  endDate         DateTime
  rentAmount      Decimal
  status          LeaseStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  payments        Payment[]
  renewalRequests RenewalRequest[]
  documents       Document[]
}
enum LeaseStatus { ACTIVE EXPIRED RENEWAL_PENDING TERMINATED }

model RenewalRequest {
  id         String @id @default(uuid())
  leaseId    String
  lease      Lease @relation(fields: [leaseId], references: [id])
  proposedRentAmount Decimal
  proposedEndDate    DateTime
  status     RenewalStatus @default(PENDING)
  requestedById String
  approvedById  String?
  createdAt  DateTime @default(now())
}
enum RenewalStatus { PENDING APPROVED REJECTED }

model Payment {
  id        String @id @default(uuid())
  leaseId   String
  lease     Lease @relation(fields: [leaseId], references: [id])
  amount    Decimal
  dueDate   DateTime
  paidDate  DateTime?
  status    PaymentStatus @default(PENDING)
  methodListItemId String?   // FK -> ListItem (key = "payment_method")
  createdAt DateTime @default(now())
}
enum PaymentStatus { PENDING PAID OVERDUE }

model Vendor {
  id             String @id @default(uuid())
  agencyId       String
  agency         Agency @relation(fields: [agencyId], references: [id])
  name           String
  phone          String
  specialtyListItemId String   // FK -> ListItem (key = "vendor_specialty")
  rating         Decimal?
  isActive       Boolean @default(true)
  maintenanceRequests MaintenanceRequest[]
}

model MaintenanceRequest {
  id            String @id @default(uuid())
  unitId        String
  unit          Unit @relation(fields: [unitId], references: [id])
  tenantId      String
  tenant        Tenant @relation(fields: [tenantId], references: [id])
  categoryListItemId String?   // FK -> ListItem (key = "maintenance_category")
  title         String
  description   String
  priority      Priority @default(MEDIUM)
  status        ReqStatus @default(OPEN)
  vendorId      String?
  vendor        Vendor? @relation(fields: [vendorId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  documents     Document[]
}
enum Priority { LOW MEDIUM HIGH }
enum ReqStatus { OPEN IN_PROGRESS COMPLETED }

model Expense {
  id           String @id @default(uuid())
  propertyId   String
  property     Property @relation(fields: [propertyId], references: [id])
  categoryListItemId String?   // FK -> ListItem (key = "expense_category")
  amount       Decimal
  incurredOn   DateTime
  note         String?
  createdAt    DateTime @default(now())
}

model Document {
  id         String @id @default(uuid())
  fileUrl    String
  fileName   String
  documentTypeListItemId String?   // FK -> ListItem (key = "document_type")
  tenantId   String?
  tenant     Tenant? @relation(fields: [tenantId], references: [id])
  leaseId    String?
  lease      Lease? @relation(fields: [leaseId], references: [id])
  maintenanceRequestId String?
  maintenanceRequest MaintenanceRequest? @relation(fields: [maintenanceRequestId], references: [id])
  uploadedAt DateTime @default(now())
}

model Notification {
  id        String @id @default(uuid())
  agencyId  String
  agency    Agency @relation(fields: [agencyId], references: [id])
  userId    String?
  type      String       // "renewal_due" | "payment_overdue" | "maintenance_assigned" | ...
  message   String
  isRead    Boolean @default(false)
  createdAt DateTime @default(now())
}

model AuditLog {
  id         String @id @default(uuid())
  agencyId   String
  agency     Agency @relation(fields: [agencyId], references: [id])
  userId     String
  action     String       // "tenant.create" | "lease.update" | "user.role_change" | ...
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())
}

model SubscriptionPlan {
  id        String @id @default(uuid())
  name      String       // "Freemium" | "Starter" | "Agency" | "Enterprise"
  priceQar  Decimal
  unitLimit Int
  agencies  Agency[]
}

Run: npx prisma migrate dev --name init_full
Verify: all tables exist (psql \dt) before continuing.

═══════════════════════════════════════════════════
STEP 3 — Auth & RBAC Enforcement (backend)
═══════════════════════════════════════════════════
- POST /auth/register → creates Agency + Freemium subscription + clones system default Roles
  (Owner, Admin, Property Manager, Accountant, Maintenance Coordinator, Viewer) into agency-scoped
  Role rows + creates first User with the Owner role
- POST /auth/login → JWT (24h), payload includes userId, agencyId, roleId
- JwtStrategy validates token, attaches full user + role + permissions to request
- Build a @RequirePermission('module:action') decorator + PermissionGuard that reads the decorator
  and checks req.user.role.permissions[module][action] === true, else 403
- Apply @RequirePermission to every protected controller method (e.g. @RequirePermission('tenants:create')
  on TenantsController.create)
- Every query additionally scopes by agencyId — RBAC controls WHAT a user can do, agency scoping
  controls WHICH DATA they can see. Both are required on every route.
- Wrap all mutating endpoints in an interceptor that writes an AuditLog row automatically
  (action, entityType, entityId, userId, agencyId, metadata = changed fields)

Verify: a Viewer-role user gets 403 on POST/PATCH/DELETE routes but 200 on GET routes, before continuing.

═══════════════════════════════════════════════════
STEP 4 — Custom / Dynamic Lists System (backend) — CORE REQUIREMENT
═══════════════════════════════════════════════════
This is the generic system that lets every "create new X" form offer both default items and
agency-added custom items, and lets admins manage them centrally. Build it once, reuse everywhere.

Seed script creates global default ListTypes + ListItems (isDefault: true) for:
  unit_type, maintenance_category, vendor_specialty, payment_method, amenity,
  lease_type, document_type, expense_category, nationality

Endpoints:
  GET  /list-types/:key/items          → merged (agency's custom items + global defaults), active only
  POST /list-types/:key/items          → agency creates a new custom item (isDefault: false)
  PATCH /list-items/:id                → rename / reorder / relabel (agency-owned items only)
  PATCH /list-items/:id/deactivate     → soft-disable (works on default items too — never hard-delete
                                          a default item, since it may be referenced by ListType logic)
  DELETE /list-items/:id               → hard-delete allowed ONLY for agency-created custom items
                                          with zero references in dependent tables

Every module that references a ListItem (Unit.unitTypeId, MaintenanceRequest.categoryListItemId,
Vendor.specialtyListItemId, Payment.methodListItemId, Document.documentTypeListItemId,
Expense.categoryListItemId, Tenant.nationalityListItemId, Lease.leaseTypeListItemId) must validate
the referenced ListItem belongs to the correct key and (if not default) the correct agency.

Verify: creating a custom "unit_type" item via API, then referencing it on a new Unit, before continuing.

═══════════════════════════════════════════════════
STEP 5 — Team Members, User Invitation & Role Management (backend)
═══════════════════════════════════════════════════
UsersModule
  GET    /users                    list team members (agency-scoped), status + role shown
  POST   /users/invite             { name, email, roleId } → creates User(status: INVITED),
                                    generates a signed invite token, sends invite email with a
                                    set-password link (stub the email send behind an EmailService
                                    interface for now)
  POST   /users/accept-invite      { token, password } → sets passwordHash, status: ACTIVE
  PATCH  /users/:id/role           change a user's role (requires users:edit permission)
  PATCH  /users/:id/suspend        deactivate a team member without deleting history
  DELETE /users/:id                only allowed if not the last Owner on the agency

RolesModule
  GET    /roles                    list roles for the agency (system-cloned + custom)
  POST   /roles                    create a custom role with a specific permissions JSON
  PATCH  /roles/:id                edit name/permissions (isSystemRole roles: name/permissions
                                    editable, but cannot be deleted)
  DELETE /roles/:id                only if isSystemRole is false and no users currently hold it

Verify: inviting a user, accepting the invite, and logging in with the new account works end-to-end.

═══════════════════════════════════════════════════
STEP 6 — Core Feature Modules with Server-Side Search/Filter/Pagination
═══════════════════════════════════════════════════
Add pg_trgm extension in a migration for fast ILIKE search: CREATE EXTENSION IF NOT EXISTS pg_trgm;
Add GIN trigram indexes on searchable text columns (Property.name/address, Tenant.name/email/phone,
Vendor.name).

Every list endpoint below supports the SAME query contract:
  ?search=text              searches relevant indexed columns server-side (ILIKE + trigram)
  ?filter[field]=value      repeatable, structured filters (status, priority, area, roleId, etc.)
  ?dateFrom=&dateTo=        applied to the relevant date column per resource
  ?sort=field:asc|desc
  ?page=&limit=             offset pagination; response includes { data, total, page, limit }

PropertiesModule    GET /properties  (search: name/address, filter: area)
UnitsModule         GET /properties/:id/units  (filter: status, unitTypeId, bedrooms)
TenantsModule       GET /tenants  (search: name/email/phone, filter: nationalityListItemId)
LeasesModule        GET /leases  (filter: status, expiringInDays, propertyId)
PaymentsModule      GET /payments  (filter: status, methodListItemId, propertyId, month)
                     GET /payments/summary → { collected, outstanding, overdue }
MaintenanceModule   GET /maintenance  (filter: status, priority, categoryListItemId, vendorId)
VendorsModule       GET /vendors  (search: name, filter: specialtyListItemId, isActive)
ExpensesModule      GET /expenses  (filter: propertyId, categoryListItemId, dateFrom/dateTo)

All list/detail/create/update/delete routes use @RequirePermission from Step 3.

Verify: search + at least 2 combined filters return correct paginated results against seeded data.

═══════════════════════════════════════════════════
STEP 7 — Supporting Modules (backend)
═══════════════════════════════════════════════════
NotificationsModule
  GET  /notifications?unread=true    list, agency + optionally user scoped
  PATCH /notifications/:id/read
  Trigger notifications on: lease expiring in 30/14/7 days, payment overdue, maintenance assigned

AuditLogModule
  GET /audit-logs?userId=&entityType=&dateFrom=&dateTo=   (requires a permission like audit:view,
  typically Owner/Admin only)

DocumentsModule
  POST /documents/upload    multipart upload → S3-compatible storage, returns fileUrl
  GET  /documents?tenantId=&leaseId=&maintenanceRequestId=
  DELETE /documents/:id

RenewalsModule (lease renewal workflow)
  POST  /leases/:id/renewal-requests        propose new rent/end date
  PATCH /renewal-requests/:id/approve       creates/updates the Lease, sets status ACTIVE
  PATCH /renewal-requests/:id/reject

BillingModule
  GET  /billing/plan             current plan, unitLimit, current unit usage
  GET  /billing/plans            all available SubscriptionPlan options
  POST /billing/change-plan      upgrade/downgrade (stub payment provider call)
  Enforce unitLimit: creating a Unit beyond the agency's plan limit returns 402 Payment Required
  with a clear error the frontend can show as an upgrade prompt

Verify each module independently against seeded data before continuing.

═══════════════════════════════════════════════════
STEP 8 — Dashboard & Reports API
═══════════════════════════════════════════════════
GET /dashboard/kpis              occupancyRate, monthlyRevenue, pendingMaintenance, renewalsDue
GET /dashboard/revenue-chart     last 6 months billed vs collected
GET /reports/occupancy?dateFrom=&dateTo=
GET /reports/revenue?dateFrom=&dateTo=&propertyId=
GET /reports/maintenance-cost?dateFrom=&dateTo=

═══════════════════════════════════════════════════
STEP 9 — Frontend Design Foundation
═══════════════════════════════════════════════════
tailwind.config.ts tokens (unchanged from prior spec — single source of truth, never hard-code hex):
  maroon: {900:'#4A0F22',700:'#6E1731',600:'#7F1B39'}  gold:{500:'#B9924A',300:'#D9BE8C'}
  sand:{100:'#F4EFE4',50:'#FBF9F3'}  ink:{900:'#221E1C',600:'#5B534C',400:'#8B8279'}  line:'#E4DCCB'
  green:{600:'#3F7A5C',100:'#E4EFE7'}  amber:{600:'#A9711C',100:'#F5E7CE'}  red:{600:'#A23B3B',100:'#F5E1E1'}
  fontFamily:{display:['Fraunces','serif'],sans:['Manrope','sans-serif']}  borderRadius:{sm:'3px',md:'6px'}

Shared primitives (components/ui/):
  KpiCard, Panel, StatusPill, DataTable — now with BUILT-IN server-side search box, filter chips,
    column sort, and pagination controls wired to the query-contract from Step 6
  ComboBoxWithAddNew — the dynamic-list dropdown: shows items from GET /list-types/:key/items,
    has an "+ Add [typed text]" row at the bottom when no exact match exists, opens a lightweight
    inline create (POST /list-types/:key/items) and auto-selects the new item. Used everywhere a
    ListItem foreign key is set (unit type, maintenance category, vendor specialty, payment method,
    document type, expense category, nationality, lease type).
  PermissionGate — wraps UI (buttons, nav items, entire routes) and hides/disables children when
    the current user's role lacks the given permission, reading from the auth store's cached role.

═══════════════════════════════════════════════════
STEP 10 — Frontend Auth, RBAC-Aware Routing & API Layer
═══════════════════════════════════════════════════
- lib/api.ts axios instance, JWT attached from Zustand store
- React Query hook per resource, all accepting { search, filters, sort, page, limit } and passing
  them straight through as query params (matches Step 6 contract)
- Zustand auth store holds user + role + permissions after login; PermissionGate and route guards
  read from it
- ProtectedRoute + RoleProtectedRoute (redirects to a friendly "not authorized" page, not a blank
  screen, if the user's role lacks access to a whole section like Settings > Billing)
- Login, Accept-Invite (set password), and Forgot-Password pages

Verify: a Property Manager role sees Properties/Tenants/Maintenance but not Settings > Billing;
an Owner sees everything.

═══════════════════════════════════════════════════
STEP 11 — Build Core Views (wired to real API + server-side search)
═══════════════════════════════════════════════════
1. Dashboard — KPIs, revenue chart, upcoming renewals, recent maintenance
2. Properties — grid + detail with units, uses ComboBoxWithAddNew for unit type on the unit form
3. Tenants — DataTable with server-side search box + nationality filter, detail panel with lease
   history, documents tab (upload via DocumentsModule)
4. Leases — list + renewal workflow UI (propose renewal → pending badge → approve/reject for
   users with leases:approve permission)
5. Maintenance — kanban board, category/vendor pickers use ComboBoxWithAddNew, document attachments
   for photos
6. Payments — ledger with server-side filters (status/method/property/month), summary strip,
   mark-as-paid action
7. Vendors — standalone list + detail, specialty picker uses ComboBoxWithAddNew
8. Expenses — list per property, category picker uses ComboBoxWithAddNew, feeds Reports
9. Reports — date range + type selector + preview, exportable
10. Notifications — bell dropdown in Topbar wired to GET /notifications, mark-as-read

Verify: every list screen's search box and filters actually hit the server (network tab shows the
query params), not a client-side filter of an already-fetched full list.

═══════════════════════════════════════════════════
STEP 12 — Team & Roles Pages
═══════════════════════════════════════════════════
Settings > Team
  - Table of team members: name, email, role badge, status (Invited/Active/Suspended), last login
  - "Invite member" button → modal (name, email, role dropdown) → calls POST /users/invite
  - Row actions: change role, suspend, remove (respecting the "can't remove last Owner" rule)

Settings > Roles & Permissions
  - List of roles (system + custom), with a "Create custom role" button
  - Permission matrix editor: rows = modules (Properties, Tenants, Leases, Payments, Maintenance,
    Vendors, Reports, Settings, Users, Billing), columns = actions (View, Create, Edit, Delete,
    Approve where relevant) — checkbox grid bound to the Role.permissions JSON
  - System roles: name/permissions editable, delete disabled with an explained tooltip

═══════════════════════════════════════════════════
STEP 13 — Agency & System Settings (expanded, powerful)
═══════════════════════════════════════════════════
Settings > Profile      agency name, logo upload, address, trade license, tax/VAT number
Settings > Team         (Step 12)
Settings > Roles        (Step 12)
Settings > Custom Lists Tabs per ListType key (Unit Types, Maintenance Categories, Vendor
                        Specialties, Payment Methods, Amenities, Lease Types, Document Types,
                        Expense Categories, Nationalities). Each tab: table of items (default +
                        custom), add/rename/reorder/deactivate. Default items show a "default"
                        badge and can be deactivated but never deleted; custom items can be fully
                        deleted if unreferenced.
Settings > Integrations WhatsApp Business API credentials, payment gateway (Fatora/Dibsy) API
                        keys, Google Maps API key — masked input fields, "test connection" button
Settings > Notifications per-event toggles (email / WhatsApp / in-app) for renewal reminders,
                        payment overdue, maintenance assigned, new team member invited
Settings > Billing      current plan + unit usage bar, plan comparison cards, upgrade/downgrade,
                        invoice history table
Settings > Audit Log    filterable table (user, action, entity, date range) reading AuditLog
Settings > Data Export  CSV export buttons per major resource (Tenants, Leases, Payments)

All Settings sub-pages wrapped in PermissionGate (e.g. Billing and Roles visible to Owner/Admin only).

═══════════════════════════════════════════════════
STEP 14 — Tenant Self-Service Portal
═══════════════════════════════════════════════════
Separate lightweight route tree (/portal/*) for tenant-role logins (a Tenant can optionally get a
portal account, linked via Tenant.email matching a limited-scope User with a "Tenant" system role
restricted to their own records only):
  - View my lease (dates, rent, documents)
  - View payment history + status
  - Submit a maintenance request (title, description, category via ComboBoxWithAddNew, photo upload)
  - Track status of my submitted requests

═══════════════════════════════════════════════════
STEP 15 — Bilingual EN / Arabic
═══════════════════════════════════════════════════
Full i18n/en.json + ar.json (every string, including all new Settings/Team/Roles/Custom Lists
screens). dir="rtl" on <html> for Arabic, Tailwind logical properties (ms-/me-/ps-/pe-) throughout,
currency/numbers stay LTR within RTL text.

═══════════════════════════════════════════════════
STEP 16 — Seed Data & Testing
═══════════════════════════════════════════════════
Seed: one Agency, system Roles cloned in, 4-5 Users across different roles, default ListItems per
ListType key, properties/units/tenants/leases/payments/maintenance/vendors/expenses with realistic
Qatar data spanning 6 months, a few custom ListItems to prove the extension path works.

Backend: Jest unit tests per service (including PermissionGuard behavior per role), e2e test per
module. Frontend: Vitest + RTL for DataTable server-search behavior, ComboBoxWithAddNew add-new
flow, and PermissionGate hide/disable behavior.

═══════════════════════════════════════════════════
STEP 17 — Docker & Environment
═══════════════════════════════════════════════════
docker-compose.yml: postgres:16, server (NestJS, runs migrations + seed on first boot), client
(nginx-served Vite build), plus an S3-compatible object storage service (e.g. minio) for Documents.

  # server/.env
  DATABASE_URL=postgresql://rentease:password@postgres:5432/rentease
  JWT_SECRET=<generate a strong secret>
  S3_ENDPOINT=/ S3_BUCKET= / S3_ACCESS_KEY= / S3_SECRET_KEY=
  PORT=4000

  # client/.env
  VITE_API_URL=http://localhost:4000

Verify: `docker-compose up` from a clean clone gives a fully working app — login with a seeded
Owner account, invite a new team member, add a custom unit type from a dropdown, search tenants
server-side, and see the change reflected in the Audit Log.

═══════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════
A complete monorepo with: PostgreSQL + Prisma, a NestJS API enforcing RBAC on every route, a
React + Tailwind frontend with server-side search/filter/pagination on every list screen, a fully
working team/role/invite system, an agency-extensible custom-items system used consistently across
every "create new X" form, powerful multi-tab Settings, and every supporting module (Vendors,
Notifications, Audit Log, Documents, Expenses, Renewals, Billing, Tenant Portal). No mock data
remains anywhere in the final build. Confirm each STEP is verified before starting the next.