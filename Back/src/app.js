import express from "express"
import morgan from "morgan";
import cors from "cors"
import authRoutes from "./modules/auth/auth.routes.js";
import {errorHandler, notFound} from './middlewares/error.middleware.js';
import pedidoRoutes from "./modules/pedidos/pedido.routes.js";
import recepcionRoutes from "./modules/recepciones/recepcion.routes.js";
import rolloRoutes from "./modules/rollos/rollo.routes.js";

import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import cortesRoutes from "./modules/cortes/corte.routes.js";
import alertaRoutes from "./modules/alertas/alerta.routes.js";
import retazoRoutes from "./modules/retazos/retazo.routes.js";
import finanzaRoutes from "./modules/finanzas/finanza.routes.js";
import ventaRoutes from "./modules/ventas/venta.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import rolePermissionRoutes from "./modules/roles/rolePermission.routes.js";
import {
  corsOptions,
  securityHeaders,
} from "./middlewares/security.middleware.js";

const app = express();

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/api", (req, res) => {
  res.json({
    message: "API Polarizados Ya",
    login: "POST /api/auth/login",
    register: "POST /api/auth/register",
  });
});

app.get("/api/login", (req, res) => {
  res.status(405).json({
    message:
      "El login se realiza con POST /api/auth/login",
  });
});

app.use("/api/auth",authRoutes);

app.use("/api/usuarios", userRoutes);

app.use("/api/roles", rolePermissionRoutes);

app.use("/api/pedidos",pedidoRoutes);

app.use("/api/recepcion",recepcionRoutes);

app.use("/api/rollos",rolloRoutes);

app.use("/api/cortes",cortesRoutes);

app.use("/api/dashboard",dashboardRoutes);

app.use("/api/alertas",alertaRoutes);

app.use("/api/retazos",retazoRoutes);

app.use("/api/finanzas",finanzaRoutes);

app.use("/api/ventas",ventaRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
