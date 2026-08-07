import { AppError } from "../../shared/errors/app-error.js";
import {
  createCustomer as createCustomerRepository,
  createLead as createLeadRepository,
  deleteCustomer as deleteCustomerRepository,
  deleteLead as deleteLeadRepository,
  getCustomerById as getCustomerByIdRepository,
  getCustomers,
  getLeadById as getLeadByIdRepository,
  getLeads,
  restoreCustomer as restoreCustomerRepository,
  restoreLead as restoreLeadRepository,
  updateCustomer as updateCustomerRepository,
  updateCustomerStatus as updateCustomerStatusRepository,
  updateLead as updateLeadRepository,
  updateLeadStatus as updateLeadStatusRepository,
  type CustomerDetails,
  type CustomerListPage,
  type CustomerStatus,
  type CustomerType,
  type LeadDetails,
  type LeadListPage,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
  type UpdateCustomerChanges,
  type UpdateLeadChanges,
} from "./crm.repository.js";

export interface ListCustomersInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  customerType?: unknown;
  assignedToUserId?: unknown;
  search?: unknown;
}

export interface GetCustomerByIdInput {
  tenantId: number;
  customerId: unknown;
}

export interface CreateCustomerInput {
  tenantId: number;
  createdByUserId: number;
  customerType: unknown;
  firstName: unknown;
  lastName: unknown;
  companyName: unknown;
  email: unknown;
  phone: unknown;
  secondaryPhone: unknown;
  addressLine1: unknown;
  addressLine2: unknown;
  city: unknown;
  postalCode: unknown;
  countryCode: unknown;
  assignedToUserId: unknown;
  notes: unknown;
}

export interface UpdateCustomerChangesInput {
  customerType?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  companyName?: unknown;
  email?: unknown;
  phone?: unknown;
  secondaryPhone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  postalCode?: unknown;
  countryCode?: unknown;
  assignedToUserId?: unknown;
  notes?: unknown;
}

export interface UpdateCustomerInput {
  tenantId: number;
  customerId: unknown;
  changes: UpdateCustomerChangesInput;
}

export interface UpdateCustomerStatusInput {
  tenantId: number;
  customerId: unknown;
  status: unknown;
}

export interface DeleteCustomerInput {
  tenantId: number;
  customerId: unknown;
}

export interface RestoreCustomerInput {
  tenantId: number;
  customerId: unknown;
}

export interface ListLeadsInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  priority?: unknown;
  source?: unknown;
  locationId?: unknown;
  customerId?: unknown;
  assignedToUserId?: unknown;
  search?: unknown;
}

export interface GetLeadByIdInput {
  tenantId: number;
  leadId: unknown;
}

export interface CreateLeadInput {
  tenantId: number;
  createdByUserId: number;
  locationId: unknown;
  customerId: unknown;
  assignedToUserId: unknown;
  source: unknown;
  priority: unknown;
  budgetMin: unknown;
  budgetMax: unknown;
  lastContactAt: unknown;
  nextFollowUpAt: unknown;
  notes: unknown;
}

export interface UpdateLeadChangesInput {
  locationId?: unknown;
  customerId?: unknown;
  assignedToUserId?: unknown;
  source?: unknown;
  priority?: unknown;
  budgetMin?: unknown;
  budgetMax?: unknown;
  lastContactAt?: unknown;
  nextFollowUpAt?: unknown;
  notes?: unknown;
}

export interface UpdateLeadInput {
  tenantId: number;
  leadId: unknown;
  changes: UpdateLeadChangesInput;
}

export interface UpdateLeadStatusInput {
  tenantId: number;
  leadId: unknown;
  status: unknown;
  lostReason: unknown;
}

export interface DeleteLeadInput {
  tenantId: number;
  leadId: unknown;
}

export interface RestoreLeadInput {
  tenantId: number;
  leadId: unknown;
}

const CUSTOMER_STATUSES: readonly CustomerStatus[] = [
  "PROSPECT",
  "CUSTOMER",
  "INACTIVE",
];

const CUSTOMER_TYPES: readonly CustomerType[] = ["INDIVIDUAL", "BUSINESS"];

const LEAD_SOURCES: readonly LeadSource[] = [
  "WALK_IN",
  "WEBSITE",
  "PHONE",
  "EMAIL",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "OTHER",
];

const LEAD_STATUSES: readonly LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "WON",
  "LOST",
];

const LEAD_PRIORITIES: readonly LeadPriority[] = ["LOW", "NORMAL", "HIGH"];

const MAX_CRM_AMOUNT = 9_999_999_999.99;

function parsePositiveInteger(
  value: unknown,
  field: string,
  fallback?: number,
): number | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return parsed;
}

function parseEnum<T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[],
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string`);
  }

  const normalized = value.trim().toUpperCase();

  if (!allowedValues.includes(normalized as T)) {
    throw new AppError(
      400,
      `${field} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return normalized as T;
}

function parseBodyPositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return value as number;
}

function parseOptionalBodyPositiveInteger(
  value: unknown,
  field: string,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  return parseBodyPositiveInteger(value, field);
}

function parseRequiredString(
  value: unknown,
  field: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new AppError(400, `${field} is required`);
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maximumLength) {
    throw new AppError(
      400,
      `${field} is required and cannot exceed ${maximumLength} characters`,
    );
  }

  return normalized;
}

function parseOptionalString(
  value: unknown,
  field: string,
  maximumLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string or null`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximumLength) {
    throw new AppError(
      400,
      `${field} cannot exceed ${maximumLength} characters`,
    );
  }

  return normalized;
}

function parseEmail(value: unknown): string | null {
  const email = parseOptionalString(value, "email", 255)?.toLowerCase() ?? null;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "A valid customer email is required");
  }

  return email;
}

function parseCountryCode(value: unknown): string | null {
  const countryCode =
    parseOptionalString(value, "countryCode", 2)?.toUpperCase() ?? null;

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new AppError(400, "countryCode must contain exactly two letters");
  }

  return countryCode;
}

function validateCustomerIdentity(
  customerType: CustomerType,
  firstName: string | null,
  lastName: string | null,
  companyName: string | null,
): void {
  if (customerType === "INDIVIDUAL" && (!firstName || !lastName)) {
    throw new AppError(
      400,
      "firstName and lastName are required for an individual customer",
    );
  }

  if (customerType === "BUSINESS" && !companyName) {
    throw new AppError(
      400,
      "companyName is required for a business customer",
    );
  }
}

function validateTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }
}

function parseCustomerId(value: unknown): number {
  const customerId = parsePositiveInteger(value, "customerId");

  if (customerId === undefined) {
    throw new AppError(400, "A valid customer ID is required");
  }

  return customerId;
}

function parseLeadId(value: unknown): number {
  const leadId = parsePositiveInteger(value, "leadId");

  if (leadId === undefined) {
    throw new AppError(400, "A valid lead ID is required");
  }

  return leadId;
}

function parseOptionalAmount(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(400, `${field} must be a valid non-negative amount`);
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new AppError(400, `${field} must be a valid non-negative amount`);
  }

  const normalized = String(value).trim();

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AppError(
      400,
      `${field} must be a non-negative amount with at most two decimal places`,
    );
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed > MAX_CRM_AMOUNT) {
    throw new AppError(400, `${field} exceeds the supported amount range`);
  }

  return parsed.toFixed(2);
}

function parseOptionalDateTime(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be an ISO date-time string`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `${field} must be a valid ISO date-time string`);
  }

  return parsed;
}

export async function listCustomers(
  input: ListCustomersInput,
): Promise<CustomerListPage> {
  if (!Number.isSafeInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const page = parsePositiveInteger(input.page, "page", 1) as number;
  const limit = parsePositiveInteger(input.limit, "limit", 20) as number;

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }

  const status = parseEnum(input.status, "status", CUSTOMER_STATUSES);
  const customerType = parseEnum(
    input.customerType,
    "customerType",
    CUSTOMER_TYPES,
  );
  const assignedToUserId = parsePositiveInteger(
    input.assignedToUserId,
    "assignedToUserId",
  );
  let search: string | undefined;

  if (input.search !== undefined) {
    if (typeof input.search !== "string") {
      throw new AppError(400, "search must be a string");
    }

    search = input.search.trim() || undefined;

    if (search && search.length > 100) {
      throw new AppError(400, "search cannot exceed 100 characters");
    }
  }

  return getCustomers({
    tenantId: input.tenantId,
    page,
    limit,
    status,
    customerType,
    assignedToUserId,
    search,
  });
}

export async function getCustomerById(
  input: GetCustomerByIdInput,
): Promise<CustomerDetails> {
  validateTenantId(input.tenantId);
  const customerId = parseCustomerId(input.customerId);
  const customer = await getCustomerByIdRepository(
    input.tenantId,
    customerId,
  );

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerDetails> {
  validateTenantId(input.tenantId);

  if (
    !Number.isSafeInteger(input.createdByUserId) ||
    input.createdByUserId <= 0
  ) {
    throw new AppError(400, "A valid creator user ID is required");
  }

  const customerType = parseEnum(
    input.customerType,
    "customerType",
    CUSTOMER_TYPES,
  );

  if (!customerType) {
    throw new AppError(400, "customerType is required");
  }

  const firstName = parseOptionalString(input.firstName, "firstName", 100);
  const lastName = parseOptionalString(input.lastName, "lastName", 100);
  const companyName = parseOptionalString(
    input.companyName,
    "companyName",
    150,
  );

  validateCustomerIdentity(customerType, firstName, lastName, companyName);

  const result = await createCustomerRepository({
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    customerType,
    firstName,
    lastName,
    companyName,
    email: parseEmail(input.email),
    phone: parseRequiredString(input.phone, "phone", 30),
    secondaryPhone: parseOptionalString(
      input.secondaryPhone,
      "secondaryPhone",
      30,
    ),
    addressLine1: parseOptionalString(
      input.addressLine1,
      "addressLine1",
      200,
    ),
    addressLine2: parseOptionalString(
      input.addressLine2,
      "addressLine2",
      200,
    ),
    city: parseOptionalString(input.city, "city", 100),
    postalCode: parseOptionalString(input.postalCode, "postalCode", 20),
    countryCode: parseCountryCode(input.countryCode),
    assignedToUserId: parseOptionalBodyPositiveInteger(
      input.assignedToUserId,
      "assignedToUserId",
    ),
    notes: parseOptionalString(input.notes, "notes", 65_535),
  });

  if (result.outcome === "ASSIGNEE_NOT_FOUND") {
    throw new AppError(404, "Assigned user not found");
  }

  return result.customer;
}

export async function updateCustomer(
  input: UpdateCustomerInput,
): Promise<CustomerDetails> {
  validateTenantId(input.tenantId);
  const customerId = parseCustomerId(input.customerId);

  if (
    typeof input.changes !== "object" ||
    input.changes === null ||
    Array.isArray(input.changes)
  ) {
    throw new AppError(400, "Invalid customer update request");
  }

  const changes: UpdateCustomerChanges = {};

  if (input.changes.customerType !== undefined) {
    const customerType = parseEnum(
      input.changes.customerType,
      "customerType",
      CUSTOMER_TYPES,
    );

    if (!customerType) {
      throw new AppError(400, "customerType is required");
    }

    changes.customerType = customerType;
  }

  if (input.changes.firstName !== undefined) {
    changes.firstName = parseOptionalString(
      input.changes.firstName,
      "firstName",
      100,
    );
  }

  if (input.changes.lastName !== undefined) {
    changes.lastName = parseOptionalString(
      input.changes.lastName,
      "lastName",
      100,
    );
  }

  if (input.changes.companyName !== undefined) {
    changes.companyName = parseOptionalString(
      input.changes.companyName,
      "companyName",
      150,
    );
  }

  if (input.changes.email !== undefined) {
    changes.email = parseEmail(input.changes.email);
  }

  if (input.changes.phone !== undefined) {
    changes.phone = parseRequiredString(input.changes.phone, "phone", 30);
  }

  if (input.changes.secondaryPhone !== undefined) {
    changes.secondaryPhone = parseOptionalString(
      input.changes.secondaryPhone,
      "secondaryPhone",
      30,
    );
  }

  if (input.changes.addressLine1 !== undefined) {
    changes.addressLine1 = parseOptionalString(
      input.changes.addressLine1,
      "addressLine1",
      200,
    );
  }

  if (input.changes.addressLine2 !== undefined) {
    changes.addressLine2 = parseOptionalString(
      input.changes.addressLine2,
      "addressLine2",
      200,
    );
  }

  if (input.changes.city !== undefined) {
    changes.city = parseOptionalString(input.changes.city, "city", 100);
  }

  if (input.changes.postalCode !== undefined) {
    changes.postalCode = parseOptionalString(
      input.changes.postalCode,
      "postalCode",
      20,
    );
  }

  if (input.changes.countryCode !== undefined) {
    changes.countryCode = parseCountryCode(input.changes.countryCode);
  }

  if (input.changes.assignedToUserId !== undefined) {
    changes.assignedToUserId = parseOptionalBodyPositiveInteger(
      input.changes.assignedToUserId,
      "assignedToUserId",
    );
  }

  if (input.changes.notes !== undefined) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one customer change is required");
  }

  if (
    changes.customerType !== undefined ||
    changes.firstName !== undefined ||
    changes.lastName !== undefined ||
    changes.companyName !== undefined
  ) {
    const currentCustomer = await getCustomerByIdRepository(
      input.tenantId,
      customerId,
    );

    if (!currentCustomer) {
      throw new AppError(404, "Customer not found");
    }

    const resultingCustomerType =
      changes.customerType ?? currentCustomer.customerType;
    const resultingFirstName =
      changes.firstName !== undefined
        ? changes.firstName
        : currentCustomer.firstName;
    const resultingLastName =
      changes.lastName !== undefined
        ? changes.lastName
        : currentCustomer.lastName;
    const resultingCompanyName =
      changes.companyName !== undefined
        ? changes.companyName
        : currentCustomer.companyName;

    validateCustomerIdentity(
      resultingCustomerType,
      resultingFirstName,
      resultingLastName,
      resultingCompanyName,
    );
  }

  const result = await updateCustomerRepository({
    tenantId: input.tenantId,
    customerId,
    changes,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Customer not found");
    case "ASSIGNEE_NOT_FOUND":
      throw new AppError(404, "Assigned user not found");
    case "UPDATED":
      return result.customer;
  }
}

export async function updateCustomerStatus(
  input: UpdateCustomerStatusInput,
): Promise<CustomerDetails> {
  validateTenantId(input.tenantId);
  const customerId = parseCustomerId(input.customerId);
  const status = parseEnum(input.status, "status", CUSTOMER_STATUSES);

  if (!status) {
    throw new AppError(400, "status is required");
  }

  const result = await updateCustomerStatusRepository({
    tenantId: input.tenantId,
    customerId,
    status,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Customer not found");
    case "INVALID_TRANSITION":
      throw new AppError(
        409,
        `Customer status cannot transition from ${result.currentStatus} to ${status}`,
      );
    case "UPDATED":
      return result.customer;
  }
}

export async function deleteCustomer(
  input: DeleteCustomerInput,
): Promise<void> {
  validateTenantId(input.tenantId);
  const customerId = parseCustomerId(input.customerId);
  const result = await deleteCustomerRepository({
    tenantId: input.tenantId,
    customerId,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Customer not found");
  }
}

export async function restoreCustomer(
  input: RestoreCustomerInput,
): Promise<CustomerDetails> {
  validateTenantId(input.tenantId);
  const customerId = parseCustomerId(input.customerId);
  const result = await restoreCustomerRepository({
    tenantId: input.tenantId,
    customerId,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Deleted customer not found");
  }

  return result.customer;
}

export async function listLeads(
  input: ListLeadsInput,
): Promise<LeadListPage> {
  validateTenantId(input.tenantId);
  const page = parsePositiveInteger(input.page, "page", 1) as number;
  const limit = parsePositiveInteger(input.limit, "limit", 20) as number;

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }

  const status = parseEnum(input.status, "status", LEAD_STATUSES);
  const priority = parseEnum(input.priority, "priority", LEAD_PRIORITIES);
  const source = parseEnum(input.source, "source", LEAD_SOURCES);
  const locationId = parsePositiveInteger(input.locationId, "locationId");
  const customerId = parsePositiveInteger(input.customerId, "customerId");
  const assignedToUserId = parsePositiveInteger(
    input.assignedToUserId,
    "assignedToUserId",
  );
  let search: string | undefined;

  if (input.search !== undefined) {
    if (typeof input.search !== "string") {
      throw new AppError(400, "search must be a string");
    }

    search = input.search.trim() || undefined;

    if (search && search.length > 100) {
      throw new AppError(400, "search cannot exceed 100 characters");
    }
  }

  return getLeads({
    tenantId: input.tenantId,
    page,
    limit,
    status,
    priority,
    source,
    locationId,
    customerId,
    assignedToUserId,
    search,
  });
}

export async function getLeadById(
  input: GetLeadByIdInput,
): Promise<LeadDetails> {
  validateTenantId(input.tenantId);
  const leadId = parseLeadId(input.leadId);
  const lead = await getLeadByIdRepository(input.tenantId, leadId);

  if (!lead) {
    throw new AppError(404, "Lead not found");
  }

  return lead;
}

export async function createLead(
  input: CreateLeadInput,
): Promise<LeadDetails> {
  validateTenantId(input.tenantId);

  if (
    !Number.isSafeInteger(input.createdByUserId) ||
    input.createdByUserId <= 0
  ) {
    throw new AppError(400, "A valid creator user ID is required");
  }

  const source = parseEnum(input.source, "source", LEAD_SOURCES);

  if (!source) {
    throw new AppError(400, "source is required");
  }

  const priority =
    parseEnum(input.priority, "priority", LEAD_PRIORITIES) ?? "NORMAL";
  const budgetMin = parseOptionalAmount(input.budgetMin, "budgetMin");
  const budgetMax = parseOptionalAmount(input.budgetMax, "budgetMax");

  if (
    budgetMin !== null &&
    budgetMax !== null &&
    Number(budgetMin) > Number(budgetMax)
  ) {
    throw new AppError(400, "budgetMin cannot exceed budgetMax");
  }

  const result = await createLeadRepository({
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    locationId: parseBodyPositiveInteger(input.locationId, "locationId"),
    customerId: parseBodyPositiveInteger(input.customerId, "customerId"),
    assignedToUserId: parseOptionalBodyPositiveInteger(
      input.assignedToUserId,
      "assignedToUserId",
    ),
    source,
    priority,
    budgetMin,
    budgetMax,
    lastContactAt: parseOptionalDateTime(
      input.lastContactAt,
      "lastContactAt",
    ),
    nextFollowUpAt: parseOptionalDateTime(
      input.nextFollowUpAt,
      "nextFollowUpAt",
    ),
    notes: parseOptionalString(input.notes, "notes", 65_535),
  });

  switch (result.outcome) {
    case "LOCATION_NOT_FOUND":
      throw new AppError(404, "Location not found");
    case "CUSTOMER_NOT_FOUND":
      throw new AppError(404, "Customer not found");
    case "ASSIGNEE_NOT_FOUND":
      throw new AppError(404, "Assigned user not found");
    case "CREATED":
      return result.lead;
  }
}

export async function updateLead(
  input: UpdateLeadInput,
): Promise<LeadDetails> {
  validateTenantId(input.tenantId);
  const leadId = parseLeadId(input.leadId);

  if (
    typeof input.changes !== "object" ||
    input.changes === null ||
    Array.isArray(input.changes)
  ) {
    throw new AppError(400, "Invalid lead update request");
  }

  const changes: UpdateLeadChanges = {};

  if (input.changes.locationId !== undefined) {
    changes.locationId = parseBodyPositiveInteger(
      input.changes.locationId,
      "locationId",
    );
  }

  if (input.changes.customerId !== undefined) {
    changes.customerId = parseBodyPositiveInteger(
      input.changes.customerId,
      "customerId",
    );
  }

  if (input.changes.assignedToUserId !== undefined) {
    changes.assignedToUserId = parseOptionalBodyPositiveInteger(
      input.changes.assignedToUserId,
      "assignedToUserId",
    );
  }

  if (input.changes.source !== undefined) {
    const source = parseEnum(input.changes.source, "source", LEAD_SOURCES);

    if (!source) {
      throw new AppError(400, "source is required");
    }

    changes.source = source;
  }

  if (input.changes.priority !== undefined) {
    const priority = parseEnum(
      input.changes.priority,
      "priority",
      LEAD_PRIORITIES,
    );

    if (!priority) {
      throw new AppError(400, "priority is required");
    }

    changes.priority = priority;
  }

  if (input.changes.budgetMin !== undefined) {
    changes.budgetMin = parseOptionalAmount(
      input.changes.budgetMin,
      "budgetMin",
    );
  }

  if (input.changes.budgetMax !== undefined) {
    changes.budgetMax = parseOptionalAmount(
      input.changes.budgetMax,
      "budgetMax",
    );
  }

  if (input.changes.lastContactAt !== undefined) {
    changes.lastContactAt = parseOptionalDateTime(
      input.changes.lastContactAt,
      "lastContactAt",
    );
  }

  if (input.changes.nextFollowUpAt !== undefined) {
    changes.nextFollowUpAt = parseOptionalDateTime(
      input.changes.nextFollowUpAt,
      "nextFollowUpAt",
    );
  }

  if (input.changes.notes !== undefined) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one lead change is required");
  }

  if (changes.budgetMin !== undefined || changes.budgetMax !== undefined) {
    let budgetMin = changes.budgetMin;
    let budgetMax = changes.budgetMax;

    if (budgetMin === undefined || budgetMax === undefined) {
      const currentLead = await getLeadByIdRepository(input.tenantId, leadId);

      if (!currentLead) {
        throw new AppError(404, "Lead not found");
      }

      if (budgetMin === undefined) {
        budgetMin = currentLead.budgetMin;
      }

      if (budgetMax === undefined) {
        budgetMax = currentLead.budgetMax;
      }
    }

    if (
      budgetMin !== null &&
      budgetMax !== null &&
      Number(budgetMin) > Number(budgetMax)
    ) {
      throw new AppError(400, "budgetMin cannot exceed budgetMax");
    }
  }

  const result = await updateLeadRepository({
    tenantId: input.tenantId,
    leadId,
    changes,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Lead not found");
    case "LOCATION_NOT_FOUND":
      throw new AppError(404, "Location not found");
    case "CUSTOMER_NOT_FOUND":
      throw new AppError(404, "Customer not found");
    case "ASSIGNEE_NOT_FOUND":
      throw new AppError(404, "Assigned user not found");
    case "UPDATED":
      return result.lead;
  }
}

export async function updateLeadStatus(
  input: UpdateLeadStatusInput,
): Promise<LeadDetails> {
  validateTenantId(input.tenantId);
  const leadId = parseLeadId(input.leadId);
  const status = parseEnum(input.status, "status", LEAD_STATUSES);

  if (!status) {
    throw new AppError(400, "status is required");
  }

  let lostReason: string | null = null;

  if (status === "LOST") {
    lostReason = parseRequiredString(input.lostReason, "lostReason", 255);
  } else if (
    input.lostReason !== undefined &&
    input.lostReason !== null &&
    input.lostReason !== ""
  ) {
    throw new AppError(400, "lostReason can only be set for a LOST lead");
  }

  const result = await updateLeadStatusRepository({
    tenantId: input.tenantId,
    leadId,
    status,
    lostReason,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Lead not found");
    case "INVALID_TRANSITION":
      throw new AppError(
        409,
        `Lead status cannot transition from ${result.currentStatus} to ${status}`,
      );
    case "UPDATED":
      return result.lead;
  }
}

export async function deleteLead(input: DeleteLeadInput): Promise<void> {
  validateTenantId(input.tenantId);
  const leadId = parseLeadId(input.leadId);
  const result = await deleteLeadRepository({
    tenantId: input.tenantId,
    leadId,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Lead not found");
  }
}

export async function restoreLead(
  input: RestoreLeadInput,
): Promise<LeadDetails> {
  validateTenantId(input.tenantId);
  const leadId = parseLeadId(input.leadId);
  const result = await restoreLeadRepository({
    tenantId: input.tenantId,
    leadId,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Deleted lead not found");
    case "LOCATION_UNAVAILABLE":
      throw new AppError(
        409,
        "Lead cannot be restored because its location is unavailable",
      );
    case "CUSTOMER_UNAVAILABLE":
      throw new AppError(
        409,
        "Lead cannot be restored because its customer is unavailable",
      );
    case "RESTORED":
      return result.lead;
  }
}
