import { Router } from "express";
import { loginController, getMeController, refreshController, logoutController } from "./auth.controller.js";
import { requireTenantAuth } from "../../../shared/middleware/require-tenant-auth.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/refresh", requireTenantAuth, refreshController);
authRouter.post("/logout", requireTenantAuth, logoutController);

authRouter.get("/me", requireTenantAuth, getMeController);
