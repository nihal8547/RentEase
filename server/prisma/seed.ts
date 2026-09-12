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
    users: { view: true, create: true, edit: true, delete: false },
    billing: { view: true, edit: false },
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
  console.log('Seeding Agency Users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const ownerUser = await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.owner.id,
      name: 'Tariq Al-Mansoor',
      email: 't.almansoor@alrayyan.qa',
      passwordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.admin.id,
      name: 'Fatima Al-Kuwari',
      email: 'fatima.k@alrayyan.qa',
      passwordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 4),
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.propertyManager.id,
      name: 'Kareem Mahmoud',
      email: 'kareem.m@alrayyan.qa',
      passwordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  });

  await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.accountant.id,
      name: 'Salwa Hassan',
      email: 'salwa.h@alrayyan.qa',
      passwordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
  });

  await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.maintenanceCoordinator.id,
      name: 'Ziad Rashid',
      email: 'ziad.r@alrayyan.qa',
      passwordHash,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 8),
    },
  });

  await prisma.user.create({
    data: {
      agencyId: agency.id,
      roleId: agencyRoles.viewer.id,
      name: 'Hassan Al-Nuaimi',
      email: 'hassan.invited@alrayyan.qa',
      status: UserStatus.INVITED,
      invitedAt: new Date(),
    },
  });

  // 7. Seed Properties in Qatar
  console.log('Seeding Properties...');
  const propPearl = await prisma.property.create({
    data: {
      agencyId: agency.id,
      name: 'Porto Arabia Tower 12',
      area: 'The Pearl-Qatar',
      address: 'Porto Arabia Marina Promenade, Doha, Qatar',
      zoneNumber: '66',
      streetNumber: '850',
      buildingNumber: '12',
      pinNumber: '91028301',
      kahramaaMeter: 'KHM-982104-DHA',
      ownerName: 'Sheikh Khalid Bin Hamad Al-Thani',
      ownerPhone: '+974 5512 8899',
      ownerIban: 'QA55QNBA00000000192837465',
      totalFloors: 18,
    },
  });

  const propLusail = await prisma.property.create({
    data: {
      agencyId: agency.id,
      name: 'Marina Waterfront Heights',
      area: 'Lusail Marina',
      address: 'Marina Boulevard, Lusail City, Qatar',
      zoneNumber: '69',
      streetNumber: '300',
      buildingNumber: '45',
      pinNumber: '92837102',
      kahramaaMeter: 'KHM-662910-LSL',
      ownerName: 'Abdulrahman Al-Kuwari',
      ownerPhone: '+974 6622 3344',
      ownerIban: 'QA12CBQA00000000987654321',
      totalFloors: 24,
    },
  });

  const propWestBay = await prisma.property.create({
    data: {
      agencyId: agency.id,
      name: 'West Bay Diplomatic Compound',
      area: 'West Bay',
      address: 'Diplomatic Street, West Bay, Doha, Qatar',
      zoneNumber: '60',
      streetNumber: '102',
      buildingNumber: '8',
      pinNumber: '88392019',
      kahramaaMeter: 'KHM-440291-WB',
      ownerName: 'Nasser Al-Attiyah Properties',
      ownerPhone: '+974 3300 7711',
      ownerIban: 'QA33DHBK00000000456123789',
      totalFloors: 4,
    },
  });

  // 8. Seed Units
  console.log('Seeding Units...');
  const aptType = cachedListItems['unit_type']['apartment'];
  const penthouseType = cachedListItems['unit_type']['penthouse'];
  const villaType = cachedListItems['unit_type']['villa'];

  const u1 = await prisma.unit.create({
    data: {
      propertyId: propPearl.id,
      unitNumber: 'Apt 1402',
      floor: 14,
      bedrooms: 2,
      bathrooms: 3,
      sizeSqm: 145.0,
      unitTypeId: aptType,
      status: UnitStatus.OCCUPIED,
    },
  });

  const u2 = await prisma.unit.create({
    data: {
      propertyId: propPearl.id,
      unitNumber: 'Apt 1403',
      floor: 14,
      bedrooms: 1,
      bathrooms: 2,
      sizeSqm: 95.0,
      unitTypeId: aptType,
      status: UnitStatus.OCCUPIED,
    },
  });

  const u3 = await prisma.unit.create({
    data: {
      propertyId: propPearl.id,
      unitNumber: 'Penthouse 2201',
      floor: 22,
      bedrooms: 4,
      bathrooms: 5,
      sizeSqm: 420.0,
      unitTypeId: penthouseType,
      status: UnitStatus.VACANT,
    },
  });

  const u4 = await prisma.unit.create({
    data: {
      propertyId: propLusail.id,
      unitNumber: 'Apt 804',
      floor: 8,
      bedrooms: 2,
      bathrooms: 2,
      sizeSqm: 130.0,
      unitTypeId: aptType,
      status: UnitStatus.OCCUPIED,
    },
  });

  const u5 = await prisma.unit.create({
    data: {
      propertyId: propLusail.id,
      unitNumber: 'Apt 902',
      floor: 9,
      bedrooms: 3,
      bathrooms: 4,
      sizeSqm: 185.0,
      unitTypeId: aptType,
      status: UnitStatus.OCCUPIED,
    },
  });

  const u6 = await prisma.unit.create({
    data: {
      propertyId: propLusail.id,
      unitNumber: 'Apt 501',
      floor: 5,
      bedrooms: 1,
      bathrooms: 1,
      sizeSqm: 80.0,
      unitTypeId: aptType,
      status: UnitStatus.MAINTENANCE,
    },
  });

  const u7 = await prisma.unit.create({
    data: {
      propertyId: propWestBay.id,
      unitNumber: 'Villa 09',
      floor: 2,
      bedrooms: 5,
      bathrooms: 6,
      sizeSqm: 580.0,
      unitTypeId: villaType,
      status: UnitStatus.OCCUPIED,
    },
  });

  const u8 = await prisma.unit.create({
    data: {
      propertyId: propWestBay.id,
      unitNumber: 'Villa 12',
      floor: 2,
      bedrooms: 5,
      bathrooms: 6,
      sizeSqm: 580.0,
      unitTypeId: villaType,
      status: UnitStatus.VACANT,
    },
  });

  // 9. Seed Vendors
  console.log('Seeding Vendors...');
  const vHvac = await prisma.vendor.create({
    data: {
      agencyId: agency.id,
      name: 'Doha Climatech W.L.L.',
      phone: '+974 4488 2211',
      specialtyListItemId: cachedListItems['vendor_specialty']['hvac_climate'],
      rating: 4.8,
      isActive: true,
    },
  });

  const vGlaze = await prisma.vendor.create({
    data: {
      agencyId: agency.id,
      name: 'Al-Mana Glazing & Facades',
      phone: '+974 4433 9900',
      specialtyListItemId: cachedListItems['vendor_specialty']['glazing_facades'],
      rating: 4.6,
      isActive: true,
    },
  });

  const vVolt = await prisma.vendor.create({
    data: {
      agencyId: agency.id,
      name: 'Doha Volt Electrical Engineering',
      phone: '+974 4455 1177',
      specialtyListItemId: cachedListItems['vendor_specialty']['electrical_engineering'],
      rating: 4.9,
      isActive: true,
    },
  });

  // 10. Seed Tenants
  console.log('Seeding Tenants...');
  const t1 = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'Nasser Al-Kuwari',
      email: 'nasser.kuwari@qatar.net.qa',
      phone: '+974 5521 8899',
      nationalityListItemId: cachedListItems['nationality']['qatar'],
    },
  });

  const t2 = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'Alexander Wright',
      email: 'a.wright@shell.qa',
      phone: '+974 6690 1234',
      nationalityListItemId: cachedListItems['nationality']['united_kingdom'],
    },
  });

  const t3 = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'Dr. Layla Mansour',
      email: 'layla.mansour@sidra.org',
      phone: '+974 3311 4455',
      nationalityListItemId: cachedListItems['nationality']['lebanon'],
    },
  });

  const t4 = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'Pierre Laurent',
      email: 'p.laurent@totalenergies.qa',
      phone: '+974 7744 5522',
      nationalityListItemId: cachedListItems['nationality']['france'],
    },
  });

  const t5 = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'His Excellency Ambassador Jean-Paul',
      email: 'amb.office@embassy.qa',
      phone: '+974 5500 9911',
      nationalityListItemId: cachedListItems['nationality']['france'],
    },
  });

  // 11. Seed Leases & Renewals
  console.log('Seeding Leases & Renewals...');
  const leaseStd = cachedListItems['lease_type']['standard_12m'];
  const leaseDip = cachedListItems['lease_type']['diplomatic'];

  // Expiring in 18 days (Renewal due)
  const l1 = await prisma.lease.create({
    data: {
      unitId: u1.id,
      tenantId: t1.id,
      leaseTypeListItemId: leaseStd,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-09-28'),
      rentAmount: 14500,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Active Lease
  const l2 = await prisma.lease.create({
    data: {
      unitId: u2.id,
      tenantId: t2.id,
      leaseTypeListItemId: leaseStd,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      rentAmount: 9500,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Active Lease
  const l3 = await prisma.lease.create({
    data: {
      unitId: u4.id,
      tenantId: t3.id,
      leaseTypeListItemId: leaseStd,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
      rentAmount: 13000,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Active Lease with Renewal Pending
  const l4 = await prisma.lease.create({
    data: {
      unitId: u5.id,
      tenantId: t4.id,
      leaseTypeListItemId: leaseStd,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-10-31'),
      rentAmount: 17000,
      status: LeaseStatus.RENEWAL_PENDING,
    },
  });

  // Diplomatic Lease
  const l5 = await prisma.lease.create({
    data: {
      unitId: u7.id,
      tenantId: t5.id,
      leaseTypeListItemId: leaseDip,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      rentAmount: 38000,
      status: LeaseStatus.ACTIVE,
    },
  });

  // Renewal Request for l4
  await prisma.renewalRequest.create({
    data: {
      leaseId: l4.id,
      proposedRentAmount: 18500,
      proposedEndDate: new Date('2027-10-31'),
      status: RenewalStatus.PENDING,
      requestedById: pmUser.id,
    },
  });

  // 12. Seed Payments (6 Months history)
  console.log('Seeding Payments...');
  const payFatora = cachedListItems['payment_method']['fatora'];
  const payDibsy = cachedListItems['payment_method']['dibsy'];
  const payCheque = cachedListItems['payment_method']['cheque'];
  const payBank = cachedListItems['payment_method']['bank_transfer'];

  // Current Month Paid
  await prisma.payment.create({
    data: {
      leaseId: l1.id,
      amount: 14500,
      dueDate: new Date('2026-09-01'),
      paidDate: new Date('2026-09-02'),
      status: PaymentStatus.PAID,
      methodListItemId: payFatora,
    },
  });

  await prisma.payment.create({
    data: {
      leaseId: l2.id,
      amount: 9500,
      dueDate: new Date('2026-09-01'),
      paidDate: new Date('2026-09-03'),
      status: PaymentStatus.PAID,
      methodListItemId: payDibsy,
    },
  });

  await prisma.payment.create({
    data: {
      leaseId: l3.id,
      amount: 13000,
      dueDate: new Date('2026-09-01'),
      paidDate: new Date('2026-09-01'),
      status: PaymentStatus.PAID,
      methodListItemId: payBank,
    },
  });

  // Overdue payment
  await prisma.payment.create({
    data: {
      leaseId: l4.id,
      amount: 17000,
      dueDate: new Date('2026-09-01'),
      status: PaymentStatus.OVERDUE,
      methodListItemId: payCheque,
    },
  });

  // Diplomatic payment
  await prisma.payment.create({
    data: {
      leaseId: l5.id,
      amount: 38000,
      dueDate: new Date('2026-09-01'),
      paidDate: new Date('2026-08-30'),
      status: PaymentStatus.PAID,
      methodListItemId: payBank,
    },
  });

  // Past months payments
  const pastMonths = [
    { due: new Date('2026-08-01'), paid: new Date('2026-08-02') },
    { due: new Date('2026-07-01'), paid: new Date('2026-07-03') },
    { due: new Date('2026-06-01'), paid: new Date('2026-06-02') },
    { due: new Date('2026-05-01'), paid: new Date('2026-05-04') },
  ];

  for (const m of pastMonths) {
    await prisma.payment.create({
      data: {
        leaseId: l1.id,
        amount: 14500,
        dueDate: m.due,
        paidDate: m.paid,
        status: PaymentStatus.PAID,
        methodListItemId: payFatora,
      },
    });
    await prisma.payment.create({
      data: {
        leaseId: l2.id,
        amount: 9500,
        dueDate: m.due,
        paidDate: m.paid,
        status: PaymentStatus.PAID,
        methodListItemId: payDibsy,
      },
    });
    await prisma.payment.create({
      data: {
        leaseId: l3.id,
        amount: 13000,
        dueDate: m.due,
        paidDate: m.paid,
        status: PaymentStatus.PAID,
        methodListItemId: payBank,
      },
    });
    await prisma.payment.create({
      data: {
        leaseId: l4.id,
        amount: 17000,
        dueDate: m.due,
        paidDate: m.paid,
        status: PaymentStatus.PAID,
        methodListItemId: payCheque,
      },
    });
  }

  // 13. Seed Maintenance Requests
  console.log('Seeding Maintenance Requests...');
  const catHvac = cachedListItems['maintenance_category']['hvac'];
  const catElec = cachedListItems['maintenance_category']['electrical'];
  const catPlumb = cachedListItems['maintenance_category']['plumbing'];
  const catStruct = cachedListItems['maintenance_category']['structural'];

  await prisma.maintenanceRequest.create({
    data: {
      unitId: u1.id,
      tenantId: t1.id,
      categoryListItemId: catHvac,
      title: 'Master Bedroom AC Compressor Malfunction',
      description: 'Chilled water supply valve not opening. Temperature stuck at 26°C despite thermostat set to 20°C.',
      priority: Priority.HIGH,
      status: ReqStatus.OPEN,
      vendorId: vHvac.id,
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      unitId: u4.id,
      tenantId: t3.id,
      categoryListItemId: catElec,
      title: 'Kitchen Dishwasher Power Trip',
      description: 'Main RCD circuit breaker trips when built-in dishwasher wash cycle initiates.',
      priority: Priority.MEDIUM,
      status: ReqStatus.IN_PROGRESS,
      vendorId: vVolt.id,
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      unitId: u7.id,
      tenantId: t5.id,
      categoryListItemId: catPlumb,
      title: 'Water Heater Pressure Valve Leakage',
      description: 'Rooftop solar water heater relief valve dripping steadily into secondary drainage pan.',
      priority: Priority.HIGH,
      status: ReqStatus.OPEN,
      vendorId: null,
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      unitId: u2.id,
      tenantId: t2.id,
      categoryListItemId: catStruct,
      title: 'Balcony Glass Balustrade Seal Re-caulking',
      description: 'Weather strip loose along seaward edge. Completed inspection and silicone replacement.',
      priority: Priority.LOW,
      status: ReqStatus.COMPLETED,
      vendorId: vGlaze.id,
    },
  });

  // 14. Seed Property Expenses
  console.log('Seeding Property Expenses...');
  const expMaint = cachedListItems['expense_category']['facility_maintenance'];
  const expKahramaa = cachedListItems['expense_category']['kahramaa_utility'];
  const expSec = cachedListItems['expense_category']['security_services'];

  await prisma.expense.create({
    data: {
      propertyId: propPearl.id,
      categoryListItemId: expMaint,
      amount: 4200,
      incurredOn: new Date('2026-08-15'),
      note: 'Quarterly district cooling valve overhaul by Qatar Cool certified vendor',
    },
  });

  await prisma.expense.create({
    data: {
      propertyId: propLusail.id,
      categoryListItemId: expKahramaa,
      amount: 2850,
      incurredOn: new Date('2026-08-20'),
      note: 'Common area electricity and water billing for Lusail Marina tower',
    },
  });

  await prisma.expense.create({
    data: {
      propertyId: propWestBay.id,
      categoryListItemId: expSec,
      amount: 6000,
      incurredOn: new Date('2026-09-01'),
      note: 'Gated compound 24/7 static security personnel monthly retainer',
    },
  });

  // 15. Seed Documents
  console.log('Seeding Documents...');
  const docQid = cachedListItems['document_type']['qid'];
  const docLease = cachedListItems['document_type']['tawtheeq_lease'];

  await prisma.document.create({
    data: {
      fileName: 'QID_Nasser_AlKuwari_28463401928.pdf',
      fileUrl: '/uploads/documents/qid_nasser_alkuwari.pdf',
      documentTypeListItemId: docQid,
      tenantId: t1.id,
    },
  });

  await prisma.document.create({
    data: {
      fileName: 'Tawtheeq_Contract_PortoArabia_1402.pdf',
      fileUrl: '/uploads/documents/tawtheeq_porto_arabia_1402.pdf',
      documentTypeListItemId: docLease,
      leaseId: l1.id,
    },
  });

  // 16. Seed Notifications
  console.log('Seeding Notifications...');
  await prisma.notification.create({
    data: {
      agencyId: agency.id,
      userId: ownerUser.id,
      type: 'renewal_due',
      message: 'Lease for Nasser Al-Kuwari (Porto Arabia Tower 12 - Apt 1402) expires in 18 days.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      agencyId: agency.id,
      userId: ownerUser.id,
      type: 'payment_overdue',
      message: 'Rent payment of 17,000 QAR for Pierre Laurent (Marina Waterfront - Apt 902) is overdue.',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      agencyId: agency.id,
      userId: pmUser.id,
      type: 'maintenance_assigned',
      message: 'New Urgent maintenance ticket assigned to Doha Climatech W.L.L. for Apt 1402.',
      isRead: true,
    },
  });

  // 17. Seed Audit Logs
  console.log('Seeding Audit Trail...');
  await prisma.auditLog.create({
    data: {
      agencyId: agency.id,
      userId: ownerUser.id,
      action: 'agency.initialize',
      entityType: 'Agency',
      entityId: agency.id,
      metadata: { plan: 'Agency (100 units)', crNumber: 'CR 104829/QA' },
    },
  });

  await prisma.auditLog.create({
    data: {
      agencyId: agency.id,
      userId: adminUser.id,
      action: 'tenant.create',
      entityType: 'Tenant',
      entityId: t1.id,
      metadata: { name: t1.name, email: t1.email },
    },
  });

  await prisma.auditLog.create({
    data: {
      agencyId: agency.id,
      userId: pmUser.id,
      action: 'renewal.propose',
      entityType: 'RenewalRequest',
      entityId: l4.id,
      metadata: { proposedRent: 18500, currentRent: 17000 },
    },
  });

  // 18. Seed Post-Dated Cheques (PDC Vault)
  console.log('Seeding PDC Vault...');
  // Nasser Al-Kuwari (l1, Porto Arabia Tower 12 - Apt 1402) - QNB Cheques
  const l1Cheques = [
    { num: '009841', due: new Date('2025-10-01'), status: ChequeStatus.CLEARED, dep: new Date('2025-10-02'), clr: new Date('2025-10-03') },
    { num: '009842', due: new Date('2025-11-01'), status: ChequeStatus.CLEARED, dep: new Date('2025-11-02'), clr: new Date('2025-11-03') },
    { num: '009843', due: new Date('2025-12-01'), status: ChequeStatus.CLEARED, dep: new Date('2025-12-02'), clr: new Date('2025-12-04') },
    { num: '009844', due: new Date('2026-01-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-01-02'), clr: new Date('2026-01-04') },
    { num: '009845', due: new Date('2026-02-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-02-02'), clr: new Date('2026-02-03') },
    { num: '009846', due: new Date('2026-03-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-03-02'), clr: new Date('2026-03-03') },
    { num: '009847', due: new Date('2026-04-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-04-02'), clr: new Date('2026-04-03') },
    { num: '009848', due: new Date('2026-05-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-05-02'), clr: new Date('2026-05-03') },
    { num: '009849', due: new Date('2026-06-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-06-02'), clr: new Date('2026-06-04') },
    { num: '009850', due: new Date('2026-07-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-07-02'), clr: new Date('2026-07-03') },
    { num: '009851', due: new Date('2026-08-01'), status: ChequeStatus.CLEARED, dep: new Date('2026-08-02'), clr: new Date('2026-08-03') },
    { num: '009852', due: new Date('2026-09-01'), status: ChequeStatus.DEPOSITED, dep: new Date('2026-09-02'), clr: null },
  ];

  for (const c of l1Cheques) {
    await prisma.cheque.create({
      data: {
        leaseId: l1.id,
        chequeNumber: c.num,
        bankName: 'Qatar National Bank (QNB)',
        drawerName: 'Nasser Al-Kuwari',
        amount: 14500,
        dueDate: c.due,
        status: c.status,
        vaultLocation: 'Safe Box 01 - Shelf B',
        depositDate: c.dep,
        clearedDate: c.clr,
      },
    });
  }

  // Alexander Wright (l2, Marina Waterfront - Apt 204) - Commercial Bank (CBQ)
  const l2Cheques = [
    { num: '441201', due: new Date('2026-01-01'), status: ChequeStatus.CLEARED },
    { num: '441202', due: new Date('2026-02-01'), status: ChequeStatus.CLEARED },
    { num: '441203', due: new Date('2026-03-01'), status: ChequeStatus.CLEARED },
    { num: '441204', due: new Date('2026-04-01'), status: ChequeStatus.CLEARED },
    { num: '441205', due: new Date('2026-05-01'), status: ChequeStatus.CLEARED },
    { num: '441206', due: new Date('2026-06-01'), status: ChequeStatus.CLEARED },
    { num: '441207', due: new Date('2026-07-01'), status: ChequeStatus.CLEARED },
    { num: '441208', due: new Date('2026-08-01'), status: ChequeStatus.CLEARED },
    { num: '441209', due: new Date('2026-09-01'), status: ChequeStatus.PENDING },
    { num: '441210', due: new Date('2026-10-01'), status: ChequeStatus.PENDING },
    { num: '441211', due: new Date('2026-11-01'), status: ChequeStatus.PENDING },
    { num: '441212', due: new Date('2026-12-01'), status: ChequeStatus.PENDING },
  ];

  for (const c of l2Cheques) {
    await prisma.cheque.create({
      data: {
        leaseId: l2.id,
        chequeNumber: c.num,
        bankName: 'Commercial Bank of Qatar (CBQ)',
        drawerName: 'Alexander Wright',
        amount: 9500,
        dueDate: c.due,
        status: c.status,
        vaultLocation: 'Safe Box 02 - Shelf A',
        depositDate: c.status === ChequeStatus.CLEARED ? new Date(c.due.getTime() + 86400000) : null,
        clearedDate: c.status === ChequeStatus.CLEARED ? new Date(c.due.getTime() + 172800000) : null,
      },
    });
  }

  // Pierre Laurent (l4, Marina Waterfront - Apt 902) - Masraf Al Rayyan Cheques (includes 1 Bounced)
  await prisma.cheque.create({
    data: {
      leaseId: l4.id,
      chequeNumber: '889209',
      bankName: 'Masraf Al Rayyan',
      drawerName: 'Pierre Laurent',
      amount: 17000,
      dueDate: new Date('2026-08-01'),
      status: ChequeStatus.BOUNCED,
      vaultLocation: 'Safe Box 01 - Shelf C (Disputed)',
      depositDate: new Date('2026-08-02'),
      bouncedDate: new Date('2026-08-04'),
      bounceReason: 'Insufficient Funds - Return Reason 04',
    },
  });

  await prisma.cheque.create({
    data: {
      leaseId: l4.id,
      chequeNumber: '889210',
      bankName: 'Masraf Al Rayyan',
      drawerName: 'Pierre Laurent',
      amount: 17000,
      dueDate: new Date('2026-09-01'),
      status: ChequeStatus.HELD,
      vaultLocation: 'Safe Box 01 - Shelf C',
      notes: 'Held awaiting replacement manager cheque or bank transfer',
    },
  });

  // H.E. Ambassador Jean-Paul (l5, West Bay Diplomatic Compound - Villa 09) - QNB Corporate Cheque
  await prisma.cheque.create({
    data: {
      leaseId: l5.id,
      chequeNumber: '102901',
      bankName: 'Qatar National Bank (QNB)',
      drawerName: 'Embassy of France / H.E. Jean-Paul',
      amount: 114000, // Quarterly PDC
      dueDate: new Date('2026-10-01'),
      status: ChequeStatus.PENDING,
      vaultLocation: 'High-Value Vault - Box VIP-01',
      notes: 'Quarterly diplomatic advance PDC',
    },
  });

  // 19. Seed Tawtheeq Registrations (Ministry of Justice)
  console.log('Seeding Tawtheeq Registrations...');
  await prisma.tawtheeqRegistration.create({
    data: {
      leaseId: l1.id,
      registrationNumber: 'TWQ-2025-88412',
      status: TawtheeqStatus.APPROVED,
      contractDate: new Date('2025-10-01'),
      expiryDate: new Date('2026-09-28'),
      municipalityFee: 870.0, // 0.5% of 174,000 QAR
      certificateUrl: '/uploads/tawtheeq/TWQ-2025-88412_cert.pdf',
      registeredAt: new Date('2025-10-05'),
    },
  });

  await prisma.tawtheeqRegistration.create({
    data: {
      leaseId: l2.id,
      registrationNumber: 'TWQ-2026-10294',
      status: TawtheeqStatus.APPROVED,
      contractDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      municipalityFee: 570.0, // 0.5% of 114,000 QAR
      certificateUrl: '/uploads/tawtheeq/TWQ-2026-10294_cert.pdf',
      registeredAt: new Date('2026-01-04'),
    },
  });

  await prisma.tawtheeqRegistration.create({
    data: {
      leaseId: l3.id,
      registrationNumber: 'TWQ-2026-33910',
      status: TawtheeqStatus.PENDING_APPROVAL,
      contractDate: new Date('2026-03-01'),
      expiryDate: new Date('2027-02-28'),
      municipalityFee: 780.0, // 0.5% of 156,000 QAR
      registeredAt: new Date('2026-03-02'),
    },
  });

  await prisma.tawtheeqRegistration.create({
    data: {
      leaseId: l4.id,
      registrationNumber: 'TWQ-2025-77192',
      status: TawtheeqStatus.EXPIRED,
      contractDate: new Date('2025-11-01'),
      expiryDate: new Date('2026-10-31'),
      municipalityFee: 1020.0,
      registeredAt: new Date('2025-11-03'),
    },
  });

  await prisma.tawtheeqRegistration.create({
    data: {
      leaseId: l5.id,
      registrationNumber: 'TWQ-2026-00418',
      status: TawtheeqStatus.APPROVED,
      contractDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-12-31'),
      municipalityFee: 4560.0, // 2 years at 38,000/mo = 912,000 * 0.5%
      certificateUrl: '/uploads/tawtheeq/TWQ-2026-00418_cert.pdf',
      registeredAt: new Date('2026-01-03'),
    },
  });

  // 20. Seed Property & Unit Inspections
  console.log('Seeding Inspections...');
  await prisma.inspection.create({
    data: {
      unitId: u1.id,
      leaseId: l1.id,
      type: InspectionType.MOVE_IN,
      status: InspectionStatus.COMPLETED,
      conductedBy: 'Kareem Mahmoud',
      conductedAt: new Date('2025-09-29'),
      electricityMeter: 14205.2,
      waterMeter: 3410.8,
      checklist: {
        livingRoom: { walls: 'Good', floorTiles: 'Clean', acUnit: 'Functional (Chiller OK)', lighting: 'All working' },
        masterBedroom: { ensuiteBath: 'Clean', wardrobe: 'Intact', windows: 'Double glazing verified' },
        kitchen: { oven: 'Tested', refrigerator: 'Cooling at 4C', hoodFilter: 'Brand new' },
        balcony: { railing: 'Secure', seaViewFacing: 'Clear' },
      },
      signatureUrl: '/uploads/inspections/sig_t1_movein.png',
      notes: 'Initial condition excellent. Keys and 2 access cards handed to Mr. Nasser Al-Kuwari.',
    },
  });

  await prisma.inspection.create({
    data: {
      unitId: u2.id,
      leaseId: l2.id,
      type: InspectionType.MOVE_IN,
      status: InspectionStatus.COMPLETED,
      conductedBy: 'Kareem Mahmoud',
      conductedAt: new Date('2025-12-30'),
      electricityMeter: 8120.4,
      waterMeter: 1980.5,
      checklist: {
        livingRoom: { walls: 'Repainted', balconyDoor: 'Lock functional' },
        bedroom: { condition: 'Mint' },
        bathroom: { waterPressure: 'Strong', heater: 'Tested' },
      },
      signatureUrl: '/uploads/inspections/sig_t2_movein.png',
      notes: 'Key handover completed. Kahramaa transfer request submitted.',
    },
  });

  await prisma.inspection.create({
    data: {
      unitId: u6.id,
      type: InspectionType.MOVE_OUT,
      status: InspectionStatus.IN_REVIEW,
      conductedBy: 'Ziad Rashid',
      conductedAt: new Date('2026-09-08'),
      electricityMeter: 16890.1,
      waterMeter: 4890.3,
      deductionsAmount: 2450.0,
      checklist: {
        kitchen: { status: 'Damaged', remarks: 'Countertop chip + burner igniter broken (Deduct 950 QAR)' },
        livingRoom: { status: 'Repaint Required', remarks: 'Heavy wall scuffs across TV panel wall (Deduct 800 QAR)' },
        airConditioning: { status: 'Service needed', remarks: 'FCU coil filter clogged with dust (Deduct 700 QAR)' },
      },
      notes: 'Final move-out snagging. Recommended security deposit deduction of 2,450 QAR. Balance of deposit to be refunded via QNB wire.',
    },
  });

  // 21. Seed Landlord / Owner Remittance Statements
  console.log('Seeding Landlord Remittance Statements...');
  await prisma.ownerPayout.create({
    data: {
      agencyId: agency.id,
      propertyId: propPearl.id,
      periodMonth: '2026-08',
      grossRent: 48500.0,
      expensesDeducted: 4200.0,
      managementCommission: 3880.0, // 8% commission
      netPayout: 40420.0,
      status: PayoutStatus.PAID,
      paymentReference: 'QNB-WIR-8829104',
      paidAt: new Date('2026-09-05'),
      breakdown: {
        collectedRentUnits: ['Apt 1402: 14,500 QAR', 'Apt 804: 18,000 QAR', 'Apt 301: 16,000 QAR'],
        deductedExpenses: ['Doha Climatech HVAC PM: 2,800 QAR', 'Al-Mana Glass Facade Wash: 1,400 QAR'],
        agencyFeeRate: '8.0%',
      },
    },
  });

  await prisma.ownerPayout.create({
    data: {
      agencyId: agency.id,
      propertyId: propLusail.id,
      periodMonth: '2026-08',
      grossRent: 36000.0,
      expensesDeducted: 1800.0,
      managementCommission: 2880.0, // 8% commission
      netPayout: 31320.0,
      status: PayoutStatus.PAID,
      paymentReference: 'CBQ-TRF-5591024',
      paidAt: new Date('2026-09-06'),
      breakdown: {
        collectedRentUnits: ['Apt 204: 9,500 QAR', 'Apt 902: 17,000 QAR', 'Apt 110: 9,500 QAR'],
        deductedExpenses: ['Fire Suppression Inspection: 1,800 QAR'],
        agencyFeeRate: '8.0%',
      },
    },
  });

  await prisma.ownerPayout.create({
    data: {
      agencyId: agency.id,
      propertyId: propWestBay.id,
      periodMonth: '2026-08',
      grossRent: 38000.0,
      expensesDeducted: 0.0,
      managementCommission: 3040.0, // 8% commission
      netPayout: 34960.0,
      status: PayoutStatus.PROCESSING,
      breakdown: {
        collectedRentUnits: ['Villa 09 (French Embassy): 38,000 QAR'],
        deductedExpenses: [],
        agencyFeeRate: '8.0%',
      },
    },
  });

  // 22. Seed WhatsApp & Metrash Communication Logs
  console.log('Seeding Communication Logs...');
  await prisma.communicationLog.create({
    data: {
      agencyId: agency.id,
      recipientPhone: '+974 5521 8899',
      recipientName: 'Nasser Al-Kuwari',
      channel: CommChannel.WHATSAPP,
      templateKey: 'rent_due',
      messageText: 'السيد ناصر الكواري المحترم، تذكير باستحقاق دفعة الإيجار بقيمة 14,500 ر.ق لبرج بورتو أرابيا 12 - شقة 1402. Dear Mr. Nasser, reminder for rent payment of 14,500 QAR.',
      status: 'DELIVERED',
      sentAt: new Date('2026-08-28'),
    },
  });

  await prisma.communicationLog.create({
    data: {
      agencyId: agency.id,
      recipientPhone: '+974 7744 5522',
      recipientName: 'Pierre Laurent',
      channel: CommChannel.WHATSAPP,
      templateKey: 'renewal_60day',
      messageText: 'Dear Mr. Pierre Laurent, your lease for Marina Waterfront Apt 902 expires on 31/10/2026. Please confirm renewal under law No. 4/2008 within 30 days.',
      status: 'READ',
      sentAt: new Date('2026-08-30'),
    },
  });

  await prisma.communicationLog.create({
    data: {
      agencyId: agency.id,
      recipientPhone: '+974 6690 1234',
      recipientName: 'Alexander Wright',
      channel: CommChannel.METRASH_SMS,
      templateKey: 'maintenance_arrival',
      messageText: 'Al Rayyan Real Estate: Technician from Doha Volt Electrical will visit Apt 204 today between 2:00 PM - 4:00 PM. Ref: TKT-0941.',
      status: 'SENT',
      sentAt: new Date('2026-09-02'),
    },
  });

  await prisma.communicationLog.create({
    data: {
      agencyId: agency.id,
      recipientPhone: '+974 5521 8899',
      recipientName: 'Nasser Al-Kuwari',
      channel: CommChannel.WHATSAPP,
      templateKey: 'payment_receipt',
      messageText: 'تم استلام دفعة الإيجار بنجاح بقيمة 14,500 ر.ق لبرج بورتو أرابيا 12. رقم الإيصال: REC-2026-0901. شكراً لكم. Rent payment received.',
      status: 'READ',
      sentAt: new Date('2026-09-02'),
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
