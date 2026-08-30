import { collection, doc, getDocs, runTransaction, serverTimestamp, type Firestore, type Transaction } from 'firebase/firestore';
import type { Recipe, RecipeVersion } from '../types.ts';
import { planRecipeMove, recipeFields, recipeOrder, recipeVersion } from './shared-recipes.ts';

// Transactions keep recovery copies and public changes together. No email fields
// enter these documents, including when an older document is edited or restored.
export function createRecipeStore(db: Firestore, uid: string, builtIn: Recipe[]) {
  const ref = (slug: string) => doc(db, 'recipes', slug);
  function remember(tx: Transaction, recipe: Recipe, action: string) {
    tx.set(doc(collection(db, 'recipeHistory', recipe.slug, 'versions')), {
      recipe: recipeFields(recipe), action, actorUid: uid, recordedAt: serverTimestamp(),
    });
  }
  async function current(tx: Transaction, slug: string): Promise<Recipe> {
    const snapshot = await tx.get(ref(slug));
    if (snapshot.data()?.deleted) throw new Error('This recipe was deleted. Your draft has not been saved.');
    const recipe = snapshot.exists()
      ? { ...recipeFields(snapshot.data()), slug } as Recipe
      : builtIn.find((item) => item.slug === slug);
    if (!recipe) throw new Error('This recipe no longer exists.');
    return recipe;
  }
  function checkVersion(recipe: Recipe, expected: number) {
    if (recipeVersion(recipe) !== expected) throw new Error('This recipe changed while you were editing. Copy your draft, then reopen the recipe before saving.');
  }
  return {
    async add(recipe: Partial<Recipe>, order: number) {
      const target = doc(collection(db, 'recipes'));
      await runTransaction(db, async (tx) => {
        tx.set(target, { ...recipeFields(recipe), order, createdBy: uid, version: 1 });
      });
    },
    async update(slug: string, fields: Partial<Recipe>, expected: number) {
      await runTransaction(db, async (tx) => {
        const previous = await current(tx, slug);
        checkVersion(previous, expected);
        remember(tx, previous, 'edit');
        tx.set(ref(slug), { ...recipeFields(previous), ...recipeFields(fields), order: recipeOrder(previous), createdBy: previous.createdBy ?? uid, version: expected + 1 });
      });
    },
    async move(recipes: Recipe[], slug: string, direction: 'up' | 'down') {
      const changes = planRecipeMove(recipes, slug, direction);
      if (!changes.length) return;
      if (changes.length > 450) throw new Error('This cookbook needs an order update before moving recipes.');
      await runTransaction(db, async (tx) => {
        const latest = await Promise.all(changes.map(({ recipe }) => current(tx, recipe.slug)));
        changes.forEach(({ recipe, order }, index) => {
          if (recipeOrder(latest[index]) !== recipeOrder(recipe)) throw new Error('The cookbook order changed. Please try again.');
          tx.set(ref(recipe.slug), { ...recipeFields(latest[index]), order });
        });
      });
    },
    async remove(slug: string) {
      await runTransaction(db, async (tx) => {
        const previous = await current(tx, slug);
        remember(tx, previous, 'delete');
        tx.set(doc(db, 'recipeTrash', slug), { recipe: recipeFields(previous), deletedAt: serverTimestamp(), actorUid: uid });
        tx.set(ref(slug), { deleted: true, version: recipeVersion(previous) + 1 });
      });
    },
    async restore(slug: string) {
      await runTransaction(db, async (tx) => {
        const trashRef = doc(db, 'recipeTrash', slug);
        const [trash, publicDoc] = await Promise.all([tx.get(trashRef), tx.get(ref(slug))]);
        if (!trash.exists() || !publicDoc.data()?.deleted) throw new Error('This recipe has already been restored or is no longer in Recently deleted.');
        const recipe = { ...recipeFields(trash.data().recipe), slug } as Recipe;
        remember(tx, recipe, 'restore');
        tx.set(ref(slug), { ...recipeFields(recipe), version: recipeVersion(publicDoc.data() ?? {}) + 1 });
        tx.delete(trashRef);
      });
    },
    async history(slug: string): Promise<RecipeVersion[]> {
      const snapshots = await getDocs(collection(db, 'recipeHistory', slug, 'versions'));
      return snapshots.docs.map((snapshot) => {
        const data = snapshot.data();
        return { id: snapshot.id, recipe: { ...recipeFields(data.recipe), slug } as Recipe, action: data.action, recordedAt: data.recordedAt?.toMillis() ?? 0 };
      }).sort((a, b) => b.recordedAt - a.recordedAt);
    },
    async restoreVersion(slug: string, id: string, expected: number) {
      await runTransaction(db, async (tx) => {
        const previous = await current(tx, slug);
        const snapshot = await tx.get(doc(db, 'recipeHistory', slug, 'versions', id));
        checkVersion(previous, expected);
        if (!snapshot.exists()) throw new Error('That previous version is not available.');
        remember(tx, previous, 'restore-version');
        tx.set(ref(slug), { ...recipeFields(snapshot.data().recipe), order: recipeOrder(previous), createdBy: previous.createdBy ?? uid, version: expected + 1 });
      });
    },
  };
}
