import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  });

  const handleAuthResponse = useCallback(
    (data: { access_token: string; user: User }) => {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuth({ token: data.access_token, user: data.user });
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ access_token: string; user: User }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      handleAuthResponse(data);
    },
    [handleAuthResponse],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ access_token: string; user: User }>(
        '/auth/signup',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      handleAuthResponse(data);
    },
    [handleAuthResponse],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
