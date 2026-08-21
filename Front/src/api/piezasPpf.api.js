import api from "./axios";

export const getPiezasPpf = (params = {}) =>
  api.get("/piezas-ppf", {
    params,
  });

export const createPiezaPpf = (data) =>
  api.post("/piezas-ppf", data);

export const updatePiezaPpf = (id, data) =>
  api.put(`/piezas-ppf/${id}`, data);

export const deletePiezaPpf = (id) =>
  api.delete(`/piezas-ppf/${id}`);
