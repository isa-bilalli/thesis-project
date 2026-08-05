import { AppError } from "../../../shared/errors/app-error.js";
import {
  createTenantWithPrimaryLocation,
  findTenantById,
  getAllTenants,
  updateTenantStatus as updateTenantStatusRepository,
  type TenantStatus,
  type CreatedTenant,
  type TenantListItem,
} from "./tenant.repository.js";

export interface ChangeTenantStatusInput {
  tenantId: number;
  status: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currencyCode?: string;
  timezone?: string;
  primaryLocation: {
    name: string;
    code: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    postalCode?: string | null;
    countryCode: string;
    phone?: string | null;
    email?: string | null;
  };
}

function optionalTrimmed(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export async function listTenants(): Promise<TenantListItem[]> {
  return getAllTenants();
}

const TENANT_STATUSES: readonly TenantStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
];

function isTenantStatus(status: string): status is TenantStatus {
  return TENANT_STATUSES.includes(status as TenantStatus);
}

export async function updateTenantStatus(
  input: ChangeTenantStatusInput,
): Promise<TenantListItem> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const status = input.status.trim().toUpperCase();

  if (!isTenantStatus(status)) {
    throw new AppError(
      400,
      "Status must be ACTIVE, SUSPENDED, or INACTIVE",
    );
  }

  const result = await updateTenantStatusRepository({
    tenantId: input.tenantId,
    status,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Tenant not found");
  }

  return result.tenant;
}

export async function getTenantById(
  tenantId: number,
): Promise<TenantListItem> {
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const tenant = await findTenantById(tenantId);

  if (!tenant) {
    throw new AppError(404, "Tenant not found");
  }

  return tenant;
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<CreatedTenant> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const contactEmail = optionalTrimmed(input.contactEmail)?.toLowerCase() ?? null;
  const contactPhone = optionalTrimmed(input.contactPhone);
  const currencyCode = (input.currencyCode?.trim() || "EUR").toUpperCase();
  const timezone = input.timezone?.trim() || "Europe/Belgrade";

  if (!name || name.length > 150) {
    throw new AppError(
      400,
      "Tenant name is required and cannot exceed 150 characters",
    );
  }

  if (
    !slug ||
    slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new AppError(
      400,
      "Slug must contain lowercase letters, numbers, and single hyphens",
    );
  }

  if (
    contactEmail &&
    (!isValidEmail(contactEmail) || contactEmail.length > 255)
  ) {
    throw new AppError(400, "A valid contact email is required");
  }

  if (contactPhone && contactPhone.length > 30) {
    throw new AppError(
      400,
      "Contact phone cannot exceed 30 characters",
    );
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new AppError(
      400,
      "Currency code must contain exactly three letters",
    );
  }

  if (timezone.length > 64 || !isValidTimezone(timezone)) {
    throw new AppError(400, "A valid IANA timezone is required");
  }

  const primaryLocation = input.primaryLocation;
  const locationName = primaryLocation.name.trim();
  const locationCode = primaryLocation.code.trim().toUpperCase();
  const addressLine1 = primaryLocation.addressLine1.trim();
  const addressLine2 = optionalTrimmed(primaryLocation.addressLine2);
  const city = primaryLocation.city.trim();
  const postalCode = optionalTrimmed(primaryLocation.postalCode);
  const countryCode = primaryLocation.countryCode.trim().toUpperCase();
  const phone = optionalTrimmed(primaryLocation.phone);
  const email = optionalTrimmed(primaryLocation.email)?.toLowerCase() ?? null;

  if (!locationName || locationName.length > 150) {
    throw new AppError(
      400,
      "Primary location name is required and cannot exceed 150 characters",
    );
  }

  if (
    !locationCode ||
    locationCode.length > 30 ||
    !/^[A-Z0-9_-]+$/.test(locationCode)
  ) {
    throw new AppError(
      400,
      "Primary location code may contain letters, numbers, underscores, and hyphens",
    );
  }

  if (!addressLine1 || addressLine1.length > 200) {
    throw new AppError(
      400,
      "Primary location address is required and cannot exceed 200 characters",
    );
  }

  if (addressLine2 && addressLine2.length > 200) {
    throw new AppError(
      400,
      "Primary location address line 2 cannot exceed 200 characters",
    );
  }

  if (!city || city.length > 100) {
    throw new AppError(
      400,
      "Primary location city is required and cannot exceed 100 characters",
    );
  }

  if (postalCode && postalCode.length > 20) {
    throw new AppError(
      400,
      "Primary location postal code cannot exceed 20 characters",
    );
  }

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new AppError(
      400,
      "Primary location country code must contain exactly two letters",
    );
  }

  if (phone && phone.length > 30) {
    throw new AppError(
      400,
      "Primary location phone cannot exceed 30 characters",
    );
  }

  if (email && (!isValidEmail(email) || email.length > 255)) {
    throw new AppError(
      400,
      "A valid primary location email is required",
    );
  }

  const result = await createTenantWithPrimaryLocation({
    name,
    slug,
    contactEmail,
    contactPhone,
    currencyCode,
    timezone,
    primaryLocation: {
      name: locationName,
      code: locationCode,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      phone,
      email,
    },
  });

  if (result.outcome === "SLUG_CONFLICT") {
    throw new AppError(
      409,
      "A tenant with this slug already exists",
    );
  }

  return result.tenant;
}
