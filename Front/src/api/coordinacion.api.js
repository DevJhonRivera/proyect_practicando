import api from "./axios";
export const getTarifasManoObra = () => api.get("/coordinacion/tarifas-mano-obra");
export const saveTarifasManoObra = (data) => api.put("/coordinacion/tarifas-mano-obra", data);

export const getOrdenesCoordinacion = (params) => api.get("/coordinacion/ordenes", { params });
export const getInstaladoresCoordinacion = () => api.get("/coordinacion/instaladores");
export const savePropuestaCoordinacion = (id, data) => api.put(`/coordinacion/ordenes/${id}/propuesta`, data);
export const reviewPropuestaCoordinacion = (id, data) => api.patch(`/coordinacion/ordenes/${id}/revision`, data);
export const markMaterialReady = (id) => api.patch(`/coordinacion/ordenes/${id}/material-listo`);
export const updateAsignacionCoordinacion = (id, asignacionId, data) => api.patch(`/coordinacion/ordenes/${id}/asignaciones/${asignacionId}`, data);
export const sendTrabajoToSales = (id) => api.patch(`/coordinacion/ordenes/${id}/enviar-ventas`);
