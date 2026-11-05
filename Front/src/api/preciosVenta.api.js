import api from "./axios";

export const getPreciosVenta = () => api.get("/precios-venta");
export const updatePrecioVenta = (codigo, data) => api.put(`/precios-venta/${encodeURIComponent(codigo)}`, data);
export const createPrecioVenta = (data) => api.post("/precios-venta", data);
