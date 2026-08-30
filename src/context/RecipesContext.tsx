import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recipes as staticRecipes } from '../lib/recipes';
import { useAuth } from './useAuth';
import { RecipesContext, type NewRecipeInput } from './recipes-context';
import { mergeRecipes, planRecipeMove, recipeFields, recipeOrder, type StoredRecipe } from '../lib/shared-recipes';

const RECIPES_COLLECTION = 'recipes';

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbRecipes, setDbRecipes] = useState<StoredRecipe[]>([]);
  const [loading, setLoading] = useState(Boolean(db));

  useEffect(() => {
    if (!db) return;
    // Include tombstones, which may have no title, as well as legacy unordered recipes.
    const q = collection(db, RECIPES_COLLECTION);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDbRecipes(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              slug: doc.id,
              title: data.title,
              category: data.category,
              tags: data.tags ?? [],
              servings: data.servings,
              prepTime: data.prepTime,
              cookTime: data.cookTime,
              source: data.source,
              content: data.content,
              order: typeof data.order === 'number' ? data.order : 0,
              createdBy: data.createdBy,
              createdByEmail: data.createdByEmail,
              deleted: data.deleted === true,
            } satisfies StoredRecipe;
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  const recipes = useMemo(() => mergeRecipes(staticRecipes, dbRecipes), [dbRecipes]);

  async function addRecipe(recipe: NewRecipeInput) {
    if (!db) {
      throw new Error('Firebase is not configured; cannot save recipes.');
    }
    if (!user) throw new Error('Sign in to save recipes.');
    const nextOrder = Math.max(...recipes.map(recipeOrder), 0) + 1;
    await addDoc(collection(db, RECIPES_COLLECTION), {
      ...recipeFields(recipe),
      order: nextOrder,
      createdBy: user?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  }

  async function updateRecipe(slug: string, recipe: Partial<NewRecipeInput>) {
    if (!db) {
      throw new Error('Firebase is not configured; cannot update recipes.');
    }
    if (!user) throw new Error('Sign in to update recipes.');
    const existing = recipes.find((current) => current.slug === slug);
    if (!existing) throw new Error('Recipe not found.');
    const recipeRef = doc(db, RECIPES_COLLECTION, slug);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(recipeRef);
      if (snapshot.data()?.deleted) throw new Error('This recipe was deleted.');
      if (snapshot.exists()) {
        transaction.update(recipeRef, recipeFields(recipe));
      } else {
        if (!staticRecipes.some((current) => current.slug === slug)) {
          throw new Error('This recipe was deleted.');
        }
        transaction.set(recipeRef, {
          ...recipeFields(existing),
          ...recipeFields(recipe),
          order: recipeOrder(existing),
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }
    });
  }

  async function reorderRecipes(slug: string, direction: 'up' | 'down') {
    if (!db) throw new Error('Firebase is not configured; cannot reorder recipes.');
    if (!user) throw new Error('Sign in to reorder recipes.');
    const changes = planRecipeMove(recipes, slug, direction);
    if (!changes.length) return;
    // Keep normalization and movement atomic; never leave a partially reordered list.
    if (changes.length > 500) throw new Error('This archive needs an order migration before moving recipes.');
    const refs = changes.map(({ recipe }) => doc(db!, RECIPES_COLLECTION, recipe.slug));
    await runTransaction(db, async (transaction) => {
      const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
      changes.forEach(({ recipe, order }, index) => {
        const snapshot = snapshots[index];
        if (snapshot.data()?.deleted) throw new Error('A recipe was deleted. Refresh and try again.');
        if (snapshot.exists()) {
          transaction.update(refs[index], { order });
        } else {
          if (!staticRecipes.some((current) => current.slug === recipe.slug)) {
            throw new Error('A recipe was deleted. Refresh and try again.');
          }
          transaction.set(refs[index], {
            ...recipeFields(recipe), order, createdBy: user.uid, createdAt: serverTimestamp(),
          });
        }
      });
    });
  }

  async function deleteRecipe(slug: string) {
    if (!db) {
      throw new Error('Firebase is not configured; cannot delete recipes.');
    }
    if (!user) throw new Error('Sign in to delete recipes.');
    const recipeRef = doc(db, RECIPES_COLLECTION, slug);
    if (staticRecipes.some((recipe) => recipe.slug === slug)) {
      // Persist a tombstone so the bundled markdown does not reappear on reload.
      await setDoc(recipeRef, { deleted: true }, { merge: true });
    } else {
      await deleteDoc(recipeRef);
    }
  }

  return (
    <RecipesContext.Provider value={{ recipes, loading, addRecipe, updateRecipe, reorderRecipes, deleteRecipe }}>
      {children}
    </RecipesContext.Provider>
  );
}
