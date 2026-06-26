/**
 * services/token.service.ts — Client-side wrapper for token management API endpoints.
 *
 * Covers employer token allocation, balance queries, transaction history, admin deduction,
 * and Stripe subscription management. All methods return typed data extracted from the
 * standard API response envelope { success, data }.
 */
import api from './api';
import type { TokenTransaction, ApiResponse } from '../types';

interface AllocatePayload {
  target_type: string;
  receiver_id?: string | null;
  target_team_id?: string | null;
  excluded_user_ids?: string[];
  amount: number;
  reason?: string;
  target_account?: 'personal' | 'team';
}

export const tokenService = {
  async allocate(payload: AllocatePayload): Promise<TokenTransaction> {
    const { data } = await api.post<ApiResponse<TokenTransaction>>('/tokens/allocate', payload);
    return data.data;
  },

  async getBalance(userId: string): Promise<number> {
    const { data } = await api.get<ApiResponse<{ token_balance: number }>>(`/tokens/balance/${userId}`);
    return data.data.token_balance;
  },

  async getTransactions(params?: { userId?: string; type?: string }): Promise<TokenTransaction[]> {
    const { data } = await api.get<ApiResponse<TokenTransaction[]>>('/tokens/transactions', { params });
    return data.data;
  },

  async getTransactionById(id: string): Promise<TokenTransaction> {
    const { data } = await api.get<ApiResponse<TokenTransaction>>(`/tokens/transactions/${id}`);
    return data.data;
  },

  async adminDeduct(payload: {
    target: 'company' | 'employee';
    company_id: string;
    user_id?: string;
    amount: number;
    reason?: string;
  }): Promise<void> {
    await api.post('/tokens/admin/deduct', payload);
  },

  async subscribe(planId: string): Promise<{ clientSecret: string; subscriptionId: string }> {
    const { data } = await api.post('/tokens/subscribe', { planId });
    return data;
  },

  async getSubscription(): Promise<{ plan: string; status: string; next_billing: string } | null> {
    const { data } = await api.get('/tokens/subscription');
    return data.subscription;
  },
};
