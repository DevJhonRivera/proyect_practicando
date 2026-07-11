import { Router } from "express";

import {
  createPedido,
  deletePedido,
  getPedidos,
  updatePedido,
} from "./pedido.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware, createPedido);

router.get("/", authMiddleware, getPedidos);

router.put("/:id", authMiddleware, updatePedido);

router.delete("/:id", authMiddleware, deletePedido);

export default router;
