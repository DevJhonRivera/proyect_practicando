import api from "./axios";

export const getResumenFinanciero = () =>
  api.get("/finanzas/resumen");

export const getCosteos = () =>
  api.get("/finanzas/costeos");

export const getCosteoPedido = (pedidoId) =>
  api.get(`/finanzas/costeos/${pedidoId}`);

export const saveCosteoPedido = (data) =>
  api.post("/finanzas/costeos", data);

export const getReporteFinanciero = () =>
  api.get("/finanzas/reporte");
