import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as cheerio from 'cheerio';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

type RecipeData = Record<string, unknown>;

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [first, second] = address.split('.').map(Number);
    return (
      first === 10 ||
      first === 127 ||
      first === 0 ||
      first >= 224 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
}

async function validateUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'A recipe URL is required.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpsError('invalid-argument', 'Enter a valid recipe URL.');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HttpsError('invalid-argument', 'Only public HTTPS recipe URLs can be imported.');
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new HttpsError('permission-denied', 'This URL is not available for import.');
  }

  return url;
}

function findRecipe(value: unknown): RecipeData | undefined {
  if (Array.isArray(value)) return value.map(findRecipe).find(Boolean);
  if (!value || typeof value !== 'object') return undefined;

  const item = value as RecipeData;
  const type = item['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return item;
  return findRecipe(item['@graph']);
}

function text(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  return typeof value === 'string' ? value.trim() : undefined;
}

function instructions(value: unknown): string | undefined {
  if (!Array.isArray(value)) return text(value);
  const items = value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return text((item as RecipeData).text);
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
  return items.length ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : undefined;
}

function markdown(recipe: RecipeData) {
  const ingredients = recipe.recipeIngredient;
  const ingredientText = Array.isArray(ingredients)
    ? ingredients.map((item) => text(item)).filter(Boolean).map((item) => `- ${item}`).join('\n')
    : text(ingredients);
  const instructionText = instructions(recipe.recipeInstructions);
  return [ingredientText && `## Ingredients\n\n${ingredientText}`, instructionText && `## Instructions\n\n${instructionText}`]
    .filter(Boolean)
    .join('\n\n');
}

export const importRecipeUrl = onCall({ region: 'us-central1', timeoutSeconds: 15, memory: '256MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before importing a recipe website.');
  }

  let url = await validateUrl(request.data?.url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'FamilyRecipes/1.0 recipe importer' },
      signal: AbortSignal.timeout(10_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new HttpsError('failed-precondition', 'The recipe page redirected without a destination.');
      url = await validateUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new HttpsError('not-found', 'The recipe page could not be loaded.');

    const $ = cheerio.load(await response.text());
    const recipe = $('script[type="application/ld+json"]')
      .map((_, element) => {
        try {
          return findRecipe(JSON.parse($(element).text()));
        } catch {
          return undefined;
        }
      })
      .get()
      .find((item): item is RecipeData => Boolean(item));
    if (!recipe) throw new HttpsError('not-found', 'No structured recipe data was found on that page.');

    const content = markdown(recipe);
    if (!content) throw new HttpsError('failed-precondition', 'That page has no ingredients or instructions to import.');
    return { title: text(recipe.name), source: url.toString(), content };
  }

  throw new HttpsError('failed-precondition', 'The recipe page redirected too many times.');
});