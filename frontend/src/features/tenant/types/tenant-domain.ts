export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TenantUser {
  id: number
  defaultLocationId: number | null
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: 'INVITED' | 'ACTIVE' | 'DISABLED'
  lastLoginAt: string | null
  createdAt: string
  roles: string[]
}

export interface TenantRole {
  id: number
  code: 'DEALERSHIP_ADMIN' | 'SALES_MANAGER' | 'SALESPERSON'
  name: string
  description: string | null
}

export interface TenantLocation {
  id: number
  name: string
  code: string
  addressLine1: string
  addressLine2: string | null
  city: string
  postalCode: string | null
  countryCode: string
  phone: string | null
  email: string | null
  isPrimary: boolean
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export type VehicleStatus =
  | 'DRAFT'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'SOLD'
  | 'ARCHIVED'
export type VehicleCondition = 'NEW' | 'USED'

export interface VehicleListItem {
  id: number
  location: { id: number; name: string; code: string }
  stockNumber: string
  vin: string | null
  condition: VehicleCondition
  status: VehicleStatus
  make: string
  model: string
  trimLevel: string | null
  modelYear: number
  bodyType: string | null
  fuelType: string | null
  transmission: string | null
  drivetrain: string | null
  mileageKm: number
  exteriorColor: string | null
  askingPrice: string | null
  primaryImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface VehicleDetails extends VehicleListItem {
  engineDescription: string | null
  interiorColor: string | null
  registrationNumber: string | null
  firstRegistrationDate: string | null
  acquiredAt: string | null
  purchasePrice?: string | null
  minimumPrice?: string | null
  description: string | null
  createdBy: { id: number; firstName: string; lastName: string }
  updatedBy: { id: number; firstName: string; lastName: string } | null
  deletedAt?: string | null
}

export interface Customer {
  id: number
  customerType: 'INDIVIDUAL' | 'BUSINESS'
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string
  secondaryPhone: string | null
  city: string | null
  countryCode: string | null
  status: 'PROSPECT' | 'CUSTOMER' | 'INACTIVE'
  assignedTo: { id: number; firstName: string; lastName: string } | null
  createdAt: string
  updatedAt: string
  addressLine1?: string | null
  addressLine2?: string | null
  postalCode?: string | null
  notes?: string | null
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST'
export type LeadPriority = 'LOW' | 'NORMAL' | 'HIGH'
export type LeadSource =
  | 'WALK_IN'
  | 'WEBSITE'
  | 'PHONE'
  | 'EMAIL'
  | 'REFERRAL'
  | 'SOCIAL_MEDIA'
  | 'OTHER'

export interface Lead {
  id: number
  location: { id: number; name: string; code: string }
  customer: Pick<
    Customer,
    'id' | 'customerType' | 'firstName' | 'lastName' | 'companyName' | 'phone'
  >
  assignedTo: { id: number; firstName: string; lastName: string } | null
  source: LeadSource
  status: LeadStatus
  priority: LeadPriority
  budgetMin: string | null
  budgetMax: string | null
  nextFollowUpAt: string | null
  createdAt: string
  updatedAt: string
  lastContactAt?: string | null
  convertedAt?: string | null
  lostReason?: string | null
  notes?: string | null
}

export interface LeadActivity {
  id: number
  lead: {
    id: number
    status: LeadStatus
    customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'companyName' | 'phone'>
  }
  user: { id: number; firstName: string; lastName: string }
  activityType: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'FOLLOW_UP' | 'STATUS_CHANGE'
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  subject: string | null
  details: string | null
  outcome: string | null
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadVehicleInterest {
  vehicle: Pick<
    VehicleListItem,
    | 'id'
    | 'stockNumber'
    | 'condition'
    | 'status'
    | 'make'
    | 'model'
    | 'modelYear'
    | 'askingPrice'
    | 'primaryImageUrl'
  >
  isPrimary: boolean
  interestNotes: string | null
  createdAt: string
}

export type TestDriveStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface TestDrive {
  id: number
  location: { id: number; name: string; code: string }
  lead: { id: number; status: LeadStatus } | null
  customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'companyName' | 'phone'>
  vehicle: Pick<VehicleListItem, 'id' | 'stockNumber' | 'make' | 'model' | 'modelYear' | 'status'>
  salesperson: { id: number; firstName: string; lastName: string }
  scheduledStart: string
  scheduledEnd: string
  actualStart: string | null
  actualEnd: string | null
  status: TestDriveStatus
  notes: string | null
  cancellationReason: string | null
  createdAt: string
  updatedAt: string
}

export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'

export interface Offer {
  id: number
  offerNumber: string
  location: { id: number; name: string; code: string }
  lead: { id: number; status: LeadStatus } | null
  customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'companyName' | 'phone'>
  vehicle: Pick<VehicleListItem, 'id' | 'stockNumber' | 'make' | 'model' | 'modelYear' | 'status'>
  salesperson: { id: number; firstName: string; lastName: string }
  vehiclePrice: string
  discountAmount: string
  taxAmount: string
  feeAmount: string
  totalAmount: string
  status: OfferStatus
  validUntil: string | null
  sentAt: string | null
  respondedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED'

export interface Reservation {
  id: number
  reservationNumber: string
  vehicle: Pick<VehicleListItem, 'id' | 'stockNumber' | 'make' | 'model' | 'modelYear' | 'status'>
  customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'companyName' | 'phone'>
  lead: { id: number; status: LeadStatus } | null
  offer: { id: number; offerNumber: string; status: OfferStatus } | null
  salesperson: { id: number; firstName: string; lastName: string }
  agreedPrice: string | null
  status: ReservationStatus
  reservedAt: string
  expiresAt: string
  cancelledAt: string | null
  cancellationReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'EXTERNAL_FINANCING' | 'OTHER'

export interface Sale {
  id: number
  saleNumber: string
  location: { id: number; name: string; code: string }
  customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'companyName' | 'phone'>
  vehicle: Pick<VehicleListItem, 'id' | 'stockNumber' | 'make' | 'model' | 'modelYear' | 'status'>
  salesperson: { id: number; firstName: string; lastName: string }
  lead: { id: number; status: LeadStatus } | null
  offer: { id: number; offerNumber: string; status: OfferStatus } | null
  reservation: { id: number; reservationNumber: string; status: ReservationStatus } | null
  saleDate: string
  vehiclePrice: string
  discountAmount: string
  taxAmount: string
  feeAmount: string
  totalAmount: string
  vehicleCostSnapshot?: string
  paymentMethod: PaymentMethod | null
  status: SaleStatus
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
