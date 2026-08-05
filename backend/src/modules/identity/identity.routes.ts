import { Router } from "express";
import { authRouter } from "./auth/auth.routes.js";
import { platformRouter } from "./platform/platform.routes.js";
import { userRouter } from "./user/user.routes.js";

export const identityRouter = Router();


identityRouter.use("/auth", authRouter);
identityRouter.use("/platform/auth", platformRouter);
identityRouter.use("/users", userRouter);
