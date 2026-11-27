import api from "./api";
export const authService = { login: (payload) => api.post("/auth/login", payload), me: () => api.get("/auth/me"), refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }), logout: () => api.post("/auth/logout"), changePassword: (payload) => api.post("/auth/change-password", payload) };
