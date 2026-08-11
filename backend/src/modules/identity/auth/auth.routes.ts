import { Router } from "express";
import {
  changePasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshController,
} from "./auth.controller.js";
import { requireTenantAuth } from "../../../shared/middleware/require-tenant-auth.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);

authRouter.get("/me", requireTenantAuth, getMeController);

authRouter.patch(
  "/password",
  requireTenantAuth,
  changePasswordController,
);
