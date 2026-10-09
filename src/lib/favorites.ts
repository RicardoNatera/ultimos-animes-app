import { useCallback, useSyncExternalStore } from "react";
import type { SourceName } from "@/types/sourceVars";
import { normalizeKey, sameAnime } from "@/lib/titles";
import {
  DEFAULT_VIEW,
  isFavoritesView,
  type FavoritesView,
} from "@/lib/favoritesView";

export type Favorite = {
  key: string; // título normalizado
  title: string;
  image: string;
  source: SourceName; // fuente desde la que se marcó
  sourceUrl: string; // enlace de esa tarjeta
  addedAt: number;
};

type NewFavorite = Omit<Favorite, "key" | "addedAt">;

/**
 * Pequeño store sobre localStorage, compatible con useSyncExternalStore.
 * - En el servidor siempre devuelve `fallback` (no rompe la hidratación).
 * - Se sincroniza entre pestañas con el evento "storage".
 */
function createLocalStore<T>(
  storageKey: string,
  fallback: T,
  isValid: (value: unknown) => value is T
) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) {
      cache = read();
      loaded = true;
      emit();
    }
  };

  return {
    getSnapshot: (): T => {
      if (!loaded) {
        cache = read();
        loaded = true;
      }
      return cache;
    },
    getServerSnapshot: (): T => fallback,
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    /** Devuelve false si el navegador no tiene espacio (y no cambia nada). */
    set: (next: T): boolean => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        const noSpace =
          err instanceof DOMException &&
          (err.name === "QuotaExceededError" ||
            err.name === "NS_ERROR_DOM_QUOTA_REACHED");

        // Sin espacio: no se guarda ni en memoria, para no perder datos al recargar
        if (noSpace) return false;
        // Otro fallo (p. ej. almacenamiento bloqueado): se mantiene solo en memoria
      }

      cache = next;
      loaded = true;
      emit();
      return true;
    },
  };
}

const NO_FAVORITES: Favorite[] = [];

const FAVORITES_KEY = "pushanime:favorites";

/** Límite de espacio que dejamos usar a los favoritos. */
export const MAX_FAVORITES_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Espacio que ocupan los favoritos en localStorage.
 * Los navegadores cuentan 2 bytes por carácter (UTF-16), clave incluida.
 */
export function favoritesBytes(favorites: Favorite[]): number {
  return (FAVORITES_KEY.length + JSON.stringify(favorites).length) * 2;
}

/** 6590 -> "6,4 KB" · 2621440 -> "2,50 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}

const favoritesStore = createLocalStore<Favorite[]>(
  FAVORITES_KEY,
  NO_FAVORITES,
  (v): v is Favorite[] => Array.isArray(v)
);

const onlyFavoritesStore = createLocalStore<boolean>(
  "pushanime:onlyFavorites",
  false,
  (v): v is boolean => typeof v === "boolean"
);


const viewStore = createLocalStore<FavoritesView>(
  "pushanime:favoritesView",
  DEFAULT_VIEW,
  isFavoritesView
);

export type ToggleResult = "added" | "removed" | "full";

/**
 * Añade o quita un favorito. Devuelve "full" si no se pudo añadir porque se
 * superaría el límite de espacio (o el navegador no tiene más).
 */
export function toggleFavorite(
  input: NewFavorite,
  maxBytes = MAX_FAVORITES_BYTES
): ToggleResult {
  const current = favoritesStore.getSnapshot();
  const existing = current.find((f) => sameAnime(f.title, input.title));

  if (existing) {
    favoritesStore.set(current.filter((f) => f !== existing));
    return "removed";
  }

  const next = [
    { ...input, key: normalizeKey(input.title), addedAt: Date.now() },
    ...current,
  ];
  if (favoritesBytes(next) > maxBytes) return "full";

  return favoritesStore.set(next) ? "added" : "full";
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot
  );

  const isFavorite = useCallback(
    (title: string) => favorites.some((f) => sameAnime(f.title, title)),
    [favorites]
  );

  return { favorites, isFavorite };
}

/** Filtro "solo favoritos" de la home (se recuerda entre visitas). */
export function useOnlyFavorites(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    onlyFavoritesStore.subscribe,
    onlyFavoritesStore.getSnapshot,
    onlyFavoritesStore.getServerSnapshot
  );
  return [value, onlyFavoritesStore.set];
}


/** Filtro y orden elegidos en la página de favoritos (se recuerdan entre visitas). */
export function useFavoritesView(): [FavoritesView, (value: FavoritesView) => void] {
  const view = useSyncExternalStore(
    viewStore.subscribe,
    viewStore.getSnapshot,
    viewStore.getServerSnapshot
  );
  return [view, viewStore.set];
}

/** false en el servidor y durante la hidratación; true ya en el navegador. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}