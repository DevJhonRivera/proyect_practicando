import { Router } from "express";

import {register,login} from "./auth.controller.js";
import {
  optionalAuthMiddleware,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  optionalAuthMiddleware,
  register
);

router.post("/login", login);

export default router;
