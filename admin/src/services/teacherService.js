import api from "./api";
export const teacherService = { list: (params) => api.get("/admin/teachers", { params }), get: (id) => api.get(`/admin/teachers/${id}`), setStatus: (id, isActive) => api.patch(`/admin/${id}/status`, { isActive }), provision: (payload) => api.post("/auth/provision-user", payload) };
