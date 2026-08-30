import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRecipes, planRecipeMove, recipeFields } from '../src/lib/shared-recipes.ts';

const recipe = (slug, order) => ({ slug, title: slug, category: 'Family', tags: [], content: 'Mix and bake.', order });
const slugs = (recipes) => recipes.map((entry) => entry.slug);

test('Firestore edits replace built-in recipes by slug without duplicates', () => {
  const merged = mergeRecipes([recipe('Apple'), recipe('Bread')], [{ ...recipe('Apple'), title: 'Apple cake' }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Apple cake');
});

test('a persisted tombstone hides both untouched and promoted built-in recipes', () => {
  const builtIn = [recipe('Apple'), recipe('Bread')];
  for (const tombstone of [{ slug: 'Apple', deleted: true }, { ...recipe('Apple'), deleted: true }]) {
    assert.deepEqual(slugs(mergeRecipes(builtIn, [tombstone])), ['Bread']);
    assert.deepEqual(slugs(mergeRecipes(builtIn, JSON.parse(JSON.stringify([tombstone])))), ['Bread']);
  }
});

test('explicit order takes precedence and filtering preserves cookbook order', () => {
  const ordered = mergeRecipes([recipe('Apple', 3), recipe('Bread', 2), recipe('Cake', 1)], []);
  assert.deepEqual(slugs(ordered), ['Cake', 'Bread', 'Apple']);
  assert.deepEqual(slugs(ordered.filter((entry) => entry.slug !== 'Bread')), ['Cake', 'Apple']);
});

test('missing, duplicate, and invalid orders have a stable fallback', () => {
  assert.deepEqual(slugs(mergeRecipes([], [recipe('Cake', NaN), recipe('Bread', Infinity), recipe('Apple')])) , ['Apple', 'Bread', 'Cake']);
});

for (const orders of [[undefined, undefined, undefined], [0, 0, 0], [0, 1, 2], [-10, 2, 90]]) {
  for (const [slug, direction, expected] of [
    ['Apple', 'down', ['Bread', 'Apple', 'Cake']],
    ['Bread', 'down', ['Apple', 'Cake', 'Bread']],
    ['Bread', 'up', ['Bread', 'Apple', 'Cake']],
    ['Cake', 'up', ['Apple', 'Cake', 'Bread']],
  ]) {
    test(`move ${slug} ${direction} with orders ${JSON.stringify(orders)}`, () => {
      const original = ['Apple', 'Bread', 'Cake'].map((name, index) => recipe(name, orders[index]));
      const before = structuredClone(original);
      const updates = planRecipeMove(original, slug, direction);
      const stored = updates.map(({ recipe, order }) => ({ ...recipe, order }));
      assert.deepEqual(slugs(mergeRecipes(original, stored)), expected);
      assert.deepEqual(original, before, 'planning must not mutate provider state');
      assert.ok(stored.every((entry) => entry.content && entry.title), 'static promotions keep full recipe data');
    });
  }
}

test('first/last boundaries and unknown recipes are no-ops', () => {
  const recipes = [recipe('Apple'), recipe('Bread')];
  assert.deepEqual(planRecipeMove(recipes, 'Apple', 'up'), []);
  assert.deepEqual(planRecipeMove(recipes, 'Bread', 'down'), []);
  assert.deepEqual(planRecipeMove(recipes, 'Missing', 'up'), []);
  assert.deepEqual(planRecipeMove([], 'Missing', 'down'), []);
});

test('Firestore payloads omit slug and undefined, but retain cleared optional fields', () => {
  assert.deepEqual(recipeFields({ slug: 'Apple', title: 'Apple', source: '', servings: '', prepTime: undefined, order: 0 }), {
    title: 'Apple', source: '', servings: '', order: 0,
  });
});
