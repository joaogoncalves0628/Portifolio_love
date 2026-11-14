import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { AuthApiError, fetchCurrentUser, isAuthApiConfigured, login, logout, setUnauthorizedHandler } from '../services/authApi';

export type AuthUser = {
  id: string;
  username: string;
  name: string;
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  signIn: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = 'velour-auth-token';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    if (Platform.OS !== 'web') {
      void SecureStore.deleteItemAsync(TOKEN_KEY).catch((storageError) => {
        console.warn('Não foi possível remover a sessão salva:', storageError);
      });
    }
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!isAuthApiConfigured) {
        setError('Configure EXPO_PUBLIC_API_URL para ativar o login e conectar ao servidor.');
        setStatus('unauthenticated');
        return;
      }

      try {
        const savedToken = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(TOKEN_KEY);
        if (Platform.OS !== 'web' && !savedToken) {
          if (active) {
            setStatus('unauthenticated');
          }
          return;
        }

        const session = await fetchCurrentUser(savedToken ?? undefined);
        if (active) {
          setToken(savedToken);
          setUser(session.user);
          setError(null);
          setStatus('authenticated');
        }
      } catch (restoreError) {
        if (active) {
          setError(
            restoreError instanceof AuthApiError && restoreError.status === 401
              ? null
              : restoreError instanceof Error
                ? restoreError.message
                : 'Não foi possível validar sua sessão no servidor.',
          );
          setStatus('unauthenticated');
        }
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    const session = await login(username, password, rememberMe);
    if (Platform.OS !== 'web') {
      if (rememberMe && session.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, session.token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }
    setToken(session.token ?? null);
    setUser(session.user);
    setError(null);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout(token ?? undefined);
    } finally {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch((storageError) => {
          console.warn('Não foi possível remover a sessão salva:', storageError);
        });
      }
      setToken(null);
      setUser(null);
      setError(null);
      setStatus('unauthenticated');
    }
  }, [token]);

  const value = useMemo(
    () => ({ status, user, token, error, signIn, signOut }),
    [status, user, token, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
