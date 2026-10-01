import api from "./axios";
export const getMedidasVehiculos = () => api.get("/medidas-vehiculos");
export const createMedidaVehiculo = (data) => api.post("/medidas-vehiculos", data);
export const updateMedidaVehiculo = (id, data) => api.put(`/medidas-vehiculos/${id}`, data);
export const deleteMedidaVehiculo = (id) => api.delete(`/medidas-vehiculos/${id}`);
