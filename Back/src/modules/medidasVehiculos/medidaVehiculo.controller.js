import { actualizarMedida, crearMedida, eliminarMedida, listarMedidas } from "./medidaVehiculo.service.js";

const responderError = (res, error) => res.status(error?.code === 11000 ? 409 : 400).json({ message: error?.code === 11000 ? "Este vehículo ya tiene medidas registradas" : error.message });
export const getMedidas = async (_req, res) => { try { res.json({ data: await listarMedidas() }); } catch (error) { responderError(res, error); } };
export const postMedida = async (req, res) => { try { res.status(201).json({ data: await crearMedida(req.body) }); } catch (error) { responderError(res, error); } };
export const putMedida = async (req, res) => { try { res.json({ data: await actualizarMedida(req.params.id, req.body) }); } catch (error) { responderError(res, error); } };
export const deleteMedida = async (req, res) => { try { res.json({ data: await eliminarMedida(req.params.id) }); } catch (error) { responderError(res, error); } };
