import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types';
import {
  AuthContext,
  type AuthContextValue,
  type LoginHandler,
  type LogoutHandler,
} from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin' } as const;
const VIEWER_CREDENTIALS = { username: 'viewer', password: 'viewer' } as const;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback<LoginHandler>(async (username, password) => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setUser({ username: ADMIN_CREDENTIALS.username, role: 'admin' });
      return;
    }

    if (username === VIEWER_CREDENTIALS.username && password === VIEWER_CREDENTIALS.password) {
      setUser({ username: VIEWER_CREDENTIALS.username, role: 'viewer' });
      return;
    }

    throw new Error('Invalid credentials. Use admin/admin or viewer/viewer');
  }, []);

  const logout = useCallback<LogoutHandler>(() => {
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
