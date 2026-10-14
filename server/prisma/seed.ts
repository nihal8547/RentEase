import { PrismaClient, UserStatus, UnitStatus, LeaseStatus, RenewalStatus, PaymentStatus, Priority, ReqStatus, ChequeStatus, TawtheeqStatus, InspectionType, InspectionStatus, PayoutStatus, CommChannel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// System Permission Templates
const PERMISSIONS = {
  OWNER: {
    properties: { view: true, create: true, edit: true, delete: true },
    tenants: { view: true, create: true, edit: true, delete: true },
    leases: { view: true, create: true, edit: true, delete: true, approve: true },
    payments: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    vendors: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true },
    users: { view: true, create: true, edit: true, delete: true },
    billing: { view: true, edit: true },
  },
  ADMIN: {
    properties: { view: true, create: true, edit: true, delete: true },
    tenants: { view: true, create: true, edit: true, delete: true },
    leases: { view: true, create: true, edit: true, delete: true, approve: true },
    payments: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    vendors: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true },
    users: { view: true, create: true, edit: true, delete: true },
    billing: { view: true, edit: true },
  },
  PROPERTY_MANAGER: {
    properties: { view: true, create: true, edit: true, delete: false },
    tenants: { view: true, create: true, edit: true, delete: false },
    leases: { view: true, create: true, edit: true, delete: false, approve: false },
    payments: { view: true, create: false, edit: false, delete: false },
    maintenance: { view: true, create: true, edit: true, delete: false },
    vendors: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, export: false },
    settings: { view: false, edit: false },
    users: { view: false, create: false, edit: false, delete: false },
    billing: { view: false, edit: false },
  },
  ACCOUNTANT: {
    properties: { view: true, create: false, edit: false, delete: false },
    tenants: { view: true, create: false, edit: false, delete: false },
    leases: { view: true, create: false, edit: false, delete: false, approve: false },
    payments: { view: true, create: true, edit: true, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    vendors: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, export: true },
    settings: { view: false, edit: false },
    users: { view: false, create: false, edit: false, delete: false },
    billing: { view: true, edit: false },
  },
  MAINTENANCE_COORDINATOR: {
    properties: { view: true, create: false, edit: false, delete: false },
    tenants: { view: true, create: false, edit: false, delete: false },
    leases: { view: false, create: false, edit: false, delete: false, approve: false },
    payments: { view: false, create: false, edit: false, delete: false },
    maintenance: { view: true, create: true, edit: true, delete: false },
    vendors: { view: true, create: true, edit: true, delete: false },
    reports: { view: false, export: false },
    settings: { view: false, edit: false },
    users: { view: false, create: false, edit: false, delete: false },
    billing: { view: false, edit: false },
  },
  VIEWER: {
    properties: { view: true, create: false, edit: false, delete: false },
    tenants: { view: true, create: false, edit: false, delete: false },
    leases: { view: true, create: false, edit: false, delete: false, approve: false },
    payments: { view: true, create: false, edit: false, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    vendors: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, export: false },
    settings: { view: false, edit: false },
    users: { view: false, create: false, edit: false, delete: false },
    billing: { view: false, edit: false },
  },
};

async function main() {
  console.log('Seeding RentEase v2 Qatar Real Estate Platform...');

  // 1. Clean existing records in cascade order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.renewalRequest.deleteMany();
  await prisma.communicationLog.deleteMany();
  await prisma.ownerPayout.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.tawtheeqRegistration.deleteMany();
  await prisma.cheque.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.listItem.deleteMany();
  await prisma.listType.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.subscriptionPlan.deleteMany();

  // 2. Seed Subscription Plans
  console.log('Seeding Subscription Plans...');
  const plans = {
    freemium: await prisma.subscriptionPlan.create({
      data: { name: 'Freemium', priceQar: 0, unitLimit: 5 },
    }),
    starter: await prisma.subscriptionPlan.create({
      data: { name: 'Starter', priceQar: 499, unitLimit: 25 },
    }),
    agency: await prisma.subscriptionPlan.create({
      data: { name: 'Agency', priceQar: 1499, unitLimit: 100 },
    }),
    enterprise: await prisma.subscriptionPlan.create({
      data: { name: 'Enterprise', priceQar: 3999, unitLimit: null as any }, // null = unlimited
    }),
  };

  // 3. Seed Global ListTypes & Default ListItems
  console.log('Seeding Global List Types & Default Items...');
  const listTypeDefinitions = [
    {
      key: 'unit_type',
      label: 'Unit Types',
      items: [
        { value: 'apartment', label: 'Apartment' },
        { value: 'villa', label: 'Villa' },
        { value: 'penthouse', label: 'Penthouse' },
        { value: 'studio', label: 'Studio' },
        { value: 'duplex', label: 'Duplex' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'office', label: 'Commercial Office' },
      ],
    },
    {
      key: 'maintenance_category',
      label: 'Maintenance Categories',
      items: [
        { value: 'hvac', label: 'HVAC & Air Conditioning' },
        { value: 'plumbing', label: 'Plumbing & Drainage' },
        { value: 'electrical', label: 'Electrical & Power' },
        { value: 'structural', label: 'Structural & Glass' },
        { value: 'appliance', label: 'Major Appliances' },
        { value: 'pest_control', label: 'Pest Control' },
        { value: 'painting', label: 'Painting & Masonry' },
      ],
    },
    {
      key: 'vendor_specialty',
      label: 'Vendor Specialties',
      items: [
        { value: 'hvac_climate', label: 'HVAC / Climate Control' },
        { value: 'plumbing_sanitary', label: 'Plumbing & Sanitary' },
        { value: 'electrical_engineering', label: 'Electrical Engineering' },
        { value: 'glazing_facades', label: 'Glazing & Facades' },
        { value: 'carpentry', label: 'General Carpentry & Fitout' },
        { value: 'cleaning', label: 'Cleaning & Sanitization' },
      ],
    },
    {
      key: 'payment_method',
      label: 'Payment Methods',
      items: [
        { value: 'fatora', label: 'Fatora Gateway (Card/Debit)' },
        { value: 'dibsy', label: 'Dibsy Direct Pay' },
        { value: 'cheque', label: 'Post-Dated Cheque (PDC)' },
        { value: 'bank_transfer', label: 'QNB / Direct Bank Transfer' },
        { value: 'cash', label: 'Cash Receipt' },
      ],
    },
    {
      key: 'amenity',
      label: 'Amenities',
      items: [
        { value: 'pool', label: 'Swimming Pool' },
        { value: 'gym', label: 'Fitness Center / Gym' },
        { value: 'concierge', label: '24/7 Concierge' },
        { value: 'parking', label: 'Covered Allocated Parking' },
        { value: 'sea_view', label: 'Direct Sea / Marina View' },
        { value: 'balcony', label: 'Private Balcony' },
        { value: 'central_ac', label: 'Central District Cooling' },
      ],
    },
    {
      key: 'lease_type',
      label: 'Lease Types',
      items: [
        { value: 'standard_12m', label: 'Standard Residential (12 Months)' },
        { value: 'commercial', label: 'Commercial Corporate Lease' },
        { value: 'short_term', label: 'Short-Term Serviced (6 Months)' },
        { value: 'diplomatic', label: 'Diplomatic Tenancy' },
      ],
    },
    {
      key: 'document_type',
      label: 'Document Types',
      items: [
        { value: 'qid', label: 'Qatar ID (QID) Copy' },
        { value: 'tawtheeq_lease', label: 'Tawtheeq Registered Contract' },
        { value: 'passport', label: 'Passport & Residency Permit' },
        { value: 'bank_statement', label: 'Salary Certificate / Bank Statement' },
        { value: 'deposit_receipt', label: 'Security Deposit Receipt' },
        { value: 'maintenance_photo', label: 'Maintenance Job Inspection Photo' },
      ],
    },
    {
      key: 'expense_category',
      label: 'Expense Categories',
      items: [
        { value: 'facility_maintenance', label: 'Facility Maintenance & Repair' },
        { value: 'kahramaa_utility', label: 'Kahramaa Water & Electricity' },
        { value: 'baladiya_fee', label: 'Baladiya Municipality Fee' },
        { value: 'security_services', label: 'Security & Surveillance' },
        { value: 'insurance', label: 'Property & Fire Insurance' },
        { value: 'marketing', label: 'Listing & Portal Marketing' },
      ],
    },
    {
      key: 'nationality',
      label: 'Nationalities',
      items: [
        { value: 'qatar', label: 'Qatari' },
        { value: 'united_kingdom', label: 'British' },
        { value: 'france', label: 'French' },
        { value: 'lebanon', label: 'Lebanese' },
        { value: 'india', label: 'Indian' },
        { value: 'egypt', label: 'Egyptian' },
        { value: 'jordan', label: 'Jordanian' },
        { value: 'united_states', label: 'American' },
        { value: 'philippines', label: 'Filipino' },
        { value: 'pakistan', label: 'Pakistani' },
        { value: 'italy', label: 'Italian' },
        { value: 'canada', label: 'Canadian' },
      ],
    },
  ];

  const cachedListItems: Record<string, Record<string, string>> = {};

  for (const def of listTypeDefinitions) {
    const listType = await prisma.listType.create({
      data: {
        agencyId: null, // Global default
        key: def.key,
        label: def.label,
      },
    });

    cachedListItems[def.key] = {};

    for (let i = 0; i < def.items.length; i++) {
      const itemDef = def.items[i];
      const item = await prisma.listItem.create({
        data: {
          listTypeId: listType.id,
          value: itemDef.value,
          label: itemDef.label,
          isDefault: true,
          isActive: true,
          sortOrder: i,
        },
      });
      cachedListItems[def.key][itemDef.value] = item.id;
    }
  }

  // 4. Seed System Default Roles (agencyId = null, isSystemRole = true)
  console.log('Seeding System Default Roles...');
  const systemRoles = {
    owner: await prisma.role.create({
      data: { name: 'Owner', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.OWNER },
    }),
    admin: await prisma.role.create({
      data: { name: 'Admin', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.ADMIN },
    }),
    propertyManager: await prisma.role.create({
      data: { name: 'Property Manager', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.PROPERTY_MANAGER },
    }),
    accountant: await prisma.role.create({
      data: { name: 'Accountant', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.ACCOUNTANT },
    }),
    maintenanceCoordinator: await prisma.role.create({
      data: { name: 'Maintenance Coordinator', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.MAINTENANCE_COORDINATOR },
    }),
    viewer: await prisma.role.create({
      data: { name: 'Viewer', agencyId: null, isSystemRole: true, permissions: PERMISSIONS.VIEWER },
    }),
  };

  // 5. Seed Primary Doha Agency
  console.log('Creating Primary Doha Agency...');
  const agency = await prisma.agency.create({
    data: {
      name: 'Al Rayyan Real Estate W.L.L.',
      tradeLicense: 'CR 104829/QA',
      taxNumber: 'BLD-99201-DHA',
      address: 'Level 18, Al Fardan Towers, West Bay, Doha, Qatar',
      planId: plans.agency.id,
      unitLimit: plans.agency.unitLimit,
    },
  });

  // Clone system default roles into agency-scoped roles for Al Rayyan
  console.log('Cloning Roles for Agency...');
  const agencyRoles = {
    owner: await prisma.role.create({
      data: { name: 'Owner', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.OWNER },
    }),
    admin: await prisma.role.create({
      data: { name: 'Admin', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.ADMIN },
    }),
    propertyManager: await prisma.role.create({
      data: { name: 'Property Manager', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.PROPERTY_MANAGER },
    }),
    accountant: await prisma.role.create({
      data: { name: 'Accountant', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.ACCOUNTANT },
    }),
    maintenanceCoordinator: await prisma.role.create({
      data: { name: 'Maintenance Coordinator', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.MAINTENANCE_COORDINATOR },
    }),
    viewer: await prisma.role.create({
      data: { name: 'Viewer', agencyId: agency.id, isSystemRole: false, permissions: PERMISSIONS.VIEWER },
    }),
  };

  // Seed a sample Custom List Item for this Agency to prove extensibility
  const unitTypeListType = await prisma.listType.findFirst({ where: { key: 'unit_type', agencyId: null } });
  if (unitTypeListType) {
    const customItem = await prisma.listItem.create({
      data: {
        listTypeId: unitTypeListType.id,
        value: 'chalet',
        label: 'Coastal Chalet (Simaisma / Al Wakra)',
        isDefault: false,
        isActive: true,
        sortOrder: 99,
      },
    });
    cachedListItems['unit_type']['chalet'] = customItem.id;
  }

  // 6. Seed Users across Roles
  console.log('Seeding Agency Admin User...');
  const adminPasswordHash = await bcrypt.hash('Adm@1123', 10);
  const adminUser = await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.admin.id,
      name: 'System Admin',
      email: 'admin@webbea.com',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    },
  });

  console.log('✅ RentEase v2 database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
