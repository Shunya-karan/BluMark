import api from "./api";
export const adminService = {
  profile: () => api.get("/admin/profile"), updateProfile: (payload) => api.patch("/admin/profile", payload),
  departments: { list: (params) => api.get("/admin/departments", { params }), create: (p) => api.post("/admin/departments", p), update: (id,p) => api.patch(`/admin/departments/${id}`,p) },
  classes: { list: (params) => api.get("/admin/classes", { params }), create: (p) => api.post("/admin/classes", p), update: (id,p) => api.patch(`/admin/classes/${id}`,p) },
  subjects: { list: (params) => api.get("/admin/subjects", { params }), create: (p) => api.post("/admin/subjects", p), update: (id,p) => api.patch(`/admin/subjects/${id}`,p) },
  assignments: { list: (params) => api.get("/admin/assignments", { params }), create: (p) => api.post("/admin/assignments", p), reassign: (id,p) => api.patch(`/admin/assignments/${id}/teacher`,p) },
  notifications: { list: (params) => api.get("/admin/notifications", { params }), stats: () => api.get("/admin/notifications/stats"), send: (p) => api.post("/admin/notifications",p) },
  devices: { list: (params) => api.get("/admin/devices", { params }), approve: (id) => api.patch(`/admin/devices/${id}/approve`), reject: (id,p) => api.patch(`/admin/devices/${id}/reject`,p), revoke: (id,p) => api.patch(`/admin/devices/${id}/revoke`,p) }
};
