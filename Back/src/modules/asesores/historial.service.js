import Asesoria from "./asesoria.model.js";
import { medirEtapas } from "./trazabilidad.utils.js";

function fechaColombia(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new RangeError("Fecha no valida.");
  const fecha = new Date(valor + "T00:00:00-05:00");
  if (!Number.isFinite(+fecha) || fecha.toISOString().slice(0, 10) !== valor) throw new RangeError("Fecha no valida.");
  return fecha;
}

export async function listarHistorialServicios({ buscar, desde, hasta, page }) {
  const query = {};
  if (typeof buscar === "string" && buscar.trim()) {
    const termino = buscar.trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["codigo", "cliente.nombre", "vehiculo.placa", "asesorNombre"].map((campo) => ({
      [campo]: new RegExp(termino, "i"),
    }));
  }
  if (desde || hasta) {
    if (desde && hasta && desde > hasta) throw new RangeError("La fecha inicial debe ser anterior o igual a la final.");
    query.createdAt = {};
    if (desde) query.createdAt.$gte = fechaColombia(desde);
    if (hasta) query.createdAt.$lt = new Date(+fechaColombia(hasta) + 86400000);
  }
  const pagina = Number(page);
  const actual = Number.isSafeInteger(pagina) && pagina > 0 && pagina < 10000000 ? pagina : 1;
  const limite = 10;
  const ahora = Date.now();
  const etapas = new Map();
  let sinRegistro = 0;
  let esperaMayor = null;

  const campos = "codigo vehiculo.placa cliente.nombre asesorNombre flujo.etapa createdAt";
  const items = await Asesoria.find(query).select(campos)
    .sort({ createdAt: -1, _id: -1 }).skip((actual - 1) * limite).limit(limite).lean();
  const cursor = Asesoria.find(query).select("codigo vehiculo.placa flujo.etapa trazabilidad.proceso trazabilidad.estado trazabilidad.fecha").lean().cursor();
  let total = 0;
  for await (const orden of cursor) {
    total++;
    const visitas = medirEtapas(orden.trazabilidad, ahora);
    if (!visitas.length) sinRegistro++;
    for (const visita of visitas) {
      const { estado, activo, duracionMs } = visita;
      if (!etapas.has(estado)) etapas.set(estado, { estado, abiertas: 0, cerradas: 0, totalMs: 0 });
      const fila = etapas.get(estado);
      if (activo) {
        if (estado !== orden.flujo?.etapa) continue;
        fila.abiertas++;
        const caso = { id: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa, estado, duracionMs };
        if (!fila.esperaMayor || duracionMs > fila.esperaMayor.duracionMs) fila.esperaMayor = caso;
        if (!esperaMayor || duracionMs > esperaMayor.duracionMs) esperaMayor = caso;
      } else {
        fila.cerradas++;
        fila.totalMs += duracionMs;
      }
    }
  }
  return {
    items,
    pagination: { total, totalPages: Math.max(1, Math.ceil(total / limite)) },
    analisis: {
      sinRegistro, esperaMayor,
      etapas: [...etapas.values()].filter((fila) => fila.abiertas || fila.cerradas)
        .map((fila) => ({ ...fila, promedioMs: fila.cerradas ? fila.totalMs / fila.cerradas : null }))
        .sort((a, b) => (b.promedioMs ?? -1) - (a.promedioMs ?? -1)),
    },
  };
}
