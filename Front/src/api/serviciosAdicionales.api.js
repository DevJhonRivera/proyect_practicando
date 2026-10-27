import api from "./axios";

export const getServiciosAdicionales = () => api.get("/servicios-adicionales");
export const createServicioAdicional = (data) => api.post("/servicios-adicionales", data);
export const deleteServicioAdicional = (id) => api.delete(`/servicios-adicionales/${id}`);
