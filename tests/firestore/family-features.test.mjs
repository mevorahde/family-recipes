import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { createRecipeStore } from '../../src/lib/recipe-store.ts';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { purgeRecipe, requireFamily, reserveImageImport, validateImage } = require('./lib/recipe-actions.js');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8088');
let env, app, db;
const recipe = { title: 'Old cake', category: 'Dessert', tags: [], content: 'One cup flour.', version: 1 };
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-family-recipes', firestore: { host:'127.0.0.1', port:8088, rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8') } });
  app = initializeApp({ projectId:'demo-family-recipes' }, 'feature-tests'); db = getFirestore(app);
});
beforeEach(async () => {
  await env.clearFirestore();
  await db.doc('members/family').set({ enabled:true });
  await db.doc('recipes/cake').set({deleted:true,version:2});
  await db.doc('recipeTrash/cake').set({recipe, deletedAt:null, actorUid:'family'});
  await db.doc('recipeHistory/cake/versions/original').set({recipe, action:'edit'});
});
after(async () => { await env?.cleanup(); await deleteApp(app); });

test('permanent deletion requires invited membership and an exact confirmation', async () => {
  for (const uid of [undefined,'stranger']) await assert.rejects(purgeRecipe(db,uid,'cake','Old cake'), /Sign in|invited/);
  await assert.rejects(purgeRecipe(db,'family','cake','Wrong title'), /changed/);
  await assert.rejects(purgeRecipe(db,'family','../members','Old cake'), /Choose/);
  assert.ok((await db.doc('recipeTrash/cake').get()).exists);
});
test('purge removes recovery and all versions, is retryable, and retains only a content-free marker', async () => {
  await purgeRecipe(db,'family','cake','Old cake');
  assert.equal((await db.doc('recipeTrash/cake').get()).exists,false);
  assert.equal((await db.collection('recipeHistory/cake/versions').get()).size,0);
  assert.deepEqual((await db.doc('recipes/cake').get()).data(),{deleted:true,purged:true,version:3});
  await purgeRecipe(db,'family','cake','Old cake');
  const client=env.authenticatedContext('family').firestore();
  await assertFails(setDoc(doc(client,'recipes','cake'),recipe));
  await assertFails(setDoc(doc(client,'recipeTrash','cake'),{recipe,deletedAt:null,actorUid:'family'}));
  await assertFails(getDocs(collection(client,'recipeHistory','cake','versions')));
  assert.equal((await getDoc(doc(env.unauthenticatedContext().firestore(),'recipes','cake'))).data().deleted,true);
});
test('active recipes cannot be purged', async () => {
  await db.doc('recipes/cake').set(recipe);
  await assert.rejects(purgeRecipe(db,'family','cake','Old cake'), /Only recipes/);
  assert.equal((await db.doc('recipes/cake').get()).data().content,recipe.content);
});
test('interrupted deletion resumes and handles more than one history batch', async () => {
  await db.doc('recipes/cake').set({deleted:true,purged:true,version:3});
  await db.doc('recipeTrash/cake').update({purging:true});
  for(let start=0;start<450;start+=225){ const batch=db.batch(); for(let n=start;n<start+225;n++)batch.set(db.doc(`recipeHistory/cake/versions/v${n}`),{recipe}); await batch.commit(); }
  await purgeRecipe(db,'family','cake','Old cake');
  assert.equal((await db.collection('recipeHistory/cake/versions').get()).size,0);
  assert.equal((await db.doc('recipeTrash/cake').get()).exists,false);
});
test('restore racing purge either wins before deletion or is blocked without partial content', async () => {
  const client=env.authenticatedContext('family').firestore();
  const results=await Promise.allSettled([purgeRecipe(db,'family','cake','Old cake'),createRecipeStore(client,'family',[]).restore('cake')]);
  const saved=(await db.doc('recipes/cake').get()).data();
  if(saved.purged){ assert.equal(saved.content,undefined); assert.equal(results[1].status,'rejected'); }
  else { assert.equal(saved.content,recipe.content); assert.equal(results[0].status,'rejected'); }
});
test('image bytes require a real supported signature and bounded size', () => {
  assert.throws(()=>validateImage('not an image'),/smaller/);
  assert.throws(()=>validateImage(Buffer.from('text').toString('base64')),/not a supported/);
  assert.throws(()=>validateImage('A'.repeat(4_000_004)),/smaller/);
  assert.ok(validateImage(Buffer.from([255,216,255,0]).toString('base64')).length);
});
test('uninvited users cannot start OCR; usage counters are private and daily-limited', async () => {
  await assert.rejects(requireFamily(db,'stranger'),/invited/);
  await requireFamily(db,'family');
  const now=new Date('2026-09-01T12:00:00Z');
  for(let n=0;n<20;n++)await reserveImageImport(db,'family',now);
  await assert.rejects(reserveImageImport(db,'family',now),/limit/);
  const client=env.authenticatedContext('family').firestore();
  await assertFails(getDoc(doc(client,'imageImportUsage','month-2026-09')));
  await assertFails(setDoc(doc(client,'imageImportUsage','month-2026-09'),{count:0}));
});
test('concurrent OCR requests cannot exceed the shared monthly cap', async () => {
  await db.doc('imageImportUsage/month-2026-09').set({count:99});
  const now=new Date('2026-09-02T12:00:00Z');
  const results=await Promise.allSettled([reserveImageImport(db,'family',now),reserveImageImport(db,'other',now)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal((await db.doc('imageImportUsage/month-2026-09').get()).data().count,100);
});
