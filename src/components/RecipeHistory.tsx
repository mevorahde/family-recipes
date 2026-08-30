import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRecipes } from '../context/useRecipes';
import type { RecipeVersion } from '../types';

export default function RecipeHistory({ slug, version, disabled }: { slug: string; version: number; disabled: boolean }) {
  const { getHistory, restoreVersion, ready } = useRecipes();
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    setBusy(true); setError(''); setOpen(true);
    try { setVersions(await getHistory(slug)); }
    catch { setError('Couldn’t load previous versions. Please try again.'); }
    finally { setBusy(false); }
  }
  async function restore(id: string) {
    if (!window.confirm('Use this previous version? The current version will also be kept.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await restoreVersion(slug, id, version); setVersions(await getHistory(slug)); setNotice('Previous version restored for everyone.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t restore that version.'); }
    finally { setBusy(false); }
  }
  return <section className="recipe-history">
    <button className="recipe-button" disabled={busy || disabled} onClick={() => open ? setOpen(false) : void load()}>{open ? 'Hide previous versions' : 'Previous versions'}</button>
    {open && <div>
      <h2>Previous versions</h2><p>Versions are saved before changes. Choose one to see what was written.</p>
      <p role="status">{busy ? 'Opening the recipe box…' : notice}</p>
      {error && <p className="error" role="alert">{error} <button disabled={busy} onClick={() => void load()}>Try again</button></p>}
      {!busy && !error && !versions.length && <p>No previous versions yet.</p>}
      {versions.map((item) => <details key={item.id}><summary>{item.recordedAt ? new Date(item.recordedAt).toLocaleString() : 'Earlier version'} — {item.recipe.title}</summary>
        <p>{item.recipe.category} · {item.recipe.tags.join(', ')}</p>
        <p>{[item.recipe.servings && `Serves ${item.recipe.servings}`, item.recipe.prepTime && `Prep: ${item.recipe.prepTime}`, item.recipe.cookTime && `Cook: ${item.recipe.cookTime}`, item.recipe.source && `From: ${item.recipe.source}`].filter(Boolean).join(' · ')}</p>
        <ReactMarkdown>{item.recipe.content}</ReactMarkdown>
        <button className="recipe-button" disabled={busy || disabled || !ready} onClick={() => void restore(item.id)}>Use this version</button>
      </details>)}
    </div>}
  </section>;
}
