export interface PermissionsMatrix {
  [module: string]: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    approve?: boolean;
    export?: boolean;
    [action: string]: boolean | undefined;
  };
}

export interface Role {
  id: string;
  name: string;
  isSystem?: boolean;
  isSystemRole?: boolean;
  description?: string;
  permissions: any;
  userCount?: number;
}

export type UserStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  agencyId?: string;
  roleId?: string;
  role?: Role | string;
  status?: UserStatus;
  invitedAt?: string;
  lastLoginAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceQar: number;
  unitLimit: number;
}

export interface Agency {
  id: string;
  name: string;
  logoUrl?: string;
  tradeLicense?: string;
  crNumber?: string;
  taxNumber?: string;
  taxCard?: string;
  phone?: string;
  email?: string;
  address?: string;
  planId?: string;
  plan?: SubscriptionPlan;
  unitLimit?: number;
}

export interface ListItem {
  id: string;
  listTypeId?: string;
  value: string;
  label: string;
  labelAr?: string;
  isDefault?: boolean;
  isGlobal?: boolean;
  isActive: boolean;
  sortOrder?: number;
}

export type ListTypeItem = ListItem;

export interface ListType {
  id?: string;
  key: string;
  label: string;
  items: ListItem[];
}

export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';

export interface Unit {
  id: string;
  unitNumber: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  unitTypeId?: string;
  unitTypeName?: string;
  status: UnitStatus;
  propertyId: string;
  propertyName?: string;
  propertyArea?: string;
  tenantName?: string;
  monthlyRentQar?: number;
}

export interface Property {
  id: string;
  name: string;
  code?: string;
  area?: string;
  zoneNumber?: string;
  streetNumber?: string;
  buildingNumber?: string;
  city?: string;
  location?: string;
  propertyType?: string;
  totalUnits?: number;
  occupiedUnits?: number;
  monthlyRollQar?: number;
  agencyId?: string;
  units?: Unit[];
}

export interface Expense {
  id: string;
  agencyId: string;
  propertyId: string;
  property?: Property;
  categoryId: string;
  category?: ListItem;
  amount: number;
  incurredDate: string;
  incurredOn?: string;
  note?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  agencyId: string;
  name: string;
  crNumber?: string;
  specialtyId?: string;
  specialty?: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  rating?: number;
  activeJobsCount?: number;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  fullName: string;
  qid: string;
  passportNo?: string;
  nationality: string;
  phone: string;
  email?: string;
  sponsorName?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  leases?: any[];
  documents?: any[];
}

export interface Lease {
  id: string;
  tenantId?: string;
  tenant?: Tenant;
  tenantName?: string;
  phone?: string;
  unitId?: string;
  unit?: Unit;
  unitNumber?: string;
  propertyName?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  rentQar?: number;
  paymentFrequency?: string;
  securityDeposit?: number;
  tawtheeqNumber?: string;
  tawtheeqStatus?: string;
  status: string;
  latestRenewalRequest?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
