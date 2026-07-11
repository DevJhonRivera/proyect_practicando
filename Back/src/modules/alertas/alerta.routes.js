import { Router } from "express";

import {
  getAlertas,
  updateAlerta,
} from "./alerta.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getAlertas
);

router.patch(
  "/:id/atender",
  authMiddleware,
  updateAlerta
);

export default router;