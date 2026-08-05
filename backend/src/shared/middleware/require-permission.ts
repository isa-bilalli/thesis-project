import type { RequestHandler } from "express";
import type { PermissionCode } from "../auth/permission-code";
import { AppError } from "../errors/app-error";

export function requirePermission(
  ...requiredPermissions: PermissionCode[]
): RequestHandler {
  return (request, _response, next): void => {
    if (!request.auth) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    const userPermissions = new Set(
      request.auth.permissions,
    );

    const isAllowed = requiredPermissions.every(
      (permission) => userPermissions.has(permission),
    );

    if (!isAllowed) {
      next(
        new AppError(
          403,
          "You do not have permission to perform this action",
        ),
      );

      return;
    }

    next();
  };
}