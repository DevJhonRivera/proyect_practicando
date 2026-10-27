import api from "./axios";

export const getAccesorios = (params = {}) => api.get("/accesorios", { params });
export const getCatalogoAccesorios = () => api.get("/accesorios/catalogo");
export const createAccesorio = (data) => api.post("/accesorios", data);
export const updateAccesorio = (id, data) => api.put(`/accesorios/${id}`, data);
export const adjustStockAccesorio = (id, data) => api.patch(`/accesorios/${id}/stock`, data);
export const deleteAccesorio = (id) => api.delete(`/accesorios/${id}`);
