import { apiRequest } from '@/lib/api/api-client'
import type {
  Customer,
  Lead,
  LeadActivity,
  LeadVehicleInterest,
  Offer,
  Pagination,
  Reservation,
  Sale,
  TenantLocation,
  TenantRole,
  TenantUser,
  TestDrive,
  VehicleDetails,
  VehicleListItem,
} from '../types/tenant-domain'

type QueryValue = string | number | boolean | null | undefined

function withQuery(path: string, query: Record<string, QueryValue> = {}): string {
  const parameters = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value))
    }
  })
  const search = parameters.toString()
  return search ? `${path}?${search}` : path
}

function tenantRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, authenticated: true })
}

function jsonOptions(method: string, body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

function idempotentJsonOptions(method: string, body?: unknown): RequestInit {
  return {
    ...jsonOptions(method, body),
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  }
}

export async function listTenantUsers(): Promise<TenantUser[]> {
  return (await tenantRequest<{ users: TenantUser[] }>('/api/users')).users
}

export async function listTenantRoles(): Promise<TenantRole[]> {
  return (await tenantRequest<{ roles: TenantRole[] }>('/api/users/roles')).roles
}

export async function createTenantUser(input: Record<string, unknown>): Promise<TenantUser> {
  return (await tenantRequest<{ user: TenantUser }>('/api/users', jsonOptions('POST', input))).user
}

export async function updateTenantUserStatus(userId: number, status: 'ACTIVE' | 'DISABLED'): Promise<void> {
  await tenantRequest(`/api/users/${userId}/status`, jsonOptions('PATCH', { status }))
}

export async function replaceTenantUserRoles(userId: number, roleCodes: string[]): Promise<void> {
  await tenantRequest(`/api/users/${userId}/roles`, jsonOptions('PUT', { roleCodes }))
}

export async function listTenantLocations(): Promise<TenantLocation[]> {
  return (await tenantRequest<{ locations: TenantLocation[] }>('/api/tenant/locations')).locations
}

export async function createTenantLocation(input: Record<string, unknown>): Promise<TenantLocation> {
  return (await tenantRequest<{ location: TenantLocation }>('/api/tenant/locations', jsonOptions('POST', input))).location
}

export async function updateTenantLocation(id: number, input: Record<string, unknown>): Promise<TenantLocation> {
  return (await tenantRequest<{ location: TenantLocation }>(`/api/tenant/locations/${id}`, jsonOptions('PATCH', input))).location
}

export async function updateTenantLocationStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<TenantLocation> {
  return (await tenantRequest<{ location: TenantLocation }>(`/api/tenant/locations/${id}/status`, jsonOptions('PATCH', { status }))).location
}

export async function setPrimaryTenantLocation(id: number): Promise<TenantLocation> {
  return (await tenantRequest<{ location: TenantLocation }>(`/api/tenant/locations/${id}/primary`, jsonOptions('PATCH'))).location
}

export async function listVehicles(query: Record<string, QueryValue> = {}): Promise<{ vehicles: VehicleListItem[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/vehicles', query))
}

export async function getVehicle(id: number): Promise<VehicleDetails> {
  return (await tenantRequest<{ vehicle: VehicleDetails }>(`/api/tenant/vehicles/${id}`)).vehicle
}

export async function createVehicle(input: Record<string, unknown>): Promise<VehicleDetails> {
  return (await tenantRequest<{ vehicle: VehicleDetails }>('/api/tenant/vehicles', jsonOptions('POST', input))).vehicle
}

export async function updateVehicle(id: number, input: Record<string, unknown>): Promise<VehicleDetails> {
  return (await tenantRequest<{ vehicle: VehicleDetails }>(`/api/tenant/vehicles/${id}`, jsonOptions('PATCH', input))).vehicle
}

export async function updateVehicleStatus(id: number, status: string): Promise<VehicleDetails> {
  return (await tenantRequest<{ vehicle: VehicleDetails }>(`/api/tenant/vehicles/${id}/status`, jsonOptions('PATCH', { status }))).vehicle
}

export async function reserveVehicle(id: number, input: Record<string, unknown>): Promise<void> {
  await tenantRequest(`/api/tenant/vehicles/${id}/reservation`, idempotentJsonOptions('POST', input))
}

export async function cancelVehicleReservation(id: number, cancellationReason: string | null): Promise<void> {
  await tenantRequest(`/api/tenant/vehicles/${id}/reservation`, idempotentJsonOptions('DELETE', { cancellationReason }))
}

export async function listCustomers(query: Record<string, QueryValue> = {}): Promise<{ customers: Customer[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/customers', query))
}

export async function getCustomer(id: number): Promise<Customer> {
  return (await tenantRequest<{ customer: Customer }>(`/api/tenant/customers/${id}`)).customer
}

export async function createCustomer(input: Record<string, unknown>): Promise<Customer> {
  return (await tenantRequest<{ customer: Customer }>('/api/tenant/customers', jsonOptions('POST', input))).customer
}

export async function updateCustomer(id: number, input: Record<string, unknown>): Promise<Customer> {
  return (await tenantRequest<{ customer: Customer }>(`/api/tenant/customers/${id}`, jsonOptions('PATCH', input))).customer
}

export async function updateCustomerStatus(id: number, status: string): Promise<Customer> {
  return (await tenantRequest<{ customer: Customer }>(`/api/tenant/customers/${id}/status`, jsonOptions('PATCH', { status }))).customer
}

export async function listLeads(query: Record<string, QueryValue> = {}): Promise<{ leads: Lead[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/leads', query))
}

export async function getLead(id: number): Promise<Lead> {
  return (await tenantRequest<{ lead: Lead }>(`/api/tenant/leads/${id}`)).lead
}

export async function createLead(input: Record<string, unknown>): Promise<Lead> {
  return (await tenantRequest<{ lead: Lead }>('/api/tenant/leads', jsonOptions('POST', input))).lead
}

export async function updateLead(id: number, input: Record<string, unknown>): Promise<Lead> {
  return (await tenantRequest<{ lead: Lead }>(`/api/tenant/leads/${id}`, jsonOptions('PATCH', input))).lead
}

export async function updateLeadStatus(id: number, status: string, lostReason?: string | null): Promise<Lead> {
  return (await tenantRequest<{ lead: Lead }>(`/api/tenant/leads/${id}/status`, jsonOptions('PATCH', { status, lostReason }))).lead
}

export async function listLeadActivities(leadId: number): Promise<LeadActivity[]> {
  return (await tenantRequest<{ activities: LeadActivity[] }>(withQuery('/api/tenant/lead-activities', { leadId, limit: 100 }))).activities
}

export async function createLeadActivity(leadId: number, input: Record<string, unknown>): Promise<LeadActivity> {
  return (await tenantRequest<{ activity: LeadActivity }>(`/api/tenant/leads/${leadId}/activities`, jsonOptions('POST', input))).activity
}

export async function updateLeadActivityStatus(activityId: number, input: Record<string, unknown>): Promise<LeadActivity> {
  return (await tenantRequest<{ activity: LeadActivity }>(`/api/tenant/lead-activities/${activityId}/status`, jsonOptions('PATCH', input))).activity
}

export async function listLeadVehicles(leadId: number): Promise<LeadVehicleInterest[]> {
  return (await tenantRequest<{ vehicles: LeadVehicleInterest[] }>(`/api/tenant/leads/${leadId}/vehicles`)).vehicles
}

export async function addLeadVehicle(leadId: number, input: Record<string, unknown>): Promise<LeadVehicleInterest> {
  return (await tenantRequest<{ vehicle: LeadVehicleInterest }>(`/api/tenant/leads/${leadId}/vehicles`, jsonOptions('POST', input))).vehicle
}

export async function removeLeadVehicle(leadId: number, vehicleId: number): Promise<void> {
  await tenantRequest(`/api/tenant/leads/${leadId}/vehicles/${vehicleId}`, jsonOptions('DELETE'))
}

export async function listTestDrives(query: Record<string, QueryValue> = {}): Promise<{ testDrives: TestDrive[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/test-drives', query))
}

export async function getTestDrive(id: number): Promise<TestDrive> {
  return (await tenantRequest<{ testDrive: TestDrive }>(`/api/tenant/test-drives/${id}`)).testDrive
}

export async function createTestDrive(input: Record<string, unknown>): Promise<TestDrive> {
  return (await tenantRequest<{ testDrive: TestDrive }>('/api/tenant/test-drives', jsonOptions('POST', input))).testDrive
}

export async function updateTestDriveStatus(id: number, input: Record<string, unknown>): Promise<TestDrive> {
  return (await tenantRequest<{ testDrive: TestDrive }>(`/api/tenant/test-drives/${id}/status`, jsonOptions('PATCH', input))).testDrive
}

export async function listOffers(query: Record<string, QueryValue> = {}): Promise<{ offers: Offer[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/offers', query))
}

export async function getOffer(id: number): Promise<Offer> {
  return (await tenantRequest<{ offer: Offer }>(`/api/tenant/offers/${id}`)).offer
}

export async function createOffer(input: Record<string, unknown>): Promise<Offer> {
  return (await tenantRequest<{ offer: Offer }>('/api/tenant/offers', jsonOptions('POST', input))).offer
}

export async function updateOfferStatus(id: number, status: string): Promise<Offer> {
  return (await tenantRequest<{ offer: Offer }>(`/api/tenant/offers/${id}/status`, jsonOptions('PATCH', { status }))).offer
}

export async function listReservations(query: Record<string, QueryValue> = {}): Promise<{ reservations: Reservation[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/reservations', query))
}

export async function getReservation(id: number): Promise<Reservation> {
  return (await tenantRequest<{ reservation: Reservation }>(`/api/tenant/reservations/${id}`)).reservation
}

export async function updateReservation(id: number, input: Record<string, unknown>): Promise<Reservation> {
  return (await tenantRequest<{ reservation: Reservation }>(`/api/tenant/reservations/${id}`, jsonOptions('PATCH', input))).reservation
}

export async function listSales(query: Record<string, QueryValue> = {}): Promise<{ sales: Sale[]; pagination: Pagination }> {
  return tenantRequest(withQuery('/api/tenant/sales', query))
}

export async function getSale(id: number): Promise<Sale> {
  return (await tenantRequest<{ sale: Sale }>(`/api/tenant/sales/${id}`)).sale
}

export async function createSale(input: Record<string, unknown>): Promise<Sale> {
  return (await tenantRequest<{ sale: Sale }>('/api/tenant/sales', idempotentJsonOptions('POST', input))).sale
}

export async function updateSaleStatus(id: number, status: string, cancellationReason?: string | null): Promise<Sale> {
  return (await tenantRequest<{ sale: Sale }>(`/api/tenant/sales/${id}/status`, idempotentJsonOptions('PATCH', { status, cancellationReason }))).sale
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await tenantRequest('/api/auth/password', jsonOptions('PATCH', { currentPassword, newPassword }))
}
