import api from "./axios";

export const getAlertas = () =>
  api.get("/alertas");

export const atenderAlerta = (id) =>
  api.patch(`/alertas/${id}/atender`);
