/**
 * context/AuthContext.tsx — React context that manages the authenticated user session.
 *
 * On mount, restores the session by calling /auth/me if an access token exists in localStorage.
 * Exposes login, register, logout, refreshUser, and refreshCompany functions that update the
 * in-memory state and localStorage tokens simultaneously.
 *
 * The company record is automatically fetched alongside the user for employers and employees
 * (roles that have a company_id). Admin users have no company and receive null.
 *
 * The useAuth hook provides access to the context value from any component within the
 * AuthProvider tree and throws if used outside of it.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Company } from '../types';
import { authService } from '../services/auth.service';
import { companyService } from '../services/company.service';

interface RegisterPayload {
  name: string;
  first_name: string;
  email: string;
  password: string;
  role: 'employer' | 'employee';
  company_id?: string;
}

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetches and stores the company record for the given user if they have a company_id. */
  async function fetchCompany(u: User) {
    if ((u.role === 'employer' || u.role === 'employee') && u.company_id) {
      try {
        const c = await companyService.getById(u.company_id);
        setCompany(c);
      } catch {}
    } else {
      setCompany(null);
    }
  }

  // Restore session from stored access token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authService
      .me()
      .then(u => { setUser(u); return fetchCompany(u); })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Authenticates with the API, stores both tokens in localStorage, and updates the user
   * and company state. Returns the authenticated User object.
   */
  async function login(email: string, password: string): Promise<User> {
    const { accessToken, refreshToken, user: u } = await authService.login({ email, password });
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    await fetchCompany(u);
    return u;
  }

  /**
   * Registers a new account with the API, stores both tokens in localStorage, and updates
   * the user and company state. No return value — the caller navigates after registration.
   */
  async function register(payload: RegisterPayload): Promise<void> {
    const { accessToken, refreshToken, user: u } = await authService.register(payload);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    await fetchCompany(u);
  }

  /**
   * Calls the logout API endpoint (best-effort), then clears localStorage tokens and resets
   * user and company state regardless of whether the API call succeeded.
   */
  async function logout(): Promise<void> {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setCompany(null);
    }
  }

  /**
   * Re-fetches the current user's profile from /auth/me and updates state.
   * Used after a balance change or profile edit to keep the displayed data current.
   */
  async function refreshUser(): Promise<void> {
    const u = await authService.me();
    setUser(u);
  }

  /**
   * Re-fetches the company record for the current user and updates state.
   * Used after a token allocation or Stripe payment to refresh the company's token balance.
   */
  async function refreshCompany(): Promise<void> {
    if (user) await fetchCompany(user);
  }

  return (
    <AuthContext.Provider
      value={{ user, company, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser, refreshCompany }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook that provides access to the authentication context from any component.
 * Must be called within a component that is a descendant of AuthProvider; throws otherwise.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
