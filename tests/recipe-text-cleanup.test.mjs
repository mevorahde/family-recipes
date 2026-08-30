import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRecipeText } from '../src/lib/recipe-text-cleanup.ts';

const header = 'SAMPLE INSURANCE\nPat Sample, Agent\n123 Example Street\nExample City\nPhone 555 010 1234\nwww.example.com\nINSURANCE\n';
test('removes stationery above a recipe and corrects spelling, retaining the complete original', () => {
  const body = 'Fried Rice - made 01-02-20 family favorite\n4 Tbl. Sesame Oil into wok\nAdd 4 beaten eggs\n(defrosed)\nAdd 4 cups cooked, cold rice\nAdd 4 Tbl. + Oyster Sauce';
  const result = cleanRecipeText(header + body);
  assert.equal(result.original,header+body);
  assert.equal(result.text,body.replace('defrosed','defrosted'));
  assert.equal(result.removedHeaderLines,7);
  assert.deepEqual(result.corrections,['defrosed → defrosted']);
});
test('preserves ingredient quantities, units, temperatures, ambiguous OCR, and family notes', () => {
  const text = 'Rice\n1/2 cup\n½ tsp\n4 Tbl. + sauce\n350°F\nCook 10–15 min\nH\nO cups\nMom liked it; defrost before cooking';
  assert.equal(cleanRecipeText(text).text,text);
});
test('only exact known words change and casing is preserved', () => {
  const result = cleanRecipeText('CHOPED onions, Seasame oil, choped eggs. Salt, flower, flowered, constructor, toString.');
  assert.equal(result.text,'CHOPPED onions, Sesame oil, chopped eggs. Salt, flower, flowered, constructor, toString.');
});
test('does not strip a body source or website, or guess a missing title boundary', () => {
  for (const text of ['Family notes\nwww.example.com\nInsurance\nMix gently', 'Fried Rice\nIngredients\n2 eggs\nSource: Insurance community cookbook\nwww.example.com']) {
    assert.equal(cleanRecipeText(text).text,text);
    assert.equal(cleanRecipeText(text).removedHeaderLines,0);
  }
});
test('does not remove recipe ingredients before a later dish name', () => {
  const text = 'Insurance\nwww.example.com\n2 cups flour\nCake';
  assert.equal(cleanRecipeText(text).removedHeaderLines,0);
});
test('empty, clean, and CRLF text retain their original formatting', () => {
  for (const text of ['', 'Rice\r\n\r\n  2 eggs\r\n']) assert.equal(cleanRecipeText(text).text,text);
  assert.equal(cleanRecipeText('Rice\r\n(defrosed)\r\n').text,'Rice\r\n(defrosted)\r\n');
});
test('cleanup is idempotent and lists repeated identical corrections once', () => {
  const first = cleanRecipeText(header+'Fried Rice\nchoped onions\nchoped garlic');
  assert.deepEqual(first.corrections,['choped → chopped']);
  const second = cleanRecipeText(first.text);
  assert.equal(second.text,first.text);
  assert.equal(second.removedHeaderLines,0);
  assert.deepEqual(second.corrections,[]);
});
