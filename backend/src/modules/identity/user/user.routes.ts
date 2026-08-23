import { requireTenantAuth } from "../../../shared/middleware/require-tenant-auth";
import { requireActiveTenantAuth } from "../../../shared/middleware/require-active-tenant-auth";
import { requirePermission } from "../../../shared/middleware/require-permission";
import { Router } from "express";
import { createUserController, listRolesController, listUsersController, updateTenantUserStatusController, replaceUserRolesController } from "./user.controller";

export const userRouter = Router();

userRouter.use(requireTenantAuth, requireActiveTenantAuth);
userRouter.use(requirePermission('users.manage'))

userRouter.get("/", listUsersController);
userRouter.get("/roles", listRolesController)

userRouter.post("/", createUserController);

userRouter.patch("/:userId/status", updateTenantUserStatusController);

userRouter.put('/:userId/roles', replaceUserRolesController)
