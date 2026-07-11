import api from "./axios";

export const getPedidos = () =>
  api.get("/pedidos");

export const createPedido = (data) =>
  api.post("/pedidos", data);

export const updatePedido = (id, data) =>
  api.put(`/pedidos/${id}`, data);

export const deletePedido = (id) =>
  api.delete(`/pedidos/${id}`);
