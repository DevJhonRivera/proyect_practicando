import Pedido from "../pedidos/pedido.model.js";
import Rollo from "../rollos/rollo.model.js";
import Corte from "../cortes/corte.model.js";
import Alerta from "../alertas/alerta.model.js";

export const obtenerDashboard =
  async () => {
    const [
      pedidosPendientes,
      pedidosCompletados,

      rollosReserva,
      rollosUso,
      rollosAgotados,

      alertasPendientes,

      totalCortes,
    ] = await Promise.all([
      Pedido.countDocuments({
        estado: "PENDIENTE",
      }),

      Pedido.countDocuments({
        estado: "COMPLETADO",
      }),

      Rollo.countDocuments({
        estado: "RESERVA",
      }),

      Rollo.countDocuments({
        estado: "USO",
      }),

      Rollo.countDocuments({
        estado: "AGOTADO",
      }),

      Alerta.countDocuments({
        atendida: false,
      }),

      Corte.countDocuments(),
    ]);

    return {
      pedidos: {
        pendientes:
          pedidosPendientes,

        completados:
          pedidosCompletados,
      },

      inventario: {
        reserva: rollosReserva,

        uso: rollosUso,

        agotados:
          rollosAgotados,
      },

      alertasPendientes,

      totalCortes,
    };
  };