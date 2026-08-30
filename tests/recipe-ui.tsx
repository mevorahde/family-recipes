// Local, in-memory UI fixture. Never connects to Firebase or writes family recipes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthContext } from '../src/context/auth-context';
import { RecipesContext } from '../src/context/recipes-context';
import { mergeRecipes, planRecipeMove } from '../src/lib/shared-recipes';
import type { Recipe } from '../src/types';
import RecipeDetail from '../src/pages/RecipeDetail';
import Home from '../src/pages/Home';
import '../src/index.css';

const initial: Recipe[] = [
  { slug: 'apple-cake', title: 'Grandma’s apple cake', category: 'Desserts', tags: ['baking'], servings: '8', source: 'Grandma’s recipe box', content: '## Ingredients\n- 3 apples\n- 2 cups flour\n\n## Method\nFold together and bake until golden.', order: 0 },
  { slug: 'bread', title: 'Sunday table bread', category: 'Baking', tags: ['baking'], content: '## Method\nKnead, rest, and bake.', order: 1 },
  { slug: 'soup', title: 'Garden soup', category: 'Dinner', tags: [], content: '## Method\nSimmer gently and share.', order: 2 },
];

export default function Fixture() {
  const [recipes, setRecipes] = useState(initial);
  const [signedIn, setSignedIn] = useState(true);
  const [fail, setFail] = useState(false);
  async function simulateWrite() {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (fail) throw new Error('Simulated permission failure');
  }
  return <>
    <aside style={{ padding: 12, background: '#fff', borderBottom: '1px solid #ddd' }}>
      Local test data only · <label><input type="checkbox" checked={signedIn} onChange={(event) => setSignedIn(event.target.checked)} /> Signed in</label>{' '}
      <label><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} /> Simulate failed writes</label>
    </aside>
    <AuthContext.Provider value={{ user: signedIn ? { uid: 'local-test-user' } as User : null, loading: false, signIn: async () => {}, signOut: async () => {} }}>
      <RecipesContext.Provider value={{
        recipes, loading: false, addRecipe: async () => {},
        updateRecipe: async (slug, fields) => {
          await simulateWrite();
          setRecipes((current) => current.map((recipe) => recipe.slug === slug ? { ...recipe, ...fields } : recipe));
        },
        reorderRecipes: async (slug, direction) => {
          await simulateWrite();
          setRecipes((current) => mergeRecipes(current, planRecipeMove(current, slug, direction).map(({ recipe, order }) => ({ ...recipe, order }))));
        },
        deleteRecipe: async (slug) => {
          await simulateWrite();
          setRecipes((current) => current.filter((recipe) => recipe.slug !== slug));
        },
      }}>
        <HashRouter><Routes><Route path="/" element={<Home />} /><Route path="/recipe/:slug" element={<RecipeDetail />} /></Routes></HashRouter>
      </RecipesContext.Provider>
    </AuthContext.Provider>
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
