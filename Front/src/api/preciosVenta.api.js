import api from "./axios";

export const getPreciosVenta = (params = {}) => api.get("/precios-venta", { params });
export const updatePrecioVenta = (codigo, data) => api.put(`/precios-venta/${encodeURIComponent(codigo)}`, data);
export const createPrecioVenta = (data) => api.post("/precios-venta", data);
export const deletePrecioVenta = (codigo, revision) => api.delete(`/precios-venta/${encodeURIComponent(codigo)}`, { data: { revision } });
