/**
 * services/company.service.ts — Client-side wrapper for the company management API.
 *
 * Provides full company CRUD, the public name lookup (used during QR-code registration),
 * and the admin token grant operation. The getPublicById call requires no authentication
 * and is used before login, so it does not need a Bearer token.
 */
import api from "./api";
import type { Company, ApiResponse, Team } from "../types";

interface CreateCompanyPayload {
  name: string;
  email?: string;
  street: string;
  zip_code: string;
  city: string;
  siret: string;
  feedback_enabled?: boolean;
}

export const companyService = {
  async getAll(): Promise<Company[]> {
    const { data } = await api.get<ApiResponse<Company[]>>("/companies");
    return data.data;
  },

  async getById(id: string): Promise<Company> {
    const { data } = await api.get<ApiResponse<Company>>(`/companies/${id}`);
    return data.data;
  },

  async getTeams(): Promise<Team[]> {
    const { data } = await api.get<ApiResponse<Team[]>>("/employer/teams");
    return data.data;
  },

  // Public — name only, for the QR-code registration flow (no auth required)
  async getPublicById(id: string): Promise<{ id: string; name: string }> {
    const { data } = await api.get<ApiResponse<{ id: string; name: string }>>(
      `/companies/${id}/public`,
    );
    return data.data;
  },

  async create(payload: CreateCompanyPayload): Promise<Company> {
    const { data } = await api.post<ApiResponse<Company>>(
      "/companies",
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: Partial<CreateCompanyPayload>,
  ): Promise<Company> {
    const { data } = await api.put<ApiResponse<Company>>(
      `/companies/${id}`,
      payload,
    );
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async grantTokens(id: string, amount: number): Promise<{ company_id: string; amount: number; new_balance: number }> {
    const { data } = await api.post<ApiResponse<{ company_id: string; amount: number; new_balance: number }>>(
      `/companies/${id}/tokens`,
      { amount }
    );
    return data.data;
  },

  async adminCreate(payload: {
    name: string;
    street: string;
    zip_code: string;
    city: string;
    siret: string;
    employer_name: string;
    employer_first_name: string;
    employer_email: string;
    password?: string;
  }): Promise<{ company: Company; employer: any }> {
    const { data } = await api.post<ApiResponse<{ company: Company; employer: any }>>(
      "/companies/admin",
      payload
    );
    return data.data;
  },
};
