import { useSyncExternalStore } from "react";
import { currentDayIndex } from "@/lib/favoritesView";
import { runPool } from "@/lib/runPool";

/** Días con el mismo nombre que devuelve el servidor, empezando por lunes. */
export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type ScheduleItem = { malId: number; title: string; image: string; day: string };

export type ScheduleDetails = {
  day: string;
  title: string;
  url: string;
  image: string;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  airedFrom?: string | null;
  firstBroadcast?: string | null;
  broadcastTime: string;
  period: string;
};

export type ScheduleSnapshot = {
  list: ScheduleItem[];
  /** undefined = aún sin datos · null = descartado (infantil o sin horario) */
  details: Record<number, ScheduleDetails | null | undefined>;
  loadingList: boolean;
  listError: boolean;
  /** Detalles en cola o en camino. */
  pending: number;
};

const STORAGE_KEY = "pushanime:schedule";

export const LIST_TTL_MS = 60 * 60 * 1000; // la lista de MAL: 1 h
export const DETAIL_TTL_MS = 6 * 60 * 60 * 1000; // el detalle de cada anime: 6 h
export const MAX_STALE_MS = 24 * 60 * 60 * 1000; // más viejo que esto no se muestra
const SAVE_DELAY_MS = 1000;

const EMPTY: ScheduleSnapshot = {
  list: [],
  details: {},
  loadingList: false,
  listError: false,
  pending: 0,
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type Deps = {
  fetchJson: (url: string) => Promise<unknown>;
  storage: StorageLike | null;
  now?: () => number;
};

type Persisted = {
  v: 1;
  listAt: number;
  list: ScheduleItem[];
  details: Record<string, { at: number; item: ScheduleDetails | null }>;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const isItem = (v: unknown): v is ScheduleItem =>
  isObject(v) &&
  typeof v.malId === "number" &&
  typeof v.title === "string" &&
  typeof v.image === "string" &&
  typeof v.day === "string";

const isDetails = (v: unknown): v is ScheduleDetails =>
  isObject(v) &&
  ["day", "title", "url", "image", "type", "status", "broadcastTime", "period"].every(
    (key) => typeof v[key] === "string"
  );

/**
 * Datos del calendario compartidos por toda la app: la página del calendario
 * y la precarga desde la home leen y escriben aquí, así que lo que se carga
 * una vez no se vuelve a pedir, y se guarda en el navegador para la próxima visita.
 */
export function createScheduleStore({ fetchJson, storage, now = Date.now }: Deps) {
  let list: ScheduleItem[] = [];
  let listAt = 0;
  let details: Record<number, ScheduleDetails | null> = {};
  const detailAt = new Map<number, number>();

  const failed = new Set<number>(); // fallaron en esta sesión: no se insiste
  const inFlight = new Map<number, Promise<void>>();
  const pendingIds = new Set<number>();
  let listPromise: Promise<void> | null = null;
  let listError = false;

  let hydrated = false;
  let snapshot: ScheduleSnapshot = EMPTY;
  const listeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const build = (): ScheduleSnapshot => ({
    list,
    details,
    loadingList: listPromise !== null && list.length === 0,
    listError,
    pending: pendingIds.size,
  });

  function persist() {
    if (!storage || list.length === 0) return;

    const payload: Persisted = {
      v: 1,
      listAt,
      list,
      details: Object.fromEntries(
        Object.entries(details).map(([id, item]) => [
          id,
          { at: detailAt.get(Number(id)) ?? 0, item },
        ])
      ),
    };

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sin espacio o bloqueado: sigue funcionando, solo sin guardar
    }
  }

  function flush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    persist();
  }

  function changed() {
    snapshot = build();
    if (!saveTimer) saveTimer = setTimeout(flush, SAVE_DELAY_MS);
    listeners.forEach((listener) => listener());
  }

  /** Lee lo guardado la primera vez (aunque esté vencido: se muestra y se refresca). */
  function hydrate() {
    if (hydrated) return;
    hydrated = true;
    if (!storage) return;

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: unknown = JSON.parse(raw);
      if (
        !isObject(saved) ||
        saved.v !== 1 ||
        typeof saved.listAt !== "number" ||
        !Array.isArray(saved.list) ||
        !isObject(saved.details)
      ) {
        return;
      }
      if (now() - saved.listAt > MAX_STALE_MS) return;

      const items = saved.list.filter(isItem);
      const ids = new Set(items.map((a) => a.malId));
      const loaded: Record<number, ScheduleDetails | null> = {};

      for (const [id, entry] of Object.entries(saved.details)) {
        const malId = Number(id);
        if (!ids.has(malId) || !isObject(entry) || typeof entry.at !== "number") continue;
        if (entry.item === null || isDetails(entry.item)) {
          loaded[malId] = entry.item;
          detailAt.set(malId, entry.at);
        }
      }

      list = items;
      listAt = saved.listAt;
      details = loaded;
      snapshot = build();
    } catch {
      // datos guardados ilegibles: se ignoran
    }
  }

  function ensureList(): Promise<void> {
    hydrate();

    if (list.length > 0 && now() - listAt < LIST_TTL_MS) return Promise.resolve();
    if (listPromise) return listPromise;

    listError = false;

    listPromise = Promise.resolve().then(async () => {
      try {
        const json = await fetchJson("/api/schedule");
        const animes = isObject(json) ? json.animes : null;
        if (!Array.isArray(animes)) throw new Error("respuesta inesperada");

        list = animes.filter(isItem);
        listAt = now();

        // Lo que ya no está en el calendario (fin de temporada) se descarta
        const ids = new Set(list.map((a) => a.malId));
        details = Object.fromEntries(
          Object.entries(details).filter(([id]) => ids.has(Number(id)))
        );
      } catch {
        // Con una lista vieja se sigue usando; sin nada, es un error
        listError = list.length === 0;
      } finally {
        listPromise = null;
        changed();
      }
    });

    changed();
    return listPromise;
  }

  function needsDetail(id: number, at: number): boolean {
    if (failed.has(id)) return false;
    if (details[id] === undefined) return true;
    return at - (detailAt.get(id) ?? 0) >= DETAIL_TTL_MS;
  }

  function fetchDetail(id: number): Promise<void> {
    const running = inFlight.get(id);
    if (running) return running;

    // Puede haber llegado mientras esperaba su turno (otra carga la pidió)
    if (!needsDetail(id, now())) {
      if (pendingIds.delete(id)) changed();
      return Promise.resolve();
    }

    const request = Promise.resolve().then(async () => {
      try {
        const json = await fetchJson(`/api/schedule/${id}`);
        if (!isObject(json) || !("item" in json)) throw new Error("respuesta inesperada");

        const item = json.item;
        if (item !== null && !isDetails(item)) throw new Error("detalle inválido");

        details = { ...details, [id]: item };
        detailAt.set(id, now());
      } catch {
        failed.add(id);
      } finally {
        inFlight.delete(id);
        pendingIds.delete(id);
        changed();
      }
    });

    inFlight.set(id, request);
    return request;
  }

  /**
   * Asegura que el calendario esté cargado y al día.
   * - only: carga solo los animes de esos días (para la precarga).
   * - first: los de estos días se piden primero.
   * Lo que ya está fresco no se vuelve a pedir; lo vencido se refresca
   * mostrando mientras tanto el dato anterior.
   */
  async function ensureSchedule(
    options: { only?: string[]; first?: string[]; concurrency?: number } = {}
  ): Promise<void> {
    const { only, first, concurrency = 6 } = options;

    await ensureList();

    const onlySet = only ? new Set(only) : null;
    const firstSet = new Set(first ?? only ?? []);
    const at = now();

    const todo = list
      .filter((a) => (!onlySet || onlySet.has(a.day)) && needsDetail(a.malId, at))
      .sort((a, b) => Number(firstSet.has(b.day)) - Number(firstSet.has(a.day)));

    if (todo.length === 0) return;

    todo.forEach((a) => pendingIds.add(a.malId));
    changed();

    await runPool(todo, concurrency, async (a) => {
      await fetchDetail(a.malId);
    });

    // Por si alguno no llegó a pedirse
    let leftover = false;
    todo.forEach((a) => {
      if (pendingIds.delete(a.malId)) leftover = true;
    });
    if (leftover) changed();
  }

  return {
    getSnapshot: (): ScheduleSnapshot => {
      hydrate();
      return snapshot;
    },
    getServerSnapshot: (): ScheduleSnapshot => EMPTY,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ensureSchedule,
    flush,
  };
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const scheduleStore = createScheduleStore({
  fetchJson,
  storage: browserStorage(),
});

if (typeof window !== "undefined") {
  // Al cerrar o cambiar de pestaña se guarda lo pendiente
  window.addEventListener("pagehide", () => scheduleStore.flush());
}

export function useSchedule(): ScheduleSnapshot {
  return useSyncExternalStore(
    scheduleStore.subscribe,
    scheduleStore.getSnapshot,
    scheduleStore.getServerSnapshot
  );
}

/**
 * Los días del calendario que se ven hoy en Venezuela: el calendario viene en
 * hora de Japón (13 h por delante), así que a la pestaña de hoy llegan los
 * animes de hoy y los del día siguiente.
 */
export function priorityDays(now = new Date()): string[] {
  const i = currentDayIndex(now);
  return i < 0 ? [] : [DAYS[i], DAYS[(i + 1) % 7]];
}

/** Precarga en segundo plano: la lista y solo los animes de hoy y mañana. */
export function prefetchSchedule(): Promise<void> {
  return scheduleStore.ensureSchedule({ only: priorityDays(), concurrency: 2 });
}