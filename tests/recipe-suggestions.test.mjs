import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestRecipeDetails, emptyDetailSuggestions } from '../src/lib/recipe-suggestions.ts';

test('fried rice suggests useful details without inventing yield, time, or source', () => {
  const result = suggestRecipeDetails('Fried Rice - made 01-02-20 family favorite\n2 tbsp oil\nAdd 2 beaten eggs\nAdd 3 cups cold rice');
  assert.deepEqual(result, {title:'Fried Rice',category:'Side Dishes',tags:'rice, eggs, stir-fry'});
});
test('explicit fields and common yield labels are extracted', () => {
  assert.deepEqual(suggestRecipeDetails('Title: Sunday Pancakes\nCategory: Family Favorites\nTags: weekend, griddle\nServes 4\nPrep Time: 10 minutes\nCook Time: 1 hour 20 minutes\nSource: Nana’s recipe box\nIngredients\n1 cup flour'), {
    title:'Sunday Pancakes',category:'Family Favorites',tags:'weekend, griddle',servings:'4',prepTime:'10 minutes',cookTime:'1 hour 20 minutes',source:'Nana’s recipe box',
  });
});
test('markdown and inline labelled metadata are supported', () => {
  const result = suggestRecipeDetails('## Lemon Cake\n**Servings:** 6–8 | Prep: 15 min | Cook: 40 min\nRecipe from: https://example.com/lemon-cake\n## Ingredients\n2 eggs');
  assert.equal(result.title,'Lemon Cake'); assert.equal(result.servings,'6–8');
  assert.equal(result.prepTime,'15 min'); assert.equal(result.cookTime,'40 min');
  assert.equal(result.source,'https://example.com/lemon-cake');
});
test('printed stationery is not used as recipe attribution', () => {
  const result = suggestRecipeDetails('Sample Insurance\nPat Sample, Agent\n123 Example Street\nPhone 555 010 1234\nwww.example.com\nFried Rice\nIngredients\n2 eggs');
  assert.equal(result.title,'Fried Rice'); assert.equal(result.source,undefined);
});
test('ingredient counts, instructions and total time are not metadata guesses', () => {
  const result = suggestRecipeDetails('Ingredients\n4 cups rice\n2 eggs\nCook 20 minutes\nTotal time: 30 minutes');
  for (const key of ['title','servings','prepTime','cookTime','source']) assert.equal(result[key],undefined);
});
test('no dietary claims are inferred from incomplete ingredient lists', () => {
  const result = suggestRecipeDetails('Garden Soup\nIngredients\n1 cup carrots\n2 cups water');
  assert.equal(result.category,'Soups & Stews'); assert.equal(result.tags,undefined);
});
test('existing details are preserved, including manually chosen tags and whitespace handling', () => {
  const current = {title:'My title',category:'Dinner',tags:'mom',servings:'2',prepTime:'',cookTime:'  ',source:'My notebook'};
  assert.deepEqual(emptyDetailSuggestions(current, 'Title: Another title\nCategory: Lunch\nTags: rice\nServes 8\nPrep: 5 min\nCook: 10 min\nSource: Another book'), {prepTime:'5 min',cookTime:'10 min'});
  assert.equal(current.title,'My title');
});
test('unknown and empty text does not fabricate details', () => {
  assert.deepEqual(suggestRecipeDetails(''),{});
  assert.deepEqual(suggestRecipeDetails('Ingredients\nPinch of salt'),{});
  assert.equal(suggestRecipeDetails('Special sauce\nIngredients\n1 cup water').category,undefined);
});
test('later pages can supply missing fields without replacing the first-page title', () => {
  const text = 'Apple Cake\nIngredients\n2 apples\n\nDirections\nMix gently\nMakes 8 slices\nBake time: 30 minutes';
  assert.equal(suggestRecipeDetails(text).title,'Apple Cake');
  assert.equal(suggestRecipeDetails(text).servings,'8 slices');
  assert.equal(suggestRecipeDetails(text).cookTime,'30 minutes');
});
