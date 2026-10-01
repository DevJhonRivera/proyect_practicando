import * as service from "./coordinacion.service.js";

const responder = (fn) => async (req, res) => {
  try { res.json({ success: true, data: await fn(req, res) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
};

export const getOrdenes = responder((req) => service.listarOrdenesCoordinacion(req.user));
export const getInstaladores = responder(() => service.listarInstaladores());
export const putPropuesta = responder((req) => service.guardarPropuesta(req.params.id, req.body, req.user));
export const patchRevision = responder((req) => service.revisarPropuesta(req.params.id, req.body, req.user));
export const patchMaterialListo = responder((req) => service.marcarMaterialListo(req.params.id));
export const patchAsignacion = responder((req) => service.actualizarAsignacion(req.params.id, req.params.asignacionId, req.body, req.user));
export const patchEnviarVentas = responder((req) => service.enviarTrabajoAVentas(req.params.id));
