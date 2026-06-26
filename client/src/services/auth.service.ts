/**
 * services/auth.service.ts — Client-side wrapper for the authentication API.
 *
 * Provides login, registration, logout, and current-user profile fetch operations.
 * Token storage (localStorage) is handled by AuthContext, not here — this service only
 * makes the HTTP calls and returns the response data.
 */
import api from "./api";
import type { User, ApiResponse } from "../types";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  first_name: string;
  role: "employer" | "employee";
  company_id?: string;
}

interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthData> {
    const { data } = await api.post<ApiResponse<AuthData>>(
      "/auth/login",
      payload,
    );
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthData> {
    const { data } = await api.post<ApiResponse<AuthData>>(
      "/auth/register",
      payload,
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>("/auth/me");
    return data.data;
  },
};
