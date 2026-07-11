import api from "./axios";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};

export const getStockAlerts = async () => {
  const response = await api.get("/dashboard/alerts");
  return response.data;
};

export const getRecentOrders = async () => {
  const response = await api.get("/dashboard/orders");
  return response.data;
};

export const getMonthlySales = async () => {
  const response = await api.get("/dashboard/sales");
  return response.data;
};
