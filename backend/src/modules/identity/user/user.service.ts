import {
  getAllUsers,
  createUser,
  getAssignableRoles,
  updateUserStatus,
  replaceUserRoles,
  type UserAccountStatus,
  type AssignableRole,
  type CreatedUser,
  type TenantRoleCode,
  type UserListItem,
} from './user.repository'
import { hash } from 'bcryptjs';
import { AppError } from '../../../shared/errors/app-error';
import {
  passwordPolicyDescription,
  satisfiesPasswordPolicy,
} from '../../../shared/auth/password-policy';

export interface UpdateUserStatusInput {
  tenantId: number;
  authenticatedUserId: number;
  targetUserId: number;
  status: string;
}

export interface UpdatedUserStatus {
  id: number;
  status: UserAccountStatus;
}

export interface PlatformUpdateUserStatusInput {
  tenantId: number;
  targetUserId: number;
  status: string;
}

export interface ReplaceTenantUserRolesInput {
  tenantId: number;
  authenticatedUserId: number;
  targetUserId: number;
  roleCodes: unknown;
}

export interface ReplaceTenantUserRolesResult {
  id: number;
  roles: TenantRoleCode[];
}

const TENANT_ROLE_CODES: readonly TenantRoleCode[] = [
  "DEALERSHIP_ADMIN",
  "SALES_MANAGER",
  "SALESPERSON",
];

function isTenantRoleCode(value: string): value is TenantRoleCode {
  return TENANT_ROLE_CODES.includes(value as TenantRoleCode);
}

function isUserAccountStatus(
  value: string,
): value is UserAccountStatus {
  return (
    value === "ACTIVE" ||
    value === "DISABLED"
  );
}

export interface CreateUserInput {
  tenantId: number;
  assignedByUserId: number | null;
  defaultLocationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  password: string;
  roleCode: string;
}

const allowedRoleCodes: TenantRoleCode[] = [
  "DEALERSHIP_ADMIN",
  "SALES_MANAGER",
  "SALESPERSON",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function replaceTenantUserRoles(
  input: ReplaceTenantUserRolesInput,
): Promise<ReplaceTenantUserRolesResult> {
  if (
    !Number.isInteger(input.targetUserId) ||
    input.targetUserId <= 0
  ) {
    throw new AppError(400, "Invalid user ID");
  }

  if (input.authenticatedUserId === input.targetUserId) {
    throw new AppError(409, "You cannot change your own roles");
  }

  if (!Array.isArray(input.roleCodes)) {
    throw new AppError(400, "roleCodes must be an array");
  }

  if (input.roleCodes.length === 0) {
    throw new AppError(400, "At least one role is required");
  }

  if (!input.roleCodes.every((roleCode) => typeof roleCode === "string")) {
    throw new AppError(400, "Every role code must be a string");
  }

  const normalizedRoleCodes = [
    ...new Set(
      input.roleCodes.map((roleCode) =>
        (roleCode as string).trim().toUpperCase(),
      ),
    ),
  ];

  const invalidRoleCodes = normalizedRoleCodes.filter(
    (roleCode) => !isTenantRoleCode(roleCode),
  );

  if (invalidRoleCodes.length > 0) {
    throw new AppError(
      400,
      `Invalid role code(s): ${invalidRoleCodes.join(", ")}`,
    );
  }

  const roleCodes = normalizedRoleCodes as TenantRoleCode[];

  const result = await replaceUserRoles({
    tenantId: input.tenantId,
    assignedByUserId: input.authenticatedUserId,
    targetUserId: input.targetUserId,
    roleCodes,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.user;

    case "USER_NOT_FOUND":
      throw new AppError(404, "User not found");

    case "ROLE_NOT_FOUND":
      throw new AppError(
        400,
        `Role(s) not found for this tenant: ${result.missingRoles.join(", ")}`,
      );

    case "LAST_ADMIN":
      throw new AppError(
        409,
        "The final active dealership administrator cannot lose the administrator role",
      );
  }
}

export async function listAssignableRoles(tenantId: number): Promise<AssignableRole[]>{
  return getAssignableRoles(tenantId);
}

export async function createTenantUser(input: CreateUserInput): Promise<CreatedUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const roleCode = input.roleCode.trim().toUpperCase();

  if (!firstName || firstName.length > 100) {
    throw new AppError(
      400,
      "First name is required and cannot exceed 100 characters",
    );
  }

  if (!lastName || lastName.length > 100) {
    throw new AppError(
      400,
      "Last name is required and cannot exceed 100 characters",
    );
  }

  if (!isValidEmail(email) || email.length > 255) {
    throw new AppError(
      400,
      "A valid email address is required",
    );
  }

  if (phone && phone.length > 30) {
    throw new AppError(
      400,
      "Phone number cannot exceed 30 characters",
    );
  }

  if (!satisfiesPasswordPolicy(input.password)) {
    throw new AppError(
      400,
      `Password ${passwordPolicyDescription}`,
    );
  }

  if (
    !Number.isInteger(input.defaultLocationId) ||
    input.defaultLocationId <= 0
  ) {
    throw new AppError(
      400,
      "A valid default location is required",
    );
  }

  if (!isTenantRoleCode(roleCode)) {
    throw new AppError(
      400,
      "Role must be DEALERSHIP_ADMIN, SALES_MANAGER or SALESPERSON",
    );
  }

  const passwordHash = await hash(input.password, 12);

  const result = await createUser({
    tenantId: input.tenantId,
    assignedByUserId: input.assignedByUserId,
    defaultLocationId: input.defaultLocationId,
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    roleCode,
  });

  switch (result.outcome) {
    case "CREATED":
      return result.user;

    case "EMAIL_CONFLICT":
      throw new AppError(
        409,
        "A user with this email already exists",
      );

    case "LOCATION_NOT_FOUND":
      throw new AppError(
        400,
        "The selected location does not belong to this dealership",
      );

    case "ROLE_NOT_FOUND":
      throw new AppError(
        400,
        "The selected role does not belong to this dealership",
      );
  }
}



export async function listUsers(tenantId: number): Promise<UserListItem[]> {
  return getAllUsers(tenantId);
}

async function changeTenantUserStatus(
  input: PlatformUpdateUserStatusInput,
): Promise<UpdatedUserStatus> {
 if (
    !Number.isInteger(input.targetUserId) ||
    input.targetUserId <= 0
  ) {
    throw new AppError(
      400,
      "A valid user ID is required",
    );
  }

  if (typeof input.status !== "string") {
    throw new AppError(
      400,
      "User status is required",
    );
  }

  const normalizedStatus =
    input.status.trim().toUpperCase();

  if (!isUserAccountStatus(normalizedStatus)) {
    throw new AppError(
      400,
      "Status must be ACTIVE or DISABLED",
    );
  }

  const result = await updateUserStatus({
    tenantId: input.tenantId,
    targetUserId: input.targetUserId,
    status: normalizedStatus,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.user;

    case "USER_NOT_FOUND":
      throw new AppError(
        404,
        "User was not found",
      );

    case "LAST_ADMIN":
      throw new AppError(
        409,
        "The final active dealership administrator cannot be disabled",
      );
  }
}

export async function updateTenantUserStatus(
  input: UpdateUserStatusInput,
): Promise<UpdatedUserStatus> {
  if (
    typeof input.status === "string" &&
    input.targetUserId === input.authenticatedUserId &&
    input.status.trim().toUpperCase() === "DISABLED"
  ) {
    throw new AppError(
      409,
      "You cannot disable your own account",
    );
  }

  return changeTenantUserStatus(input);
}

export async function updateTenantUserStatusAsPlatform(
  input: PlatformUpdateUserStatusInput,
): Promise<UpdatedUserStatus> {
  return changeTenantUserStatus(input);
}
