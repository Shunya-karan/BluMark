import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1", headers: { "Content-Type": "application/json" }, withCredentials: false });
api.interceptors.request.use((config) => { const token = sessionStorage.getItem("bluemark_access_token"); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response.data, (error) => { if (error.response?.status === 401) window.dispatchEvent(new Event("bluemark:unauthorized")); return Promise.reject(error); });
export const errorMessage = (error) => error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";
export default api;
