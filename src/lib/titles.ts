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

/** Partículas y artículos: no cuentan como "palabras en común". */
const STOPWORDS = new Set([
  "no", "wa", "ga", "to", "ni", "de", "wo", "na", "ka", // partículas japonesas
  "the", "of", "and", "an", "in", "on", // artículos y preposiciones en inglés
]);

/** Similitud mínima para dar un título por válido. */
export const MIN_SCORE = 0.7;

/**
 * Unifica cómo se escribe la temporada: "3rd Season", "Season 3", "Part 3"
 * y "Cour 3" pasan a ser "3", para poder comparar títulos de distintos sitios.
 */
export function canonicalSeason(title: string): string {
  return title
    .replace(/\b(\d+)(?:st|nd|rd|th)\s+(?:season|cour)\b/gi, "$1")
    .replace(/\b(?:season|part|cour)\s+(\d+)\b/gi, "$1");
}

/** Palabras de una clave normalizada (sin las de 1 letra ni las partículas). */
function tokensOf(key: string): string[] {
  return [
    ...new Set(
      key.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t))
    ),
  ];
}

/**
 * Cuánto encaja un título candidato con el buscado (0 a 1).
 * Devuelve null si es otra temporada (números distintos).
 *
 * Los sitios abrevian o reescriben los títulos, así que además de la
 * similitud de texto se valoran las palabras en común: si un título está
 * contenido en el otro (p. ej. sin el subtítulo largo) también encaja.
 */
export function titleMatch(
  target: string,
  candidateTitle: string
): { score: number; shared: number } | null {
  const targetKey = normalizeKey(canonicalSeason(target));
  const candidateKey = normalizeKey(canonicalSeason(candidateTitle));

  // Números distintos = otra temporada: se descarta
  if (digitsOf(candidateKey) !== digitsOf(targetKey)) return null;

  const targetTokens = tokensOf(targetKey);
  const candidateTokens = tokensOf(candidateKey);

  const shared = targetTokens.filter((t) => candidateTokens.includes(t)).length;
  const minTokens = Math.min(targetTokens.length, candidateTokens.length);

  const dice = stringSimilarity.compareTwoStrings(targetKey, candidateKey);
  const overlap = minTokens >= 2 && shared >= 2 ? 0.85 * (shared / minTokens) : 0;

  return { score: Math.max(dice, overlap), shared };
}