import api from './api';
import type { Voucher, Redemption, AdminVoucher, AdminRedemption, ApiResponse } from '../types';

export const marketplaceService = {
  async getItems(): Promise<Voucher[]> {
    const { data } = await api.get<ApiResponse<Voucher[]>>('/api/marketplace/items');
    return data.data;
  },

  async getItemById(id: string): Promise<Voucher> {
    const { data } = await api.get<ApiResponse<Voucher>>(`/api/marketplace/items/${id}`);
    return data.data;
  },

  async uploadImages(files: File[]): Promise<string[]> {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    const { data } = await api.post<ApiResponse<{ urls: string[] }>>('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.urls;
  },

  async createItem(payload: { partner: string; title: string; promo_code: string; token_cost: number; images?: string[]; category?: string }): Promise<Voucher> {
    const { data } = await api.post<ApiResponse<Voucher>>('/api/marketplace/items', payload);
    return data.data;
  },

  async updateItem(id: string, payload: Partial<{ partner: string; title: string; promo_code: string; token_cost: number; available: boolean; category: string; images: string[]; is_featured: boolean }>): Promise<Voucher> {
    const { data } = await api.put<ApiResponse<Voucher>>(`/api/marketplace/items/${id}`, payload);
    return data.data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/api/marketplace/items/${id}`);
  },

  async redeem(voucher_id: string): Promise<{ promo_code: string }> {
    const { data } = await api.post<ApiResponse<{ promo_code: string }>>('/api/marketplace/redeem', { voucher_id });
    return data.data;
  },

  async getOrders(): Promise<Redemption[]> {
    const { data } = await api.get<ApiResponse<Redemption[]>>('/api/marketplace/orders');
    return data.data;
  },

  async adminGetVouchers(): Promise<AdminVoucher[]> {
    const { data } = await api.get<ApiResponse<AdminVoucher[]>>('/api/marketplace/admin/vouchers');
    return data.data;
  },

  async adminGetHistory(): Promise<AdminRedemption[]> {
    const { data } = await api.get<ApiResponse<AdminRedemption[]>>('/api/marketplace/admin/history');
    return data.data;
  },

  async getFavorites(): Promise<{ voucher_id: string; created_at: string }[]> {
    const { data } = await api.get<ApiResponse<{ voucher_id: string; created_at: string }[]>>('/api/favorites');
    return data.data;
  },

  async toggleFavorite(voucher_id: string): Promise<{ favorited: boolean }> {
    const { data } = await api.post<ApiResponse<{ favorited: boolean }>>('/api/favorites/toggle', { voucher_id });
    return data.data;
  },
};
