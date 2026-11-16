import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  createCoupleEvent,
  createLoveNote,
  createMemory,
  fetchCoupleEvents,
  fetchCoupleSettings,
  fetchLoveNotes,
  fetchMemories,
  isMemoriesApiConfigured,
  saveCoupleSettings,
  deleteMemory as deleteMemoryRequest,
  updateMemory as updateMemoryRequest,
  updateMemoryFavorite,
} from '../services/memoriesApi';

export type MemoryContentType = 'photo' | 'carousel' | 'text';

export type MemoryMedia = {
  type: 'image' | 'video';
  uri: string;
};

export type MemoryItem = {
  id: string;
  contentType: MemoryContentType;
  author: string;
  location: string;
  date: string;
  time?: string;
  images: MemoryMedia[];
  title: string;
  description: string;
  tags: string[];
  isFavorite: boolean;
  privatePinned?: boolean;
  createdAt?: string;
};

export type MemoryEditInput = Omit<MemoryItem, 'id' | 'createdAt'>;

export type LoveNote = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type CoupleEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  createdAt?: string;
};

export type CoupleSettings = {
  personOne: string;
  personTwo: string;
  relationshipStartDate: string;
  joaoAvatarUrl: string | null;
  caioAvatarUrl: string | null;
};

type PortfolioData = {
  memories: MemoryItem[];
  notes: LoveNote[];
  events: CoupleEvent[];
  settings: CoupleSettings;
};

type MemoryContextValue = PortfolioData & {
  editingMemory: MemoryItem | null;
  beginEditingMemory: (memory: MemoryItem) => void;
  clearEditingMemory: () => void;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'isFavorite'>) => Promise<void>;
  updateMemory: (id: string, memory: MemoryEditInput) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addLoveNote: (note: Omit<LoveNote, 'id' | 'createdAt'>) => Promise<void>;
  addCoupleEvent: (event: Omit<CoupleEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateCoupleSettings: (settings: CoupleSettings) => Promise<void>;
  connectionStatus: 'loading' | 'connected' | 'local' | 'error';
  connectionError: string | null;
};

const STORAGE_KEY = 'love-portfolio-data-v2';
const LEGACY_MEMORIES_KEY = 'love-portfolio-memories-v1';

const defaultSettings: CoupleSettings = {
  personOne: 'Você',
  personTwo: 'Seu amor',
  relationshipStartDate: '2026-08-16',
  joaoAvatarUrl: null,
  caioAvatarUrl: null,
};

const emptyData: PortfolioData = {
  memories: [],
  notes: [],
  events: [],
  settings: defaultSettings,
};

const MemoryContext = createContext<MemoryContextValue | undefined>(undefined);

async function fetchPortfolioData(token: string | null): Promise<PortfolioData> {
  const [memories, notes, events, settings] = await Promise.all([
    fetchMemories(token ?? undefined),
    fetchLoveNotes(token ?? undefined),
    fetchCoupleEvents(token ?? undefined),
    fetchCoupleSettings(token ?? undefined),
  ]);
  return {
    memories: memories.map(normalizeMemory),
    notes,
    events,
    settings,
  };
}

function normalizeMedia(value: unknown, legacyImage?: string): MemoryMedia[] {
  if (!Array.isArray(value)) {
    return legacyImage ? [{ type: 'image', uri: legacyImage }] : [];
  }

  return value.flatMap((item): MemoryMedia[] => {
    if (typeof item === 'string') {
      return [{ type: 'image', uri: item }];
    }
    if (!item || typeof item !== 'object' || !('uri' in item) || typeof item.uri !== 'string') {
      return [];
    }
    if (!('type' in item) || (item.type !== 'image' && item.type !== 'video')) {
      return [{ type: 'image', uri: item.uri }];
    }
    return [{ type: item.type, uri: item.uri }];
  });
}

function normalizeMemory(memory: Partial<Omit<MemoryItem, 'images'>> & { images?: unknown; image?: string }): MemoryItem {
  const images = normalizeMedia(memory.images, memory.image);

  return {
    id: memory.id || `memory-${Date.now()}`,
    contentType: memory.contentType || (images.length > 1 ? 'carousel' : images.length ? 'photo' : 'text'),
    author: memory.author || 'Registrado por Você',
    location: memory.location || 'Nosso cantinho',
    date: memory.date || 'Hoje',
    time: memory.time,
    images,
    title: memory.title || '',
    description: memory.description || '',
    tags: Array.isArray(memory.tags) ? memory.tags : [],
    isFavorite: Boolean(memory.isFavorite),
    privatePinned: memory.privatePinned,
    createdAt: memory.createdAt,
  };
}

function parseCachedData(serialized: string | null, legacySerialized: string | null): PortfolioData {
  if (serialized) {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Os dados locais do portfólio estão inválidos.');
    }

    const data = parsed as Partial<PortfolioData>;
    return {
      memories: Array.isArray(data.memories) ? data.memories.map(normalizeMemory) : [],
      notes: Array.isArray(data.notes) ? data.notes : [],
      events: Array.isArray(data.events) ? data.events : [],
      settings: { ...defaultSettings, ...data.settings },
    };
  }

  if (legacySerialized) {
    const parsed: unknown = JSON.parse(legacySerialized);
    if (!Array.isArray(parsed)) {
      throw new Error('As memórias locais antigas estão inválidas.');
    }
    const memories = parsed
      .map(normalizeMemory)
      .filter((memory) => memory.id !== 'memory-1' && memory.id !== 'memory-2');
    return { ...emptyData, memories };
  }

  return emptyData;
}

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, token } = useAuth();
  const [data, setData] = useState<PortfolioData>(emptyData);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<MemoryContextValue['connectionStatus']>('loading');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const persistData = useCallback(async (nextData: PortfolioData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  }, []);
  const beginEditingMemory = useCallback((memory: MemoryItem) => setEditingMemory(memory), []);
  const clearEditingMemory = useCallback(() => setEditingMemory(null), []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (isMemoriesApiConfigured && authStatus !== 'authenticated') {
        setData(emptyData);
        return;
      }

      if (!isMemoriesApiConfigured) {
        try {
          const [serialized, legacySerialized] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(LEGACY_MEMORIES_KEY),
          ]);
          if (active) {
            setData(parseCachedData(serialized, legacySerialized));
            setConnectionStatus('local');
          }
        } catch (error) {
          if (active) {
            setConnectionError(error instanceof Error ? error.message : 'Erro ao ler os dados locais.');
            setConnectionStatus('error');
          }
        }
        return;
      }

      try {
        const nextData = await fetchPortfolioData(token);
        if (active) {
          setData(nextData);
          setConnectionError(null);
          setConnectionStatus('connected');
        }
        try {
          await persistData(nextData);
        } catch (error) {
          console.warn('Não foi possível atualizar o cache local do portfólio:', error);
        }
      } catch (error) {
        try {
          const [serialized, legacySerialized] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(LEGACY_MEMORIES_KEY),
          ]);
          if (active) {
            setData(parseCachedData(serialized, legacySerialized));
          }
        } catch (cacheError) {
          console.warn('Não foi possível ler o cache local do portfólio:', cacheError);
        }

        if (active) {
          setConnectionError(error instanceof Error ? error.message : 'Não foi possível conectar à API.');
          setConnectionStatus('error');
        }
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [authStatus, persistData, token]);

  useEffect(() => {
    if (!isMemoriesApiConfigured || authStatus !== 'authenticated') {
      return;
    }

    let active = true;
    let syncing = false;
    const syncPortfolio = async () => {
      if (!active || syncing) {
        return;
      }
      syncing = true;
      try {
        const nextData = await fetchPortfolioData(token);
        if (active) {
          setData(nextData);
          setConnectionError(null);
          setConnectionStatus('connected');
          try {
            await persistData(nextData);
          } catch (error) {
            console.warn('Não foi possível atualizar o cache local do portfólio:', error);
          }
        }
      } catch (error) {
        if (active) {
          setConnectionError(error instanceof Error ? error.message : 'Não foi possível sincronizar com a API.');
          setConnectionStatus('error');
        }
      } finally {
        syncing = false;
      }
    };

    const intervalId = setInterval(() => {
      void syncPortfolio();
    }, 10_000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [authStatus, persistData, token]);

  const commitData = useCallback(async (nextData: PortfolioData) => {
    if (isMemoriesApiConfigured) {
      try {
        await persistData(nextData);
      } catch (error) {
        console.warn('Não foi possível atualizar o cache local do portfólio:', error);
      }
    } else {
      await persistData(nextData);
    }
    setData(nextData);
    setConnectionError(null);
    setConnectionStatus(isMemoriesApiConfigured ? 'connected' : 'local');
  }, [persistData]);

  const addMemory = useCallback(
    async (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'isFavorite'>) => {
      const newMemory = isMemoriesApiConfigured
        ? await createMemory(memory, token ?? undefined)
        : {
            ...memory,
            id: `memory-${Date.now()}`,
            isFavorite: false,
            createdAt: new Date().toISOString(),
          };

      await commitData({ ...data, memories: [normalizeMemory(newMemory), ...data.memories] });
    },
    [commitData, data, token],
  );

  const updateMemory = useCallback(
    async (id: string, memory: MemoryEditInput) => {
      const currentMemory = data.memories.find((item) => item.id === id);
      if (!currentMemory) {
        throw new Error('Publicação não encontrada.');
      }

      const updatedMemory = isMemoriesApiConfigured
        ? await updateMemoryRequest(id, memory, token ?? undefined)
        : { ...currentMemory, ...memory };

      await commitData({
        ...data,
        memories: data.memories.map((item) => item.id === id ? updatedMemory : item),
      });
      setEditingMemory(null);
    },
    [commitData, data, token],
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      if (isMemoriesApiConfigured) {
        await deleteMemoryRequest(id, token ?? undefined);
      }

      await commitData({
        ...data,
        memories: data.memories.filter((memory) => memory.id !== id),
      });
      setEditingMemory((current) => current?.id === id ? null : current);
    },
    [commitData, data, token],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const memory = data.memories.find((item) => item.id === id);
      if (!memory) {
        return;
      }
      const isFavorite = !memory.isFavorite;
      if (isMemoriesApiConfigured) {
        await updateMemoryFavorite(id, isFavorite, token ?? undefined);
      }
      await commitData({
        ...data,
        memories: data.memories.map((item) => item.id === id ? { ...item, isFavorite } : item),
      });
    },
    [commitData, data, token],
  );

  const addLoveNote = useCallback(
    async (note: Omit<LoveNote, 'id' | 'createdAt'>) => {
      const newNote = isMemoriesApiConfigured
        ? await createLoveNote(note, token ?? undefined)
        : { ...note, id: `note-${Date.now()}`, createdAt: new Date().toISOString() };
      await commitData({ ...data, notes: [newNote, ...data.notes] });
    },
    [commitData, data, token],
  );

  const addCoupleEvent = useCallback(
    async (event: Omit<CoupleEvent, 'id' | 'createdAt'>) => {
      const newEvent = isMemoriesApiConfigured
        ? await createCoupleEvent(event, token ?? undefined)
        : { ...event, id: `event-${Date.now()}`, createdAt: new Date().toISOString() };
      await commitData({ ...data, events: [...data.events, newEvent].sort((a, b) => a.date.localeCompare(b.date)) });
    },
    [commitData, data, token],
  );

  const updateCoupleSettings = useCallback(
    async (settings: CoupleSettings) => {
      const savedSettings = isMemoriesApiConfigured ? await saveCoupleSettings(settings, token ?? undefined) : settings;
      await commitData({ ...data, settings: savedSettings });
    },
    [commitData, data, token],
  );

  const value = useMemo(
    () => ({
      ...data,
      editingMemory,
      beginEditingMemory,
      clearEditingMemory,
      addMemory,
      updateMemory,
      deleteMemory,
      toggleFavorite,
      addLoveNote,
      addCoupleEvent,
      updateCoupleSettings,
      connectionStatus,
      connectionError,
    }),
    [
      data,
      editingMemory,
      beginEditingMemory,
      clearEditingMemory,
      addMemory,
      updateMemory,
      deleteMemory,
      toggleFavorite,
      addLoveNote,
      addCoupleEvent,
      updateCoupleSettings,
      connectionStatus,
      connectionError,
    ],
  );

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function useMemories() {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemories must be used within MemoryProvider');
  }
  return context;
}
