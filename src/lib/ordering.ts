import type { RankedAnime, ScrapedAnime } from "@/types/anime";
import { SOURCE_PRIORITY } from "@/types/sourceVars";

type SameRelease = (a: ScrapedAnime, b: ScrapedAnime) => boolean;

// Si no hay nada mejor, se supone que cada puesto de la lista es ~30 min más viejo
const DEFAULT_STEP_MIN = 30;

type Anchor = { index: number; age: number };

/** Edad estimada (en minutos) de un elemento sin hora, a partir de los que sí tienen. */
function interpolate(index: number, anchors: Anchor[], step: number): number {
  const prev = [...anchors].reverse().find((a) => a.index < index);
  const next = anchors.find((a) => a.index > index);

  if (prev && next) {
    const t = (index - prev.index) / (next.index - prev.index);
    return prev.age + (next.age - prev.age) * t;
  }
  if (prev) return prev.age + (index - prev.index) * step;
  if (next) return next.age * ((index + 1) / (next.index + 1));
  return index * step;
}

/**
 * Calcula cuántos minutos hace que salió cada episodio.
 *
 * - Si el sitio da la hora ("hace 7 horas"), se usa tal cual.
 * - Si no la da, se toma la de ese mismo episodio en otro sitio (si está en ambos)
 *   y los que solo están en este se colocan entre sus vecinos conocidos,
 *   respetando el orden en que el propio sitio los lista.
 * - Si ningún sitio da la hora, se usa la posición en la lista.
 */
export function estimateAges(
  lists: Record<string, ScrapedAnime[]>,
  sameRelease: SameRelease
): Map<ScrapedAnime, number> {
  const ages = new Map<ScrapedAnime, number>();
  const all = Object.values(lists);

  for (const list of all) {
    for (const item of list) {
      if (typeof item.minutesAgo === "number") ages.set(item, item.minutesAgo);
    }
  }

  const timed = all.flat().filter((item) => ages.has(item));

  // Ningún sitio da la hora: solo queda la posición en cada lista
  if (timed.length === 0) {
    for (const list of all) {
      list.forEach((item, i) => ages.set(item, i * DEFAULT_STEP_MIN));
    }
    return ages;
  }

  const reference = [...timed].sort((a, b) => ages.get(a)! - ages.get(b)!);

  for (const list of all) {
    if (list.every((item) => ages.has(item))) continue;

    // 1) El mismo episodio en otro sitio con hora: se toma esa hora
    list.forEach((item) => {
      if (ages.has(item)) return;
      const twin = timed.find((t) => t.source !== item.source && sameRelease(item, t));
      if (twin) ages.set(item, ages.get(twin)!);
    });

    // 2) Puntos de referencia de esta lista, sin los que contradicen el orden
    const anchors: Anchor[] = [];
    list.forEach((item, index) => {
      const age = ages.get(item);
      if (age === undefined) return;
      if (anchors.length === 0 || age >= anchors[anchors.length - 1].age) {
        anchors.push({ index, age });
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
      if (ages.has(item)) return;

      if (anchors.length === 0) {
        // Sin ningún punto de referencia: se usa la hora del puesto equivalente
        ages.set(item, ages.get(reference[Math.min(index, reference.length - 1)])!);
      } else {
        ages.set(item, interpolate(index, anchors, step));
      }
    });
  }

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
  const ages = estimateAges(lists, sameRelease);
  const ranked: RankedAnime[] = [];

  for (const [source, list] of Object.entries(lists)) {
    list.forEach((item, index) => {
      // Los desempates conservan el orden del sitio y la prioridad de la fuente
      const sortKey =
        ages.get(item)! + index * 0.001 + (SOURCE_PRIORITY[source] ?? 0) * 0.0001;

      ranked.push({ ...item, pseudoTimestamp: -sortKey });
    });
  }

  return ranked;
}