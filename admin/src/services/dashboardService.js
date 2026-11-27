import api from "./api";
export const dashboardService = {
  dashboard: () => api.get("/admin/dashboard"),
  summary: () => api.get("/admin/dashboard/summary"),
  activity: (limit = 10) => api.get("/admin/dashboard/recent-activity", { params: { limit } }),
};
