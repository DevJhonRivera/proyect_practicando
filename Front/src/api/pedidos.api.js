import api from "./axios";

export const getPedidos = (params = {}) =>
  api.get("/pedidos", { params });

export const createPedido = (data) =>
  api.post("/pedidos", data);

export const updatePedido = (id, data) =>
  api.put(`/pedidos/${id}`, data);

export const deletePedido = (id) =>
  api.delete(`/pedidos/${id}`);
