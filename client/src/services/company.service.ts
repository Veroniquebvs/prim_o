import api from "./api";
import type { Company, ApiResponse } from "../types";

interface CreateCompanyPayload {
  name: string;
  email?: string;
  street: string;
  zip_code: string;
  city: string;
  siret: string;
}

export const companyService = {
  async getAll(): Promise<Company[]> {
    const { data } = await api.get<ApiResponse<Company[]>>("/api/companies");
    return data.data;
  },

  async getById(id: string): Promise<Company> {
    const { data } = await api.get<ApiResponse<Company>>(
      `/api/companies/${id}`,
    );
    return data.data;
  },

  async create(payload: CreateCompanyPayload): Promise<Company> {
    const { data } = await api.post<ApiResponse<Company>>(
      "/api/companies",
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: Partial<CreateCompanyPayload>,
  ): Promise<Company> {
    const { data } = await api.put<ApiResponse<Company>>(
      `/api/companies/${id}`,
      payload,
    );
    return data.data;
  },
};
