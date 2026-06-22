/**
 * services/scheduled.service.ts — Client-side wrapper for the employer-level scheduled allocation API.
 *
 * Manages recurring allocation rules at the company level: an employer can define rules that
 * automatically distribute tokens to specific employees or all active employees on a given
 * schedule. Different from managerService.scheduled, which manages manager-to-employee rules.
 */
import api from './api';
import type { ScheduledAllocation, ApiResponse } from '../types';

interface SchedPayload {
  receiver_id?: string | null;
  amount: number;
  label?: string;
  frequency: 'monthly' | 'annual';
  day_of_month: number;
  month?: number | null;
  excluded_user_ids?: string[];
}

export const scheduledService = {
  async list(): Promise<ScheduledAllocation[]> {
    const { data } = await api.get<ApiResponse<ScheduledAllocation[]>>('/scheduled-allocations');
    return data.data;
  },

  async create(payload: SchedPayload): Promise<ScheduledAllocation> {
    const { data } = await api.post<ApiResponse<ScheduledAllocation>>('/scheduled-allocations', payload);
    return data.data;
  },

  async update(id: string, payload: SchedPayload): Promise<ScheduledAllocation> {
    const { data } = await api.put<ApiResponse<ScheduledAllocation>>(`/scheduled-allocations/${id}`, payload);
    return data.data;
  },

  async toggle(id: string): Promise<ScheduledAllocation> {
    const { data } = await api.patch<ApiResponse<ScheduledAllocation>>(`/scheduled-allocations/${id}/toggle`);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/scheduled-allocations/${id}`);
  },
};
