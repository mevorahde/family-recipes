import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recipes as staticRecipes } from '../lib/recipes';
import { useAuth } from './useAuth';
import { RecipesContext } from './recipes-context';
import { mergeRecipes, recipeFields, recipeOrder, type StoredRecipe } from '../lib/shared-recipes';
import { createRecipeStore } from '../lib/recipe-store';
import { permanentlyDeleteRecipe } from '../lib/family-features';
import type { DeletedRecipe, Recipe } from '../types';

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [dbRecipes, setDbRecipes] = useState<StoredRecipe[]>([]);
  const [loading, setLoading] = useState(Boolean(db));
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState({ uid: '', allowed: false, checked: false, error: '' });
  const [trash, setTrash] = useState<{ uid: string; recipes: DeletedRecipe[]; loading: boolean; error: string }>({ uid: '', recipes: [], loading: true, error: '' });
  const canManage = Boolean(user && access.uid === user.uid && access.allowed);
  const accessLoading = authLoading || Boolean(user && (access.uid !== user.uid || !access.checked));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'recipes'), { includeMetadataChanges: true }, (snapshot) => {
      setDbRecipes(snapshot.docs.map((item) => ({ ...recipeFields(item.data()), slug: item.id, deleted: item.data().deleted === true } as StoredRecipe)));
      setLoading(false);
      setSynced(!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites);
      setError('');
    }, () => {
      setLoading(false);
      setSynced(false);
      setError('We couldn’t load the latest cookbook. The recipes below may be incomplete.');
    });
  }, [attempt]);

  useEffect(() => {
    if (!db || !user) return;
    const uid = user.uid;
    return onSnapshot(doc(db, 'members', uid), (snapshot) => {
      setAccess({ uid, allowed: snapshot.data()?.enabled === true, checked: true, error: '' });
    }, () => setAccess({ uid, allowed: false, checked: true, error: 'We couldn’t check your family access. Please try again.' }));
  }, [user, attempt]);

  useEffect(() => {
    if (!db || !user || !canManage) return;
    const uid = user.uid;
    return onSnapshot(collection(db, 'recipeTrash'), (snapshot) => {
      setTrash({ uid, loading: false, error: '', recipes: snapshot.docs.map((item) => ({
        recipe: { ...recipeFields(item.data().recipe), slug: item.id } as Recipe,
        deletedAt: item.data().deletedAt?.toMillis() ?? 0,
        purging: item.data().purging === true,
      })).sort((a, b) => b.deletedAt - a.deletedAt) });
    }, () => setTrash({ uid, recipes: [], loading: false, error: 'We couldn’t open Recently deleted. Please try again.' }));
  }, [user, canManage, attempt]);

  const recipes = useMemo(() => mergeRecipes(staticRecipes, dbRecipes), [dbRecipes]);
  const ready = Boolean(db && online && synced && !loading && !error);
  function store(write = true) {
    if (!db || !user || !canManage) throw new Error('Only invited family members can change this cookbook.');
    if (write && !ready) throw new Error('Please wait for the cookbook to reconnect. Your changes have not been saved.');
    return createRecipeStore(db, user.uid, staticRecipes);
  }
  const syncMessage = !db ? 'This cookbook is in read-only mode.'
    : !online ? 'You’re offline. You can browse loaded recipes, but changes can’t be saved yet.'
      : error || (loading ? 'Opening the family cookbook…' : !synced ? 'Connecting to the latest cookbook…' : '')
        || (user && access.uid === user.uid ? access.error : '')
        || (user && !accessLoading && !canManage ? 'You’re signed in, but this account isn’t invited to change the cookbook.' : '');

  return <RecipesContext.Provider value={{
    recipes, loading, canManage, accessLoading, ready, syncMessage,
    retry: () => setAttempt((value) => value + 1),
    deletedRecipes: canManage && trash.uid === user?.uid ? trash.recipes : [],
    trashLoading: canManage && (trash.uid !== user?.uid || trash.loading),
    trashError: canManage && trash.uid === user?.uid ? trash.error : '',
    addRecipe: (recipe) => store().add(recipe, Math.max(...recipes.map(recipeOrder), 0) + 1),
    updateRecipe: (slug, recipe, version) => store().update(slug, recipe, version),
    reorderRecipes: (slug, direction) => store().move(recipes, slug, direction),
    deleteRecipe: (slug) => store().remove(slug),
    restoreRecipe: (slug) => store().restore(slug),
    permanentlyDeleteRecipe: async (slug, title) => { store(); await permanentlyDeleteRecipe(slug, title); },
    getHistory: (slug) => store(false).history(slug),
    restoreVersion: (slug, id, version) => store().restoreVersion(slug, id, version),
  }}>{children}</RecipesContext.Provider>;
}
