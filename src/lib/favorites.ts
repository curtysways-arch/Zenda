'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export type FavoriteType = 'PRODUCTO' | 'SERVICIO' | 'CANCHA';

export interface FavoriteItem {
  id: string;
  tipo: FavoriteType;
  nombre: string;
  precio?: number | string;
  precioAnterior?: number | string;
  imagenUrl?: string;
  descripcion?: string;
  slug?: string;
  negocioId?: string;
  negocioNombre?: string;
  rating?: string | number;
  badge?: string;
  url?: string;
  createdAt: number;
}

const STORAGE_KEY = 'citiox_favorites';
const EVENT_NAME = 'citiox_favorites_updated';

// Helper seguro para obtener favoritos desde localStorage
export function getStoredFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Favorites] Error reading from localStorage:', e);
    return [];
  }
}

// Guardar favoritos y disparar evento de sincronización
function saveFavorites(items: FavoriteItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
  } catch (e) {
    console.error('[Favorites] Error writing to localStorage:', e);
  }
}

export function isItemFavorite(id: string): boolean {
  if (!id) return false;
  const list = getStoredFavorites();
  return list.some(item => item.id === id);
}

export function addFavoriteItem(item: Omit<FavoriteItem, 'createdAt'> & { createdAt?: number }): FavoriteItem[] {
  const current = getStoredFavorites();
  const exists = current.some(i => i.id === item.id);
  if (exists) {
    const updated = current.map(i => i.id === item.id ? { ...i, ...item, createdAt: i.createdAt || Date.now() } : i);
    saveFavorites(updated);
    return updated;
  }
  const newItem: FavoriteItem = {
    ...item,
    createdAt: item.createdAt || Date.now()
  };
  const updated = [newItem, ...current];
  saveFavorites(updated);
  return updated;
}

export function removeFavoriteItem(id: string): FavoriteItem[] {
  const current = getStoredFavorites();
  const updated = current.filter(i => i.id !== id);
  saveFavorites(updated);
  return updated;
}

export function toggleFavoriteItem(item: Omit<FavoriteItem, 'createdAt'> & { createdAt?: number }): boolean {
  const current = getStoredFavorites();
  const exists = current.some(i => i.id === item.id);
  if (exists) {
    removeFavoriteItem(item.id);
    return false;
  } else {
    addFavoriteItem(item);
    return true;
  }
}

// Hook de React para usar favoritos en cualquier componente con reactividad automática
export function useFavorites(filter?: { slug?: string; tipo?: FavoriteType; negocioId?: string }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadFavorites = useCallback(() => {
    const all = getStoredFavorites();
    setFavorites(all);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    reloadFavorites();

    const handleUpdate = () => {
      reloadFavorites();
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadFavorites]);

  // Mapa rápido de ID -> boolean para O(1) checks
  const favoritesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const item of favorites) {
      if (item.id) map[item.id] = true;
    }
    return map;
  }, [favorites]);

  // Lista filtrada si se especificó slug, negocioId o tipo
  const filteredFavorites = useMemo(() => {
    let result = favorites;
    if (filter?.slug) {
      const cleanSlug = filter.slug.trim().toLowerCase();
      result = result.filter(item => {
        if (item.slug && item.slug.trim().toLowerCase() === cleanSlug) return true;
        if (filter.negocioId && item.negocioId && item.negocioId === filter.negocioId) return true;
        return false;
      });
    } else if (filter?.negocioId) {
      result = result.filter(item => item.negocioId === filter.negocioId);
    }
    if (filter?.tipo) {
      result = result.filter(item => item.tipo === filter.tipo);
    }
    return result;
  }, [favorites, filter?.tipo, filter?.slug, filter?.negocioId]);

  const checkIsFavorite = useCallback((id: string) => {
    return Boolean(favoritesMap[id]);
  }, [favoritesMap]);

  const toggle = useCallback((item: Omit<FavoriteItem, 'createdAt'> & { createdAt?: number }) => {
    return toggleFavoriteItem(item);
  }, []);

  const remove = useCallback((id: string) => {
    removeFavoriteItem(id);
  }, []);

  const clear = useCallback(() => {
    if (filter?.slug) {
      const cleanSlug = filter.slug.trim().toLowerCase();
      const remaining = favorites.filter(item => {
        if (item.slug && item.slug.trim().toLowerCase() === cleanSlug) return false;
        if (filter.negocioId && item.negocioId && item.negocioId === filter.negocioId) return false;
        return true;
      });
      saveFavorites(remaining);
    } else {
      saveFavorites([]);
    }
  }, [favorites, filter?.slug, filter?.negocioId]);

  return {
    favorites: filteredFavorites,
    businessFavorites: filteredFavorites,
    allFavorites: favorites,
    favoritesMap,
    isLoaded,
    isFavorite: checkIsFavorite,
    toggleFavorite: toggle,
    removeFavorite: remove,
    clearFavorites: clear,
    count: filteredFavorites.length,
    totalCount: favorites.length
  };
}
