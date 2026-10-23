"use client";

import {
  clearPendingPin,
  clearStoredToken,
  clearStoredUser,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "@/lib/auth";
import type { AuthUser } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const persist = useCallback((u: AuthUser) => {
    const { token, ...next } = u;
    if (token) setStoredToken(token);
    setStoredUser(next);
    setUser(next);
  }, []);

  const login = persist;
  const updateUser = persist;

  const logout = useCallback(() => {
    clearPendingPin();
    clearStoredToken();
    clearStoredUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, updateUser, logout }),
    [user, loading, login, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
