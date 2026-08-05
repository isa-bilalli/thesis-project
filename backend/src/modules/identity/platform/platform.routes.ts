import { Router } from "express";
import { requirePlatformAuth } from "../../../shared/middleware/require-platform-auth.js";
import {
  getPlatformMeController,
  platformLoginController,
  platformLogoutController,
  platformRefreshController,
} from "./platform.controller.js";

export const platformRouter = Router();

platformRouter.post("/login", platformLoginController);
platformRouter.post("/refresh", platformRefreshController);
platformRouter.post("/logout", platformLogoutController);
platformRouter.get(
  "/me",
  requirePlatformAuth,
  getPlatformMeController,
);
