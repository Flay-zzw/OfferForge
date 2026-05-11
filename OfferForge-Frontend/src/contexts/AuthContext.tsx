import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { UserInfo } from '../types';

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  isGuest: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (account: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('offerforge-token'));
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('offerforge-token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (account: string, password: string) => {
    const res = await api.login({ account, password });
    localStorage.setItem('offerforge-token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (account: string, password: string, nickname?: string) => {
    const res = await api.register({ account, password, nickname });
    localStorage.setItem('offerforge-token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('offerforge-token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isGuest: !user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Generate a default avatar SVG data URL from a nickname */
export function getDefaultAvatar(nickname: string): string {
  const initial = (nickname || '?')[0].toUpperCase();
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const idx = initial.charCodeAt(0) % colors.length;
  const bg = colors[idx];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="${bg}" width="80" height="80" rx="16"/><text fill="#fff" font-family="Inter,sans-serif" font-size="36" font-weight="700" x="50%" y="54%" dominant-baseline="middle" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}