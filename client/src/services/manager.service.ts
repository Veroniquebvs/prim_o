/**
 * services/manager.service.ts — Client-side wrapper for manager and employer-facing team management APIs.
 *
 * Covers two groups of endpoints:
 *   Employer-facing: viewing a manager's team, promoting/demoting users.
 *   Manager-facing: reading their own team, managing members, distributing tokens,
 *   and managing recurring scheduled allocations to employees.
 */
import api from "./api";
import type { ApiResponse, User, Team, ScheduledAllocation } from "../types";

export const managerService = {
  /* ── Employer-facing ── */
  async updateTeamRetributionRate(teamId: string, rate: number): Promise<Team> {
    const { data } = await api.patch<ApiResponse<Team>>(
      `/employer/teams/${teamId}/retribution-rate`,
      { rate }
    );
    return data.data;
  },

  async getManagerTeam(managerId: string): Promise<{ manager: User; team: Team | null }> {
    const { data } = await api.get<ApiResponse<{ manager: User; team: Team | null }>>(
      `/employer/managers/${managerId}/team`
    );
    return data.data;
  },

  async promoteToManager(employeeId: string, teamName: string): Promise<User> {
    const { data } = await api.patch<ApiResponse<User>>(
      `/employer/employees/${employeeId}/role`,
      { role: "manager", teamName }
    );
    return data.data;
  },

  async demoteToEmployee(managerId: string): Promise<User> {
    const { data } = await api.patch<ApiResponse<User>>(
      `/employer/employees/${managerId}/role`,
      { role: "employee" }
    );
    return data.data;
  },

  /* ── Manager-facing ── */
  async getTeam(): Promise<Team> {
    const { data } = await api.get<ApiResponse<Team>>("/manager/team");
    return data.data;
  },

  async getBalance(): Promise<{ userId: string; token_balance: number }> {
    const { data } = await api.get<ApiResponse<{ userId: string; token_balance: number }>>(
      "/manager/tokens/balance"
    );
    return data.data;
  },

  async addTeamMember(employee_id: string): Promise<void> {
    await api.post("/manager/team/members", { employee_id });
  },

  async createEmployee(payload: { first_name: string; name: string; email: string; password: string; entry_date?: string }): Promise<User> {
    const { data } = await api.post<ApiResponse<User>>("/manager/employees", payload);
    return data.data;
  },

  async giveTokens(employee_id: string, amount: number, reason?: string): Promise<void> {
    await api.post("/manager/tokens/give", { employee_id, amount, reason });
  },

  async getUnassignedCollaborators(): Promise<User[]> {
    const { data } = await api.get<ApiResponse<User[]>>("/manager/available-collaborators");
    return data.data;
  },

  async listScheduled(): Promise<ScheduledAllocation[]> {
    const { data } = await api.get<ApiResponse<ScheduledAllocation[]>>("/manager/scheduled");
    return data.data;
  },

  async createScheduled(payload: {
    receiver_id: string;
    amount: number;
    frequency?: string;
    day_of_month?: number;
    month?: number;
    label?: string;
  }): Promise<ScheduledAllocation> {
    const { data } = await api.post<ApiResponse<ScheduledAllocation>>(
      "/manager/scheduled",
      payload
    );
    return data.data;
  },

  async toggleScheduled(id: string): Promise<ScheduledAllocation> {
    const { data } = await api.patch<ApiResponse<ScheduledAllocation>>(
      `/manager/scheduled/${id}/toggle`
    );
    return data.data;
  },

  async deleteScheduled(id: string): Promise<void> {
    await api.delete(`/manager/scheduled/${id}`);
  },
};
