import api from "./axios";

export const getOrdenesTrabajo = (params = {}) => api.get("/ordenes-trabajo", { params });
