import { Router } from "express";
import { loginController, getMeController, refreshController, logoutController } from "./auth.controller.js";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);

authRouter.get("/me", requireTenantAuth, getMeController);
