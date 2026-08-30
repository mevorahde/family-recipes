export const detailLabels = {
  title: 'Title', category: 'Category', tags: 'Tags', servings: 'Servings',
  prepTime: 'Prep Time', cookTime: 'Cook Time', source: 'Source',
} as const;
export type RecipeDetails = Record<keyof typeof detailLabels, string>;

// Small, local suggestions, not an AI rewrite. Never estimate yields/times or
// infer dietary safety. Preserve the original recipe text for the family to review.
const dishes: [RegExp, string][] = [
  [/\b(cake|cookies?|brownies?|pie|pudding|dessert|cobbler)\b/i, 'Desserts'],
  [/\b(pancakes?|waffles?|omelett?e|french toast|porridge)\b/i, 'Breakfast'],
  [/\b(soup|stew|chowder)\b/i, 'Soups & Stews'],
  [/\bsalad\b/i, 'Salads'],
  [/\b(bread|rolls?|biscuits?|muffins?)\b/i, 'Baking'],
  [/\b(rice|potatoes?|vegetables?|coleslaw)\b/i, 'Side Dishes'],
  [/\b(pasta|lasagna|spaghetti|chicken|beef|pork|fish|salmon|casserole|tacos?|pizza)\b/i, 'Main Dishes'],
];
const fieldLine = /^(?:title|recipe name|category|tags|servings|serves|yield|makes|prep(?:aration)?(?: time)?|cook(?:ing)?(?: time)?|bake time|source|recipe (?:from|by))\s*[:–—-]/i;
const sectionLine = /^(?:ingredients?|instructions?|directions?|method|notes?|recipe)\s*:?[\s]*$/i;
const ingredientLine = /^(?:[-*•]\s*)?(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞])|^(?:add|mix|stir|heat|bake|cook|combine|pour|fold|serve|simmer|chop)\b/i;
const stationeryLine = /(?:https?:|www\.|@|\b(?:insurance|agent|telephone|phone|fax|commercial|street|avenue|zip)\b|\d{3}[- .]\d{3}[- .]\d{4})/i;

function cleanTitle(value: string) {
  return value.replace(/\s+[-–—]\s*(?:made|last made|written|updated|\d{1,2}[/-]\d{1,2})\b.*$/i, '').trim();
}

export function suggestRecipeDetails(text: string): Partial<RecipeDetails> {
  const lines = text.slice(0, 100_000).split(/\r?\n/).map((line) => line.trim().replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '')).filter(Boolean);
  const segments = lines.flatMap((line) => line.split(/\s*[|;•]\s*/));
  const labelled = (label: string) => segments.map((line) => line.match(new RegExp(`^(?:${label})\\s*[:–—-]\\s*(.+)$`, 'i'))?.[1]?.trim()).find(Boolean);
  const result: Partial<RecipeDetails> = {};
  const explicitTitle = labelled('title|recipe name');
  const headingLines: string[] = [];
  for (const line of lines.slice(0, 30)) {
    if (sectionLine.test(line) && !/^recipe:?$/i.test(line)) break;
    if (ingredientLine.test(line) && !stationeryLine.test(line)) break;
    if (!fieldLine.test(line) && !stationeryLine.test(line) && !sectionLine.test(line) && line.length >= 3 && line.length <= 120) headingLines.push(line);
  }
  const title = cleanTitle(explicitTitle ?? headingLines.find((line) => dishes.some(([pattern]) => pattern.test(line))) ?? (headingLines.length === 1 ? headingLines[0] : '') ?? '');
  if (title && title.length <= 120 && !stationeryLine.test(title)) result.title = title;
  const category = labelled('category');
  if (category && category.length <= 80) result.category = category;
  else if (result.title) result.category = dishes.find(([pattern]) => pattern.test(result.title!))?.[1];

  const tags = labelled('tags');
  if (tags) result.tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8).join(', ');
  else {
    const recipeText = lines.filter((line) => !stationeryLine.test(line) && !fieldLine.test(line)).join(' ');
    const suggested = ['rice', 'eggs', 'chicken', 'beef', 'pork', 'salmon', 'potatoes', 'pasta', 'chocolate', 'apples'].filter((tag) => new RegExp(`\\b${tag.replace(/s$/, 's?')}\\b`, 'i').test(recipeText));
    if (/\bfried rice\b/i.test(title)) suggested.push('stir-fry');
    if (suggested.length) result.tags = suggested.slice(0, 6).join(', ');
  }
  // Only explicit yields; ingredient amounts and dates are not serving counts.
  const yieldText = labelled('servings|serves|yield|makes') ?? segments.map((line) => line.match(/^(?:serves|makes)\s+(\d.*)$/i)?.[1]).find(Boolean);
  if (yieldText && /^\d+(?:\s*[-–]\s*\d+)?(?:\s+(?:people|servings?|portions?|cookies?|slices?|loaves|rolls?|muffins?|cups?))?\.?$/i.test(yieldText)) result.servings = yieldText;
  for (const [key, label] of [['prepTime', 'prep(?:aration)?(?: time)?'], ['cookTime', 'cook(?:ing)?(?: time)?|bake time']] as const) {
    const value = labelled(label);
    if (value && /^(?:\d+(?:\s*[-–]\s*\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s*)+$/i.test(value)) result[key] = value;
  }
  const source = labelled('source|recipe from|recipe by');
  if (source && source.length <= 200 && !/@|\d{3}[- .]\d{3}[- .]\d{4}/.test(source)) result.source = source;
  return Object.fromEntries(Object.entries(result).filter(([, value]) => Boolean(value)));
}

export function emptyDetailSuggestions(current: RecipeDetails, text: string): Partial<RecipeDetails> {
  return Object.fromEntries(Object.entries(suggestRecipeDetails(text)).filter(([key]) => !current[key as keyof RecipeDetails].trim()));
}
