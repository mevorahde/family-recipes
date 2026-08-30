import { suggestRecipeDetails } from './recipe-suggestions.ts';

export interface TextCleanup {
  original: string;
  text: string;
  removedHeaderLines: number;
  corrections: string[];
}

// Deliberately small whole-word dictionary: no fuzzy matching, unit conversion,
// number correction, ingredient substitution, or rewriting family notes.
const spelling: Record<string, string> = {
  defrosed: 'defrosted', defosted: 'defrosted', deforsted: 'defrosted',
  ingrediants: 'ingredients', ingredents: 'ingredients',
  choped: 'chopped', chooped: 'chopped', seasame: 'sesame',
  suger: 'sugar', cinamon: 'cinnamon', cinnimon: 'cinnamon',
  vanila: 'vanilla', brocolli: 'broccoli', brocoli: 'broccoli',
  peices: 'pieces', seperate: 'separate', seperately: 'separately',
  stiring: 'stirring', untill: 'until', minites: 'minutes',
};
const commercial = /\b(?:insurance|agent|telephone|phone|fax)\b|www\.|https?:\/\/|\b\d{3}[- .]\d{3}[- .]\d{4}\b/i;
const recipeLine = /^(?:#{1,6}\s*)?(?:ingredients?|instructions?|directions?|notes?|source|recipe (?:from|by)|serves|servings|prep|cook)\b|^(?:add|mix|stir|heat|bake|combine|pour|fold|simmer)\b|^\s*[-*•]?\s*(?:\d+[\d/ .¼½¾⅓⅔]*|[¼½¾⅓⅔])\s*(?:cups?|tbsp|tbl\.?|tsp|tablespoons?|teaspoons?|oz|ounces?|grams?|eggs?|lbs?|pounds?)\b/i;

export function cleanRecipeText(original: string): TextCleanup {
  const lines = original.split(/\r?\n/);
  let start = 0;
  // Remove a leading block only when it has multiple stationery signals and
  // ends at a recognizable dish title. Do not delete isolated body lines.
  for (let index = 1; index < Math.min(lines.length, 40); index++) {
    const candidate = lines[index].trim();
    if (candidate.length > 120 || recipeLine.test(candidate) || commercial.test(candidate)) continue;
    const detail = suggestRecipeDetails(candidate);
    if (!detail.title || !detail.category) continue;
    const prefix = lines.slice(0, index);
    if (prefix.filter((line) => commercial.test(line)).length >= 2 && !prefix.some((line) => recipeLine.test(line))) start = index;
    break;
  }
  const corrections = new Set<string>();
  // Preserve original whitespace and line endings unless removing a header.
  const body = start ? lines.slice(start).join(original.includes('\r\n') ? '\r\n' : '\n') : original;
  const text = body.replace(/\b[A-Za-z]+\b/g, (word) => {
    const key = word.toLowerCase();
    const replacement = Object.hasOwn(spelling, key) ? spelling[key] : undefined;
    if (!replacement) return word;
    const corrected = word === word.toUpperCase() ? replacement.toUpperCase()
      : /^[A-Z]/.test(word) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    corrections.add(`${word} → ${corrected}`);
    return corrected;
  });
  return { original, text, removedHeaderLines: start, corrections: [...corrections] };
}
