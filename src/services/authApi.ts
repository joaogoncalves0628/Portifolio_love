import { Platform } from 'react-native';
import type { AuthUser } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export const isAuthApiConfigured = Boolean(API_URL);

export class AuthApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthApiError';
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  if (!API_URL) {
    throw new Error('Configure EXPO_PUBLIC_API_URL para conectar ao servidor.');
  }

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
  if (!response.ok) {
    let message = `Falha na autenticação (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }

    if (response.status === 401 && path !== '/api/auth/login') {
      notifyUnauthorized();
    }
    throw new AuthApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export type AuthSession = {
  user: AuthUser;
  token?: string;
};

export function login(username: string, password: string, rememberMe: boolean) {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Transport': Platform.OS === 'web' ? 'cookie' : 'bearer',
    },
    body: JSON.stringify({ username, password, rememberMe }),
  });
}

export function fetchCurrentUser(token?: string) {
  return request<{ user: AuthUser }>('/api/auth/me', undefined, token);
}

export function logout(token?: string) {
  return request<{ success: true }>('/api/auth/logout', { method: 'POST' }, token);
}
