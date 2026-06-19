import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Company } from '../types';
import { authService } from '../services/auth.service';
import { companyService } from '../services/company.service';

interface RegisterPayload {
  name: string;
  first_name: string;
  email: string;
  password: string;
  role: 'employer' | 'employee' | 'manager';
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

  async function login(email: string, password: string): Promise<User> {
    const { accessToken, refreshToken, user: u } = await authService.login({ email, password });
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    await fetchCompany(u);
    return u;
  }

  async function register(payload: RegisterPayload): Promise<void> {
    const { accessToken, refreshToken, user: u } = await authService.register(payload);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    await fetchCompany(u);
  }

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

  async function refreshUser(): Promise<void> {
    const u = await authService.me();
    setUser(u);
  }

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
