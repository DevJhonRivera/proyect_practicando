import { Router } from "express";

import {register,login} from "./auth.controller.js";
import {
  optionalAuthMiddleware,
} from "../../middlewares/auth.middleware.js";
import {
  loginRateLimiter,
} from "../../middlewares/security.middleware.js";

const router = Router();

router.post(
  "/register",
  optionalAuthMiddleware,
  register
);

router.post(
  "/login",
  loginRateLimiter,
  login
);

export default router;
