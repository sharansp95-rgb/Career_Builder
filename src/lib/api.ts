import axios from "axios";
import { getStoredToken } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  timeout: 90_000,
  withCredentials: true,
});

// Attach the JWT as Authorization header so cross-origin requests work
// even when the HttpOnly cookie is not forwarded by the browser.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
