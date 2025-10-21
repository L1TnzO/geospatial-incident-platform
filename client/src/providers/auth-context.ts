import { createContext } from 'react';
import type { User } from '../types';

export type LoginHandler = (username: string, password: string) => Promise<void>;
export type LogoutHandler = () => void;

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: LoginHandler;
  logout: LogoutHandler;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
