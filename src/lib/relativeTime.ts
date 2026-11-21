/**
 * Lee la antigüedad que muestran algunos sitios:
 * "hace 7 horas" -> 420 min · "hace un día" -> 1440 · "hace unos segundos" -> 0.
 * Devuelve también el texto tal cual, para mostrarlo. Sin coincidencia: null.
 */
export function parseRelativeEs(
  text: string
): { minutes: number; label: string } | null {
  const match = text
    .toLowerCase()
    .match(
      /hace\s+(unos?|unas?|una?|\d+)\s+(segundos?|minutos?|horas?|d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)/
    );
  if (!match) return null;

  const [label, quantity, unit] = match;
  const n = /^\d+$/.test(quantity) ? Number(quantity) : 1;

  let minutes: number;
  if (unit.startsWith("segundo")) minutes = 0;
  else if (unit.startsWith("minuto")) minutes = n;
  else if (unit.startsWith("hora")) minutes = n * 60;
  else if (/^d[ií]a/.test(unit)) minutes = n * 1440;
  else if (unit.startsWith("semana")) minutes = n * 10080;
  else if (unit.startsWith("mes")) minutes = n * 43200;
  else minutes = n * 525600;

  return { minutes, label };
}

/** 420 -> "hace 7 horas" · 1440 -> "hace un día" · 0 -> "hace unos segundos" */
export function formatRelativeEs(minutes: number): string {
  if (minutes < 1) return "hace unos segundos";

  if (minutes < 60) {
    const m = Math.floor(minutes);
    return m === 1 ? "hace un minuto" : `hace ${m} minutos`;
  }

  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return h === 1 ? "hace una hora" : `hace ${h} horas`;
  }

  const d = Math.floor(minutes / 1440);
  return d === 1 ? "hace un día" : `hace ${d} días`;
}