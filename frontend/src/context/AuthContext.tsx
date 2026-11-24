import React, { createContext, useCallback, useContext, useState } from 'react';
import { authService } from '../services/authService';
import { UserAccount } from '../types';

interface AuthContextValue {
  user: UserAccount | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginDemo: () => UserAccount;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => { ok: boolean; error?: string };
  updateAccount: (updates: { fullName: string; email: string }) => {
    ok: boolean;
    error?: string;
  };
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
  logout: () => void;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => authService.getCurrentUser());

  const login = useCallback((email: string, password: string) => {
    const result = authService.login(email, password);
    if (result.user) {
      setUser(result.user);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const loginDemo = useCallback(() => {
    const account = authService.loginDemo();
    setUser(account);
    return account;
  }, []);

  const register = useCallback(
    (payload: { fullName: string; email: string; password: string }) => {
      const result = authService.register(payload);
      if (result.user) {
        setUser(result.user);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    []
  );

  const updateAccount = useCallback(
    (updates: { fullName: string; email: string }) => {
      if (!user) return { ok: false, error: 'Not authenticated.' };
      const result = authService.updateAccount(user.id, updates);
      if (result.user) {
        setUser(result.user);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [user]
  );

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string) => {
      if (!user) return { ok: false, error: 'Not authenticated.' };
      return authService.changePassword(user.id, currentPassword, newPassword);
    },
    [user]
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(() => {
    if (!user) return;
    authService.deleteAccount(user.id);
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        loginDemo,
        register,
        updateAccount,
        changePassword,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
