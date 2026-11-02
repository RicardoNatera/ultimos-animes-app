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