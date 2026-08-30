import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../context/useRecipes';

export default function RecentlyDeleted() {
  const { deletedRecipes, trashLoading, trashError, restoreRecipe, permanentlyDeleteRecipe, ready, retry } = useRecipes();
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ slug: string; title: string } | null>(null);
  const [understood, setUnderstood] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (confirm) dialog.current?.showModal(); else dialog.current?.close(); }, [confirm]);
  async function purge() {
    if (!confirm || !understood || pending) return;
    setPending(confirm.slug); setError(''); setMessage('');
    try { await permanentlyDeleteRecipe(confirm.slug, confirm.title); setMessage(`${confirm.title} and its saved versions were permanently deleted.`); setConfirm(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Deletion could not finish. Please try again.'); }
    finally { setPending(''); }
  }
  async function restore(slug: string, title: string) {
    setPending(slug); setError(''); setMessage('');
    try { await restoreRecipe(slug); setMessage(`${title} is back in the cookbook.`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t restore this recipe. Please try again.'); }
    finally { setPending(''); }
  }
  return <main className="page">
    <Link to="/">← Back to all recipes</Link>
    <h1>Recently deleted</h1>
    <p>Changed your mind? Restore a recipe, or permanently delete it when you’re sure you no longer need it.</p>
    <p role="status">{trashLoading ? 'Opening the recipe box…' : message}</p>
    {(error || trashError) && <p role="alert" className="error">{error || trashError} <button onClick={retry}>Try again</button></p>}
    {!trashLoading && !trashError && !deletedRecipes.length && <p>No deleted recipes to restore.</p>}
    <ul className="recovery-list">{deletedRecipes.map(({ recipe, deletedAt, purging }) => <li key={recipe.slug}>
      <div><h2>{recipe.title}</h2><p>{deletedAt ? `Deleted ${new Date(deletedAt).toLocaleDateString()}` : 'Recently deleted'}</p></div>
      <div className="recovery-actions">
        <button className="recipe-button" disabled={!ready || Boolean(pending) || purging} onClick={() => void restore(recipe.slug, recipe.title)}>{pending === recipe.slug && !confirm ? 'Restoring…' : 'Restore recipe'}</button>
        <button className="recipe-button recipe-button-delete" disabled={!ready || Boolean(pending)} onClick={() => { setError(''); setUnderstood(false); setConfirm({ slug: recipe.slug, title: recipe.title }); }}>{purging ? 'Finish permanent deletion' : 'Delete permanently'}</button>
      </div>
    </li>)}</ul>
    <dialog ref={dialog} className="unsaved-dialog" aria-labelledby="purge-title" onCancel={(event) => { event.preventDefault(); if (!pending) setConfirm(null); }}>
      <h2 id="purge-title">Permanently delete this recipe?</h2>
      <p><strong>{confirm?.title}</strong></p>
      <p>This removes its recovery copy and all saved versions. It cannot be undone in the app.</p>
      <p>Existing private backups, original bundled recipe files, and Git history are not erased.</p>
      <label><input type="checkbox" checked={understood} disabled={Boolean(pending)} onChange={(event) => setUnderstood(event.target.checked)} /> I understand this cannot be undone.</label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="recipe-form-actions">
        <button type="button" className="recipe-button" disabled={Boolean(pending)} onClick={() => setConfirm(null)}>Keep recipe</button>
        <button type="button" className="recipe-button recipe-button-delete" disabled={!understood || !ready || Boolean(pending)} onClick={() => void purge()}>{pending ? 'Deleting permanently…' : 'Delete permanently'}</button>
      </div>
    </dialog>
  </main>;
}
