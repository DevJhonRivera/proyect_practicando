import { Router } from "express";

import {
  createPedido,
  deletePedido,
  getPedidos,
  updatePedido,
} from "./pedido.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.post("/", authMiddleware, requirePermission("pedidos", "write"), createPedido);

router.get("/", authMiddleware, requirePermission("pedidos", "read"), getPedidos);

router.put("/:id", authMiddleware, requirePermission("pedidos", "write"), updatePedido);

router.delete("/:id", authMiddleware, requirePermission("pedidos", "delete"), deletePedido);

export default router;
