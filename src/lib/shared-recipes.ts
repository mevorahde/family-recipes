import type { Recipe } from '../types.ts';

export type StoredRecipe = Recipe & { deleted?: boolean };

export function recipeOrder(recipe: Recipe): number {
  return Number.isFinite(recipe.order) ? recipe.order! : 0;
}

export function mergeRecipes(builtIn: Recipe[], stored: StoredRecipe[]): Recipe[] {
  const merged = new Map(builtIn.map((recipe) => [recipe.slug, recipe]));
  for (const recipe of stored) {
    if (recipe.deleted) merged.delete(recipe.slug);
    else merged.set(recipe.slug, recipe);
  }
  return [...merged.values()].sort(
    (a, b) => recipeOrder(a) - recipeOrder(b)
      || a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug),
  );
}

// Assign distinct positions so legacy recipes with equal/missing order can move too.
export function planRecipeMove(recipes: Recipe[], slug: string, direction: 'up' | 'down') {
  const ordered = [...recipes];
  const index = ordered.findIndex((recipe) => recipe.slug === slug);
  const adjacent = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || adjacent < 0 || adjacent >= ordered.length) return [];
  [ordered[index], ordered[adjacent]] = [ordered[adjacent], ordered[index]];
  return ordered.flatMap((recipe, order) => (
    recipeOrder(recipe) === order ? [] : [{ recipe, order }]
  ));
}

// Firestore rejects undefined values. Keep explicit empty strings to clear form fields.
export function recipeFields(recipe: Partial<Recipe>): Record<string, unknown> {
  const allowed = new Set(['title', 'category', 'tags', 'servings', 'prepTime', 'cookTime', 'source', 'content', 'order', 'createdBy', 'version']);
  return Object.fromEntries(
    Object.entries(recipe).filter(([key, value]) => allowed.has(key) && value !== undefined),
  );
}

export function recipeVersion(recipe: Partial<Recipe>): number {
  return Number.isSafeInteger(recipe.version) && recipe.version! >= 0 ? recipe.version! : 0;
}
