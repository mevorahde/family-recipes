// Isolated UI fixture: no Firebase reads or writes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthContext } from '../src/context/auth-context';
import { RecipesContext } from '../src/context/recipes-context';
import { NavigationGuard } from '../src/context/NavigationGuard';
import { mergeRecipes, planRecipeMove } from '../src/lib/shared-recipes';
import type { Recipe, RecipeVersion, DeletedRecipe } from '../src/types';
import RecipeDetail from '../src/pages/RecipeDetail';
import RecentlyDeleted from '../src/pages/RecentlyDeleted';
import AddRecipe from '../src/pages/AddRecipe';
import Home from '../src/pages/Home';
import NavBar from '../src/components/NavBar';
import SyncStatus from '../src/components/SyncStatus';
import ProtectedRoute from '../src/components/ProtectedRoute';
import '../src/index.css';

const initial: Recipe[] = [
  { slug: 'apple-cake', title: 'Grandma’s apple cake', category: 'Desserts', tags: ['baking'], servings: '8', source: 'Grandma’s recipe box', content: '## Ingredients\n- 3 apples\n- 2 cups flour\n\n## Method\nFold together and bake until golden.', order: 0 },
  { slug: 'bread', title: 'Sunday table bread', category: 'Baking', tags: ['baking'], content: '## Method\nKnead, rest, and bake.', order: 1 },
  { slug: 'soup', title: 'Garden soup', category: 'Dinner', tags: [], content: '## Method\nSimmer gently and share.', order: 2 },
];

export default function Fixture() {
  const [recipes, setRecipes] = useState(initial);
  const [signedIn, setSignedIn] = useState(true);
  const [invited, setInvited] = useState(true);
  const [fail, setFail] = useState(false);
  const [offline, setOffline] = useState(false);
  const [trash, setTrash] = useState<DeletedRecipe[]>([]);
  const [history, setHistory] = useState<Record<string, RecipeVersion[]>>({});
  async function simulateWrite() {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (fail) throw new Error('Couldn’t save. Your draft is still here—please try again.');
  }
  function remember(recipe: Recipe, action: string) {
    setHistory((current) => ({ ...current, [recipe.slug]: [{ recipe, id: crypto.randomUUID(), action, recordedAt: Date.now() }, ...current[recipe.slug] ?? []] }));
  }
  return <>
    <aside className="fixture-controls" style={{ padding: 12, background: '#fff', borderBottom: '1px solid #ddd' }}>
      Local test data only · <label><input type="checkbox" checked={signedIn} onChange={(event) => setSignedIn(event.target.checked)} /> Signed in</label>{' '}
      <label><input type="checkbox" checked={invited} onChange={(event) => setInvited(event.target.checked)} /> Invited</label>{' '}
      <label><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} /> Simulate failed writes</label>{' '}
      <label><input type="checkbox" checked={offline} onChange={(event) => setOffline(event.target.checked)} /> Offline</label>
    </aside>
    <AuthContext.Provider value={{ user: signedIn ? { uid: 'local-test-user' } as User : null, loading: false, signIn: async () => setSignedIn(true), signOut: async () => setSignedIn(false) }}>
      <RecipesContext.Provider value={{
        recipes, loading: false, canManage: signedIn && invited, accessLoading: false, ready: !offline,
        syncMessage: offline ? 'You’re offline. Changes can’t be saved yet.' : signedIn && !invited ? 'This account isn’t invited to change the cookbook.' : '',
        retry: () => {}, deletedRecipes: trash, trashLoading: false, trashError: '',
        addRecipe: async (fields) => { await simulateWrite(); setRecipes((current) => [...current, { ...fields, slug: crypto.randomUUID(), version: 1 }]); },
        updateRecipe: async (slug, fields, expected) => {
          await simulateWrite();
          const previous = recipes.find((recipe) => recipe.slug === slug)!;
          if ((previous.version ?? 0) !== expected) throw new Error('Recipe changed. Copy your draft before reopening.');
          remember(previous, 'edit');
          setRecipes((current) => current.map((recipe) => recipe.slug === slug ? { ...recipe, ...fields, version: expected + 1 } : recipe));
        },
        reorderRecipes: async (slug, direction) => {
          await simulateWrite();
          setRecipes((current) => mergeRecipes(current, planRecipeMove(current, slug, direction).map(({ recipe, order }) => ({ ...recipe, order }))));
        },
        deleteRecipe: async (slug) => {
          await simulateWrite();
          const previous = recipes.find((recipe) => recipe.slug === slug)!;
          remember(previous, 'delete');
          setTrash((current) => [...current, { recipe: previous, deletedAt: Date.now() }]);
          setRecipes((current) => current.filter((recipe) => recipe.slug !== slug));
        },
        restoreRecipe: async (slug) => {
          await simulateWrite();
          const deleted = trash.find((entry) => entry.recipe.slug === slug)!;
          setRecipes((current) => mergeRecipes(current, [deleted.recipe]));
          setTrash((current) => current.filter((entry) => entry.recipe.slug !== slug));
        },
        getHistory: async (slug) => { await simulateWrite(); return history[slug] ?? []; },
        restoreVersion: async (slug, id, expected) => {
          await simulateWrite();
          const previous = recipes.find((recipe) => recipe.slug === slug)!;
          remember(previous, 'restore-version');
          const restored = history[slug].find((entry) => entry.id === id)!.recipe;
          setRecipes((current) => current.map((recipe) => recipe.slug === slug ? { ...restored, order: recipe.order, version: expected + 1 } : recipe));
        },
      }}>
        <NavigationGuard><NavBar /><SyncStatus /><Outlet /></NavigationGuard>
      </RecipesContext.Provider>
    </AuthContext.Provider>
  </>;
}

const router = createHashRouter([{ element: <Fixture />, children: [
  { path: '/', element: <Home /> },
  { path: '/recipe/:slug', element: <RecipeDetail /> },
  { path: '/add-recipe', element: <ProtectedRoute><AddRecipe /></ProtectedRoute> },
  { path: '/recently-deleted', element: <ProtectedRoute><RecentlyDeleted /></ProtectedRoute> },
  { path: '/login', element: <p>Local sign-in fixture</p> },
]}]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
