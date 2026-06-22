/**
 * services/api.ts — Configured Axios instance for all PRIM'O API calls.
 *
 * Reads the API base URL from the VITE_API_URL environment variable, defaulting to
 * http://localhost:5000 for local development. Two interceptors are applied:
 *
 *   Request interceptor: reads the access token from localStorage and attaches it as a
 *   Bearer token on every outgoing request.
 *
 *   Response interceptor: if a request fails with 401, attempts to obtain a new access
 *   token by calling /auth/refresh with the stored refresh token, then retries the original
 *   request once. If the refresh also fails (token expired or missing), clears stored tokens
 *   and redirects the browser to /login.
 *
 * All service modules import this instance rather than creating their own axios instances,
 * ensuring consistent authentication and error handling across the entire app.
 */
import axios from "axios";

const BASE_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → try refresh, then retry once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const newToken: string = data.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
