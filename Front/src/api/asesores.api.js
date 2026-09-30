import api from "./axios";

export const getCatalogoDisponible = () =>
  api.get("/asesores/materiales");

export const getClienteAsesoria = (cedula) =>
  api.get(`/asesores/clientes/${cedula}`);

export const searchClientesAsesoria = (buscar) =>
  api.get("/asesores/clientes", { params: { buscar } });

export const createBorradorAsesoria = (data) =>
  api.post("/asesores/borradores", data);

export const getAsesorias = (params = {}) =>
  api.get("/asesores/servicios", { params });

export const getAsesoriaPorId = (id) =>
  api.get(`/asesores/servicios/${id}`);

export const updateAsesoria = (id, data) =>
  api.put(`/asesores/servicios/${id}`, data);

export const createNovedadAsesoria = (id, data) =>
  api.post(`/asesores/servicios/${id}/novedades`, data);

export const reviewNovedadAsesoria = (id, novedadId, data) =>
  api.patch(`/asesores/servicios/${id}/novedades/${novedadId}`, data);

export const reviewGarantiaAsesoria = (id, data) =>
  api.patch(`/asesores/servicios/${id}/garantia`, data);

export const enviarAsesoriaAVentas = (id) =>
  api.patch(`/asesores/servicios/${id}/enviar-ventas`);
