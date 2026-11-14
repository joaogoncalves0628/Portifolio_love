import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';
import type { CoupleEvent, CoupleSettings, LoveNote, MemoryEditInput, MemoryItem, MemoryMedia } from '../context/MemoryContext';
import { notifyUnauthorized } from './authApi';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export const isMemoriesApiConfigured = Boolean(API_URL);

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  if (!API_URL) {
    throw new Error('A URL da API não está configurada.');
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
    if (response.status === 401) {
      notifyUnauthorized();
    }
    let message = `Falha na API (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // The HTTP status remains useful when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

function postJson<T>(path: string, body: unknown, token?: string) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, token);
}

export const fetchMemories = (token?: string) => request<MemoryItem[]>('/api/memories', undefined, token);

export const createMemory = (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'isFavorite'>, token?: string) =>
  postJson<MemoryItem>('/api/memories', memory, token);

export const updateMemory = (id: string, memory: MemoryEditInput, token?: string) =>
  request<MemoryItem>(`/api/memories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memory),
  }, token);

export const updateMemoryFavorite = (id: string, isFavorite: boolean, token?: string) =>
  request<{ id: string; isFavorite: boolean }>(`/api/memories/${encodeURIComponent(id)}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFavorite }),
  }, token);

export async function uploadMemoryImage(asset: ImagePickerAsset, token?: string): Promise<MemoryMedia> {
  const type = asset.type === 'video' || asset.mimeType?.startsWith('video/') ? 'video' : 'image';
  if (!API_URL) {
    if (type === 'image' && asset.base64) {
      return { type, uri: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` };
    }
    return { type, uri: asset.uri };
  }

  const formData = new FormData();
  const filename = asset.fileName || `memory-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
  const mimeType = asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg');

  if (asset.file) {
    formData.append('file', asset.file, filename);
  } else if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error('Não foi possível preparar a foto para envio.');
    }
    formData.append('file', await response.blob(), filename);
  } else {
    const nativeFile = { uri: asset.uri, name: filename, type: mimeType };
    formData.append('file', nativeFile as unknown as Blob);
  }

  const result = await request<{ url: string }>('/api/uploads', {
    method: 'POST',
    body: formData,
  }, token);
  return { type, uri: result.url };
}

export const fetchLoveNotes = (token?: string) => request<LoveNote[]>('/api/notes', undefined, token);

export const createLoveNote = (note: Omit<LoveNote, 'id' | 'createdAt'>, token?: string) =>
  postJson<LoveNote>('/api/notes', note, token);

export const fetchCoupleEvents = (token?: string) => request<CoupleEvent[]>('/api/events', undefined, token);

export const createCoupleEvent = (event: Omit<CoupleEvent, 'id' | 'createdAt'>, token?: string) =>
  postJson<CoupleEvent>('/api/events', event, token);

export const fetchCoupleSettings = (token?: string) => request<CoupleSettings>('/api/settings', undefined, token);

export const saveCoupleSettings = (settings: CoupleSettings, token?: string) =>
  request<CoupleSettings>('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }, token);
