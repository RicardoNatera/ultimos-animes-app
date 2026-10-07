import stringSimilarity from "string-similarity";

/**
 * Clave normalizada de un título: minúsculas, sin tildes ni símbolos.
 * Si el título no tiene caracteres latinos (p. ej. kanji) se usa tal cual.
 */
export function normalizeKey(title: string): string {
  const key = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return key || title.toLowerCase().trim();
}

/** Números que aparecen en la clave: "foo 2" -> "2" (distingue temporadas). */
export function digitsOf(key: string): string {
  return (key.match(/\d+/g) ?? []).join(",");
}

/**
 * ¿Es el mismo anime? Exacto tras normalizar, o muy parecido
 * y con los mismos números (así "Foo" y "Foo 2" no se confunden).
 */
export function sameAnime(a: string, b: string): boolean {
  const ka = normalizeKey(a);
  const kb = normalizeKey(b);

  if (ka === kb) return true;
  if (digitsOf(ka) !== digitsOf(kb)) return false;

  return stringSimilarity.compareTwoStrings(ka, kb) >= 0.9;
}