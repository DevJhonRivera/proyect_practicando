import api from "./axios";

export const getAlertas = (params = {}) =>
  api.get("/alertas", { params });

export const atenderAlerta = (id) =>
  api.patch(`/alertas/${id}/atender`);
