import type {
    Request,
    Response,
    NextFunction
} from 'express';
import { listUsers, createTenantUser, listAssignableRoles, updateTenantUserStatus, replaceTenantUserRoles } from './user.service';
import { AppError } from '../../../shared/errors/app-error';

export async function listUsersController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try{
    if(!request.auth) {
      throw new AppError(401, "Authentication Required");
    }
    const users = await listUsers(request.auth.tenantId);
    response.status(200).json({ users });
  }catch(error){
    next(error);
  }
}

export async function createUserController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try{
    if(!request.auth) {
      throw new AppError(401, "Authentication Required");
    }
    const {
      defaultLocationId,
      firstName,
      lastName,
      email,
      phone,
      password,
      roleCode,
      } = request.body;

      if (
      typeof defaultLocationId !== "number" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof roleCode !== "string" ||
        (
          phone !== undefined &&
          phone !== null &&
          typeof phone !== "string"
        )
      ) {
        throw new AppError(
          400,
          "Invalid user creation request",
        );
      }
    const user = await createTenantUser({
      tenantId: request.auth.tenantId,
      assignedByUserId: request.auth.userId,
      defaultLocationId,
      firstName,
      lastName,
      email,
      phone,
      password,
      roleCode,
    });

    response.status(201).json({
      user,
    })
  }catch(err){
    next(err);
  }
}

export async function replaceUserRolesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const targetUserId = Number(request.params.userId);

    const user = await replaceTenantUserRoles({
      tenantId: request.auth.tenantId,
      authenticatedUserId: request.auth.userId,
      targetUserId,
      roleCodes: request.body?.roleCodes,
    });

    response.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRolesController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try{
    if(!request.auth){
      throw new AppError(401, "Authorization Required");
    }
    const assignableRoles = await listAssignableRoles(request.auth.tenantId);
    response.status(200).json({
      roles:assignableRoles,
    })
  }catch(err){
    next(err);
  }
}

export async function updateTenantUserStatusController(request: Request, response:Response, next: NextFunction): Promise<void> {
  try{
    if(!request.auth){
      throw new AppError(401, "Authorization Required");
    }
    const targetUserId = Number(request.params.userId);
    const status = request.body?.status;

    const updatedStatusResult = await updateTenantUserStatus({
      tenantId: request.auth.tenantId,
      authenticatedUserId:request.auth.userId,
      targetUserId: targetUserId,
      status: status,
    })

    response.status(200).json({
      user: updatedStatusResult,
    });
  }catch(err){
    next(err);
  }
}
