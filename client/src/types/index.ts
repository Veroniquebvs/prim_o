/**
 * types/index.ts — Shared TypeScript type definitions for the PRIM'O frontend.
 *
 * Mirrors the backend database schema and API response shapes. All API calls return data
 * wrapped in ApiResponse<T>; error responses return ApiError. These types are used across
 * services, pages, and components to ensure type safety at the call sites.
 */

export type UserRole = "employer" | "employee" | "admin" | "manager";

export interface User {
  id: string;
  email: string;
  name: string;
  first_name: string;
  role: UserRole;
  token_balance: number;
  team_token_balance?: number;
  company_id: string | null;
  created_at: string;
  createdAt?: string;
  entry_date?: string | null;
  avatar_index?: number | null;
}

export interface Company {
  id: string;
  name: string;
  token_balance: number;
  feedback_enabled: boolean;
  street?: string;
  zip_code?: string;
  city?: string;
  email?: string;
  siret?: string;
  created_at: string;
  createdAt?: string;
}

export interface TokenTransaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  type: string;
  reason?: string;
  company_id: string;
  stripe_payment_id?: string;
  created_at: string;
  createdAt?: string;
  sender?: {
    id: string;
    name: string;
    first_name: string;
    email: string;
  } | null;
  receiver?: {
    id: string;
    name: string;
    first_name: string;
    email: string;
    team_id?: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

export const VOUCHER_CATEGORIES = [
  "sport",
  "voyage",
  "culture",
  "nourriture",
  "loisirs",
  "tech",
  "services",
  "shopping",
  "bien-être",
] as const;

export type VoucherCategory = (typeof VOUCHER_CATEGORIES)[number];

export interface Voucher {
  id: string;
  partner: string;
  title: string;
  promo_code: string;
  token_cost: number;
  available: boolean;
  category: VoucherCategory | null;
  images: string[];
  created_at: string;
  createdAt?: string;
  favorite_count?: number;
  is_featured?: boolean;
  is_weekly?: boolean;
}

export interface Redemption {
  id: string;
  user_id: string;
  voucher_id: string;
  promo_code: string;
  redeemed_at: string;
  createdAt?: string;
  voucher?: { id: string; title: string; partner: string; token_cost: number };
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  user?: User;
}

export interface Team {
  id: string;
  name: string;
  company_id: string;
  manager_id: string;
  token_balance: number;
  dissolved_at: string | null;
  created_at: string;
  members?: TeamMember[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code: number;
}

export interface AdminVoucher extends Voucher {
  redemptions: { id: string }[];
}

export interface AdminRedemption {
  id: string;
  promo_code: string;
  redeemed_at: string;
  created_at: string;
  createdAt?: string;
  user: { id: string; first_name: string; name: string; email: string };
  voucher: { id: string; partner: string; title: string; token_cost: number };
}

export interface ScheduledAllocation {
  id: string;
  company_id: string;
  sender_id: string;
  receiver_id: string | null;
  amount: number;
  label: string | null;
  frequency: 'monthly' | 'annual';
  day_of_month: number;
  month: number | null;
  next_run_at: string;
  active: boolean;
  excluded_user_ids: string[];
  created_at: string;
  target_type: 'user' | 'all_company' | 'all_employees' | 'all_managers' | 'team' | 'team_and_manager';
  target_team_id: string | null;
  target_account?: 'personal' | 'team';
  receiver?: { id: string; first_name: string; name: string; email: string } | null;
  target_team?: { id: string; name: string } | null;
}
