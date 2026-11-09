import type { RankedAnime, ScrapedAnime } from "@/types/anime";
import { SOURCE_PRIORITY } from "@/types/sourceVars";

type SameRelease = (a: ScrapedAnime, b: ScrapedAnime) => boolean;

// Si no hay nada mejor, se supone que cada puesto de la lista es ~30 min más viejo
const DEFAULT_STEP_MIN = 30;

/**
 * age: minutos desde que salió. pos: puesto equivalente en la lista del sitio
 * que da la hora; sirve para desempatar entre episodios con la misma hora
 * ("hace un día" agrupa a muchos) sin descolocar a los que vienen de otra lista.
 */
type Estimate = { age: number; pos: number };

type Anchor = { index: number } & Estimate;

/** Estimación para un elemento sin hora, a partir de los vecinos que sí la tienen. */
function interpolate(index: number, anchors: Anchor[], step: number): Estimate {
  const prev = [...anchors].reverse().find((a) => a.index < index);
  const next = anchors.find((a) => a.index > index);

  if (prev && next) {
    const t = (index - prev.index) / (next.index - prev.index);
    return {
      age: prev.age + (next.age - prev.age) * t,
      pos: prev.pos + (next.pos - prev.pos) * t,
    };
  }
  if (prev) {
    return {
      age: prev.age + (index - prev.index) * step,
      pos: prev.pos + (index - prev.index),
    };
  }
  if (next) {
    return {
      age: next.age * ((index + 1) / (next.index + 1)),
      pos: next.pos - (next.index - index),
    };
  }
  return { age: index * step, pos: index };
}

/**
 * Calcula cuántos minutos hace que salió cada episodio (y su puesto equivalente).
 *
 * - Si el sitio da la hora ("hace 7 horas"), se usa tal cual.
 * - Si no la da, se toma la de ese mismo episodio en otro sitio (si está en ambos)
 *   y los que solo están en este se colocan entre sus vecinos conocidos,
 *   respetando el orden en que el propio sitio los lista.
 * - Si ningún sitio da la hora, se usa la posición en la lista.
 */
export function estimateTimes(
  lists: Record<string, ScrapedAnime[]>,
  sameRelease: SameRelease
): Map<ScrapedAnime, Estimate> {
  const estimates = new Map<ScrapedAnime, Estimate>();
  const all = Object.values(lists);

  for (const list of all) {
    list.forEach((item, index) => {
      if (typeof item.minutesAgo === "number") {
        estimates.set(item, { age: item.minutesAgo, pos: index });
      }
    });
  }

  const timed = all.flat().filter((item) => estimates.has(item));

  // Ningún sitio da la hora: solo queda la posición en cada lista
  if (timed.length === 0) {
    for (const list of all) {
      list.forEach((item, i) =>
        estimates.set(item, { age: i * DEFAULT_STEP_MIN, pos: i })
      );
    }
    return estimates;
  }

  const reference = [...timed].sort((a, b) => {
    const ea = estimates.get(a)!;
    const eb = estimates.get(b)!;
    return ea.age - eb.age || ea.pos - eb.pos;
  });

  for (const list of all) {
    if (list.every((item) => estimates.has(item))) continue;

    // 1) El mismo episodio en otro sitio con hora: se toma esa hora y ese puesto
    list.forEach((item) => {
      if (estimates.has(item)) return;
      const twin = timed.find((t) => t.source !== item.source && sameRelease(item, t));
      if (twin) estimates.set(item, { ...estimates.get(twin)! });
    });

    // 2) Puntos de referencia de esta lista, sin los que contradicen el orden
    const anchors: Anchor[] = [];
    list.forEach((item, index) => {
      const e = estimates.get(item);
      if (!e) return;
      if (anchors.length === 0 || e.age >= anchors[anchors.length - 1].age) {
        anchors.push({ index, ...e });
      }
    });

    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    const step =
      anchors.length >= 2 && last.index > first.index
        ? Math.max(5, (last.age - first.age) / (last.index - first.index))
        : DEFAULT_STEP_MIN;

    // 3) El resto se coloca entre sus vecinos conocidos
    list.forEach((item, index) => {
      if (estimates.has(item)) return;

      if (anchors.length === 0) {
        // Sin ningún punto de referencia: se usa el puesto equivalente
        const ref = reference[Math.min(index, reference.length - 1)];
        estimates.set(item, { ...estimates.get(ref)! });
      } else {
        estimates.set(item, interpolate(index, anchors, step));
      }
    });
  }

  return estimates;
}

/** Solo las edades (minutos desde que salió cada episodio). */
export function estimateAges(
  lists: Record<string, ScrapedAnime[]>,
  sameRelease: SameRelease
): Map<ScrapedAnime, number> {
  const ages = new Map<ScrapedAnime, number>();
  for (const [item, e] of estimateTimes(lists, sameRelease)) ages.set(item, e.age);
  return ages;
}

/**
 * Ordena de más nuevo a más viejo mezclando todas las fuentes.
 * `pseudoTimestamp` más alto = más reciente.
 */
export function rankAnimes(
  lists: Record<string, ScrapedAnime[]>,
  sameRelease: SameRelease
): RankedAnime[] {
  const estimates = estimateTimes(lists, sameRelease);
  const ranked: RankedAnime[] = [];

  for (const [source, list] of Object.entries(lists)) {
    list.forEach((item, index) => {
      const e = estimates.get(item)!;

      // Con la misma hora manda el puesto equivalente; después, la prioridad
      // de la fuente y, por último, el orden de la propia lista
      const sortKey =
        e.age + e.pos * 0.001 + (SOURCE_PRIORITY[source] ?? 0) * 0.0001 + index * 1e-7;

      ranked.push({ ...item, pseudoTimestamp: -sortKey });
    });
  }

  return ranked;
}