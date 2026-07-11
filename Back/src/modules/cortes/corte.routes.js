import { Router } from "express";

import {
  createCorte,
  getCortes,
  getSugerenciasCortes,
  updateCorte,
} from "./corte.controller.js";

import { authMiddleware }
from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createCorte
);

router.get(
  "/sugerencias",
  authMiddleware,
  getSugerenciasCortes
);

router.get(
  "/",
  authMiddleware,
  getCortes
);

router.put(
  "/:id",
  authMiddleware,
  updateCorte
);

export default router;
