import Accesorio from "../accesorios/accesorio.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import Corte from "../cortes/corte.model.js";
import CosteoPedido from "../finanzas/costeoPedido.model.js";
import Pedido from "../pedidos/pedido.model.js";
import Recepcion from "../recepciones/recepcion.model.js";
import Rollo from "../rollos/rollo.model.js";
import { obtenerReabastecimiento } from "../rollos/rollo.service.js";

const lineasEsperadas = (orden) => [
  ...(orden.polarizados || []).map((item, index) => ({
    linea: `POLARIZADO ${index + 1}`,
    material: `${item.material} ${item.porcentaje}`.trim(),
  })),
  ...(orden.ppf || []).map((item, index) => ({
    linea: `PPF ${index + 1}`,
    material: `PPF ${item.referencia}`.trim(),
  })),
];

export const obtenerBandejaInventario = async () => {
  const [costeos, pedidos, recepciones, propuestas, ordenesCorte, ordenesReposicion, accesoriosPendientes, accesoriosBajos, rollosSinCosto, reabastecimiento] = await Promise.all([
    CosteoPedido.find().distinct("pedidoId"),
    Pedido.find({ estado: { $ne: "COMPLETADO" } })
      .select("codigoPedido proveedor estado fechaPedido createdAt")
      .sort({ createdAt: 1 })
      .lean(),
    Recepcion.find({ estado: { $ne: "COMPLETADA" } })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    Asesoria.find({ "flujo.etapa": "PENDIENTE_APROBACION_CORTE" })
      .select("codigo cliente vehiculo garantia coordinacion.propuesta createdAt")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    Asesoria.find({ "flujo.etapa": { $in: ["PENDIENTE_INVENTARIO", "EN_PROCESO"] } })
      .select("codigo cliente vehiculo polarizados ppf garantia flujo createdAt")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    Asesoria.find({
      novedades: { $elemMatch: { tipo: "REPETICION_CORTE", estado: "APROBADA" } },
    })
      .select("codigo cliente vehiculo polarizados ppf novedades createdAt")
      .sort({ updatedAt: 1 })
      .limit(100)
      .lean(),
    Asesoria.aggregate([
      { $match: { estado: { $ne: "CANCELADA" }, "accesorios.cantidadPendiente": { $gt: 0 } } },
      { $unwind: "$accesorios" },
      { $match: { "accesorios.cantidadPendiente": { $gt: 0 } } },
      { $group: {
        _id: "$accesorios.accesorioId",
        nombre: { $first: "$accesorios.nombre" },
        marca: { $first: "$accesorios.marca" },
        cantidadPendiente: { $sum: "$accesorios.cantidadPendiente" },
        ordenes: { $addToSet: "$codigo" },
      } },
      { $sort: { cantidadPendiente: -1 } },
      { $limit: 100 },
    ]),
    Accesorio.find({
      activo: { $ne: false },
      $expr: { $lte: ["$stock", "$stockMinimo"] },
    }).select("codigo nombre marca stock stockMinimo").sort({ stock: 1 }).limit(100).lean(),
    Rollo.find({
      estado: "RESERVA",
      $or: [
        { costeoPedidoId: { $exists: false } },
        { costeoPedidoId: null },
        { costoPorMetroCop: { $lte: 0 } },
      ],
    }).select("codigoRollo tipoPolarizado porcentaje unidadMedida ancho pedidoId createdAt")
      .populate("pedidoId", "codigoPedido")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    obtenerReabastecimiento(),
  ]);

  const costeados = new Set(costeos.map(String));
  const pedidosSinCostear = pedidos.filter((pedido) => !costeados.has(String(pedido._id)));
  const cortes = ordenesCorte.length
    ? await Corte.find({ asesoriaId: { $in: ordenesCorte.map((orden) => orden._id) } })
        .select("asesoriaId asesoriaLinea")
        .lean()
    : [];
  const lineasPorOrden = cortes.reduce((mapa, corte) => {
    const id = String(corte.asesoriaId);
    if (!mapa.has(id)) mapa.set(id, new Set());
    mapa.get(id).add(corte.asesoriaLinea);
    return mapa;
  }, new Map());
  const cortesPendientes = ordenesCorte.map((orden) => {
    const registradas = lineasPorOrden.get(String(orden._id)) || new Set();
    const faltantes = lineasEsperadas(orden).filter((item) => !registradas.has(item.linea));
    return { ...orden, faltantes };
  }).filter((orden) => orden.faltantes.length > 0);
  const reposiciones = ordenesReposicion.flatMap((orden) =>
    (orden.novedades || [])
      .filter((item) => item.tipo === "REPETICION_CORTE" && item.estado === "APROBADA")
      .map((item) => ({
        _id: item._id,
        asesoriaId: orden._id,
        codigo: orden.codigo,
        cliente: orden.cliente,
        vehiculo: orden.vehiculo,
        serviciosAfectados: item.serviciosAfectados || [],
        instaladorNombre: item.instaladorNombre || "",
        responsableCosto: item.responsableCosto,
        fecha: item.fechaRevision || item.fecha,
      }))
  );

  return {
    generadoAt: new Date(),
    resumen: {
      propuestas: propuestas.length,
      cortes: cortesPendientes.length,
      reposiciones: reposiciones.length,
      recepciones: recepciones.length,
      pedidosSinCostear: pedidosSinCostear.length,
      accesorios: accesoriosPendientes.length + accesoriosBajos.length,
      reabastecimiento: reabastecimiento.filter((item) => ["PEDIR_AHORA", "PEDIR_PRONTO"].includes(item.estado)).length,
    },
    propuestas,
    cortes: cortesPendientes,
    reposiciones,
    recepciones,
    pedidosSinCostear,
    accesoriosPendientes,
    accesoriosBajos,
    rollosSinCosto,
    reabastecimiento: reabastecimiento.filter((item) => ["PEDIR_AHORA", "PEDIR_PRONTO"].includes(item.estado)).slice(0, 100),
  };
};
