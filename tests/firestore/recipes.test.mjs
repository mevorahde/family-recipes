import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createRecipeStore } from '../../src/lib/recipe-store.ts';

// Fail closed: never connect these tests to the family database.
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8088');
let env;
const cake = { slug: 'cake', title: 'Family cake', category: 'Dessert', tags: ['baking'], content: 'Mix and bake.', order: 0 };
const bread = { ...cake, slug: 'bread', title: 'Bread', order: 1 };
const fields = ({ slug: _slug, ...recipe }) => recipe;
const family = () => env.authenticatedContext('parent').firestore();
const mom = () => env.authenticatedContext('mom').firestore();
const outsider = () => env.authenticatedContext('outsider').firestore();
const visitor = () => env.unauthenticatedContext().firestore();
const store = (db = family(), uid = 'parent') => createRecipeStore(db, uid, [cake, bread]);

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-family-recipes', firestore: { host: '127.0.0.1', port: 8088, rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await Promise.all(['parent', 'mom'].map((uid) => setDoc(doc(context.firestore(), 'members', uid), { enabled: true })));
  });
});
after(async () => { await env?.cleanup(); });

test('visitors read recipes; only invited accounts write', async () => {
  await store().add(fields(cake), 0);
  assert.equal((await getDocs(collection(visitor(), 'recipes'))).size, 1);
  for (const db of [visitor(), outsider()]) {
    await assertFails(setDoc(doc(db, 'recipes', 'cake'), fields(cake)));
    await assertFails(store(db, 'outsider').add(fields(cake), 1));
  }
  await store(mom(), 'mom').update('cake', { title: 'Mom’s cake' }, 0);
});
test('membership is private and cannot be self-granted', async () => {
  await getDoc(doc(family(), 'members', 'parent'));
  await getDoc(doc(outsider(), 'members', 'outsider'));
  await assertFails(getDoc(doc(outsider(), 'members', 'parent')));
  await assertFails(getDocs(collection(family(), 'members')));
  for (const db of [outsider(), family()]) await assertFails(setDoc(doc(db, 'members', 'outsider'), { enabled: true }));
});
test('rules reject email copies, malformed recipes, and permanent deletion', async () => {
  const db = family();
  for (const data of [{ ...fields(cake), createdByEmail: 'private@example.test' }, { title: 'Incomplete' }, { ...fields(cake), version: -1 }, { deleted: true, version: 1, content: 'Must be private' }]) {
    await assertFails(setDoc(doc(db, 'recipes', 'cake'), data));
  }
  await setDoc(doc(db, 'recipes', 'cake'), fields(cake));
  await assertFails(deleteDoc(doc(db, 'recipes', 'cake')));
});
test('editing built-in recipes saves private history readable by either member', async () => {
  await store().update('cake', { title: 'Updated cake', source: '' }, 0);
  const current = (await getDoc(doc(visitor(), 'recipes', 'cake'))).data();
  assert.equal(current.title, 'Updated cake'); assert.equal(current.version, 1);
  const history = await store(mom(), 'mom').history('cake');
  assert.equal(history.length, 1); assert.equal(history[0].recipe.title, cake.title);
  for (const db of [visitor(), outsider()]) await assertFails(getDocs(collection(db, 'recipeHistory', 'cake', 'versions')));
});
test('stale edits preserve current content and do not add history', async () => {
  await store().update('cake', { title: 'First edit' }, 0);
  await assert.rejects(store(mom(), 'mom').update('cake', { title: 'Stale edit' }, 0), /changed while/);
  assert.equal((await getDoc(doc(visitor(), 'recipes', 'cake'))).data().title, 'First edit');
  assert.equal((await store().history('cake')).length, 1);
});
test('delete/restore works for static and dynamic recipes with private recovery copies', async () => {
  const db = family();
  await setDoc(doc(db, 'recipes', 'dynamic'), { ...fields(cake), title: 'New recipe', version: 1 });
  for (const slug of ['cake', 'dynamic']) {
    await store(db).remove(slug);
    const tombstone = (await getDoc(doc(visitor(), 'recipes', slug))).data();
    assert.deepEqual(Object.keys(tombstone).sort(), ['deleted', 'version']);
    assert.equal(tombstone.deleted, true);
    for (const reader of [visitor(), outsider()]) await assertFails(getDoc(doc(reader, 'recipeTrash', slug)));
    await assertFails(deleteDoc(doc(db, 'recipeTrash', slug)));
    await store(mom(), 'mom').restore(slug);
    assert.ok((await getDoc(doc(visitor(), 'recipes', slug))).data().content);
    assert.equal((await getDoc(doc(db, 'recipeTrash', slug))).exists(), false);
    await assert.rejects(store(db).restore(slug), /already been restored/);
  }
});
test('stale edit/move cannot resurrect a deleted recipe', async () => {
  await store().remove('cake');
  await assert.rejects(store().update('cake', { title: 'Stale' }, 0), /deleted/);
  await assert.rejects(store().move([cake, bread], 'cake', 'down'), /deleted/);
});
test('version restoration keeps order and the replaced version', async () => {
  await store().update('cake', { title: 'Changed' }, 0);
  const [original] = await store().history('cake');
  await store().move([{ ...cake, title: 'Changed', version: 1 }, bread], 'cake', 'down');
  await store().restoreVersion('cake', original.id, 1);
  const restored = (await getDoc(doc(visitor(), 'recipes', 'cake'))).data();
  assert.equal(restored.title, cake.title); assert.equal(restored.order, 1); assert.equal(restored.version, 2);
  assert.ok((await store().history('cake')).some((version) => version.recipe.title === 'Changed'));
  await assert.rejects(store().restoreVersion('cake', original.id, 1), /changed while/);
});
test('legacy email never enters updated public documents, history, or trash', async () => {
  await env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), 'recipes', 'cake'), { ...fields(cake), createdByEmail: 'legacy@example.test', createdAt: serverTimestamp() }));
  await store().update('cake', { title: 'Clean' }, 0);
  assert.equal('createdByEmail' in (await getDoc(doc(visitor(), 'recipes', 'cake'))).data(), false);
  assert.equal('createdByEmail' in (await store().history('cake'))[0].recipe, false);
  await store().remove('cake');
  assert.equal('createdByEmail' in (await getDoc(doc(family(), 'recipeTrash', 'cake'))).data().recipe, false);
});
test('history cannot be overwritten, deleted, or store email metadata', async () => {
  await store().update('cake', { title: 'Changed' }, 0);
  const [version] = await store().history('cake');
  const target = doc(family(), 'recipeHistory', 'cake', 'versions', version.id);
  const data = { recipe: fields(cake), actorUid: 'parent', action: 'edit', recordedAt: serverTimestamp() };
  await assertFails(deleteDoc(target)); await assertFails(setDoc(target, data));
  await assertFails(setDoc(doc(collection(family(), 'recipeHistory', 'cake', 'versions')), { ...data, recipe: { ...fields(cake), createdByEmail: 'private@example.test' } }));
});
