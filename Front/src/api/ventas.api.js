import api from "./axios";

export const createVenta = (data) =>
  api.post("/ventas", data);

export const getVentas = () =>
  api.get("/ventas");

export const updateVenta = (id, data) =>
  api.put(`/ventas/${id}`, data);

export const updateEstadoVenta = (id, estado) =>
  api.patch(`/ventas/${id}/estado`, {
    estado,
  });
