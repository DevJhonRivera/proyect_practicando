import { ajustarStockAccesorio, actualizarAccesorio, crearAccesorio, eliminarAccesorio, listarAccesorios } from "./accesorio.service.js";

const responder = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); }
  catch (error) { res.status(400).json({ message: error.message }); }
};

export const getAccesorios = responder((req) => listarAccesorios(req.query));
export const createAccesorio = responder((req) => crearAccesorio(req.body, req.user), 201);
export const updateAccesorio = responder((req) => actualizarAccesorio(req.params.id, req.body));
export const adjustAccesorio = responder((req) => ajustarStockAccesorio(req.params.id, req.body, req.user));
export const deleteAccesorio = responder((req) => eliminarAccesorio(req.params.id));
