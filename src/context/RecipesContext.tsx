import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recipes as staticRecipes } from '../lib/recipes';
import { useAuth } from './useAuth';
import { RecipesContext, type NewRecipeInput } from './recipes-context';
import type { Recipe } from '../types';

const RECIPES_COLLECTION = 'recipes';

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbRecipes, setDbRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(Boolean(db));

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, RECIPES_COLLECTION), orderBy('title'));
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
              createdBy: data.createdBy,
              createdByEmail: data.createdByEmail,
            } satisfies Recipe;
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  const recipes = useMemo(
    () => [...staticRecipes, ...dbRecipes].sort((a, b) => a.title.localeCompare(b.title)),
    [dbRecipes],
  );

  async function addRecipe(recipe: NewRecipeInput) {
    if (!db) {
      throw new Error('Firebase is not configured; cannot save recipes.');
    }
    await addDoc(collection(db, RECIPES_COLLECTION), {
      ...recipe,
      createdBy: user?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  }

  async function deleteRecipe(slug: string) {
    if (!db) {
      throw new Error('Firebase is not configured; cannot delete recipes.');
    }
    await deleteDoc(doc(db, RECIPES_COLLECTION, slug));
  }

  return (
    <RecipesContext.Provider value={{ recipes, loading, addRecipe, deleteRecipe }}>
      {children}
    </RecipesContext.Provider>
  );
}
