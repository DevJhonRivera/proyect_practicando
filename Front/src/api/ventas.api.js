import api from "./axios";

export const createVenta = (data) =>
  api.post("/ventas", data);

export const getVentas = (params = {}) =>
  api.get("/ventas", { params });

export const getVentaById = (id) =>
  api.get(`/ventas/${id}`);

export const updateVenta = (id, data) =>
  api.put(`/ventas/${id}`, data);

export const updateEstadoVenta = (id, estado, metodoPago, observacion = "") =>
  api.patch(`/ventas/${id}/estado`, {
    estado,
    metodoPago,
    observacion,
  });

export const createMovimientoPago = (id, data) =>
  api.post(`/ventas/${id}/pagos`, data);
