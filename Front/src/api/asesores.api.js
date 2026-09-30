import api from "./axios";

export const getCatalogoDisponible = () =>
  api.get("/asesores/materiales");

export const getClienteAsesoria = (cedula) =>
  api.get(`/asesores/clientes/${cedula}`);

export const createBorradorAsesoria = (data) =>
  api.post("/asesores/borradores", data);

export const getAsesorias = (params = {}) =>
  api.get("/asesores/servicios", { params });

export const getAsesoriaPorId = (id) =>
  api.get(`/asesores/servicios/${id}`);

export const updateAsesoria = (id, data) =>
  api.put(`/asesores/servicios/${id}`, data);

export const enviarAsesoriaAVentas = (id) =>
  api.patch(`/asesores/servicios/${id}/enviar-ventas`);
