/**
 * services/user.service.ts — Client-side wrapper for user management API endpoints.
 *
 * Provides CRUD operations for users plus activation and entry-date management.
 * Used by employer dashboards to manage the employee list.
 */
import api from "./api";
import type { User, TokenTransaction, ApiResponse } from "../types";

export const userService = {
  getAll: (params: { companyId?: string; role?: string }) => {
    return api.get("/users", { params });
  },

  async getById(id: string): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>(`/users/${id}`);
    return data.data;
  },

  async update(
    id: string,
    payload: Partial<Pick<User, "name" | "first_name" | "email">> & {
      current_password?: string;
      password?: string;
    },
  ): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, payload);
    return data.data;
  },

  async getHistory(id: string): Promise<TokenTransaction[]> {
    const { data } = await api.get<ApiResponse<TokenTransaction[]>>(
      `/users/${id}/history`,
    );
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  getPending: (companyId: string) => {
    return api.get(`/users/pending?companyId=${companyId}`);
  },

  activate: (id: string, entry_date?: string) => {
    return api.patch(`/users/${id}/activate`, {
      entry_date,
    });
  },

  updateEntryDate: (id: string, entry_date?: string) => {
    return api.patch(`/users/${id}/entry-date`, {
      entry_date,
    });
  },

  async updateAvatar(id: string, avatar_index: number): Promise<void> {
    await api.patch(`/users/${id}/avatar`, { avatar_index });
  },

  async getMyTeam(): Promise<{ team_name: string; manager: User } | null> {
    const { data } = await api.get<ApiResponse<{ team_name: string; manager: User } | null>>('/users/me/team');
    return data.data;
  },
};
