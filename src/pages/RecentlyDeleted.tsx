import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../context/useRecipes';

export default function RecentlyDeleted() {
  const { deletedRecipes, trashLoading, trashError, restoreRecipe, ready, retry } = useRecipes();
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function restore(slug: string, title: string) {
    setPending(slug); setError(''); setMessage('');
    try { await restoreRecipe(slug); setMessage(`${title} is back in the cookbook.`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t restore this recipe. Please try again.'); }
    finally { setPending(''); }
  }
  return <main className="page">
    <Link to="/">← Back to all recipes</Link>
    <h1>Recently deleted</h1>
    <p>Changed your mind? Put a recipe back in the family cookbook. Recipes here are kept until restored.</p>
    <p role="status">{trashLoading ? 'Opening the recipe box…' : message}</p>
    {(error || trashError) && <p role="alert" className="error">{error || trashError} <button onClick={retry}>Try again</button></p>}
    {!trashLoading && !trashError && !deletedRecipes.length && <p>No deleted recipes to restore.</p>}
    <ul className="recovery-list">{deletedRecipes.map(({ recipe, deletedAt }) => <li key={recipe.slug}>
      <div><h2>{recipe.title}</h2><p>{deletedAt ? `Deleted ${new Date(deletedAt).toLocaleDateString()}` : 'Recently deleted'}</p></div>
      <button className="recipe-button" disabled={!ready || Boolean(pending)} onClick={() => void restore(recipe.slug, recipe.title)}>{pending === recipe.slug ? 'Restoring…' : 'Restore recipe'}</button>
    </li>)}</ul>
  </main>;
}
