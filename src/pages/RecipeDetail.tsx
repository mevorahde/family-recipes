import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useRecipes } from '../context/useRecipes';
import { useUnsavedChanges } from '../context/navigation-context';
import RecipeHistory from '../components/RecipeHistory';
import { recipeVersion } from '../lib/shared-recipes';
import type { Recipe } from '../types';

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  return <RecipeDetailContent key={slug} slug={slug} />;
}

function RecipeDetailContent({ slug }: { slug: string | undefined }) {
  const { recipes, loading, canManage, ready, deleteRecipe, reorderRecipes, updateRecipe } = useRecipes();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<'save' | 'delete' | 'up' | 'down' | null>(null);
  const [editing, setEditing] = useState(false);
  const [baseline, setBaseline] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  const [draftRecipe, setDraftRecipe] = useState<Recipe | undefined>();
  const [form, setForm] = useState({
    title: '',
    category: '',
    tags: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    source: '',
    content: '',
  });
  const liveRecipe = slug ? recipes.find((r) => r.slug === slug) : undefined;
  const recipe = liveRecipe ?? (editing ? draftRecipe : undefined);
  const guard = useUnsavedChanges(editing && JSON.stringify(form) !== baseline);
  const busy = pending !== null;

  const index = useMemo(
    () => (recipe ? recipes.findIndex((current) => current.slug === recipe.slug) : -1),
    [recipe, recipes],
  );

  function startEditing() {
    if (!recipe || busy) return;
    setError(null);
    setNotice('');
    const nextForm = {
      title: recipe.title,
      category: recipe.category,
      tags: recipe.tags.join(', '),
      servings: recipe.servings ?? '',
      prepTime: recipe.prepTime ?? '',
      cookTime: recipe.cookTime ?? '',
      source: recipe.source ?? '',
      content: recipe.content,
    };
    setForm(nextForm);
    setBaseline(JSON.stringify(nextForm));
    setEditVersion(recipeVersion(recipe));
    setDraftRecipe(recipe);
    setEditing(true);
  }

  async function handleDelete() {
    if (!recipe || !canManage || busy || !window.confirm(`Move "${recipe.title}" to Recently deleted? You can restore it later.`)) return;

    setError(null);
    setNotice('');
    setPending('delete');
    try {
      await deleteRecipe(recipe.slug);
      navigate('/');
    } catch {
      setError('We couldn’t delete this recipe. Please try again.');
    } finally {
      setPending(null);
    }
  }

  async function handleMove(direction: 'up' | 'down') {
    if (!recipe || !canManage || busy) return;
    setError(null);
    setNotice('');
    setPending(direction);
    try {
      await reorderRecipes(recipe.slug, direction);
      setNotice(`Moved ${direction} in our family cookbook.`);
    } catch {
      setError('We couldn’t move this recipe. Please refresh and try again.');
    } finally {
      setPending(null);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipe || !canManage || busy) return;
    if (!form.title.trim() || !form.content.trim()) {
      setError('Please add a title and recipe before saving.');
      return;
    }

    setError(null);
    setNotice('');
    setPending('save');
    try {
      await updateRecipe(recipe.slug, {
        title: form.title.trim(),
        category: form.category.trim() || 'Uncategorized',
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        servings: form.servings.trim(),
        prepTime: form.prepTime.trim(),
        cookTime: form.cookTime.trim(),
        source: form.source.trim(),
        content: form.content,
      }, editVersion);
      guard.markSaved();
      setEditing(false);
      setNotice('Changes saved for everyone.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We couldn’t save your changes. Your edits are still here—please try again.');
    } finally {
      setPending(null);
    }
  }

  if (!recipe) {
    return (
      <div className="page">
        <p role="status">{loading ? 'Opening the cookbook…' : 'Recipe not found.'}</p>
        <Link to="/">Back to all recipes</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back to all recipes
      </Link>
      {!editing && <button className="recipe-button print-button" type="button" onClick={() => window.print()}>Print recipe</button>}
      {canManage && (
        <section className="recipe-tools" aria-labelledby="recipe-tools-heading" aria-busy={busy}>
          <div className="recipe-tools-intro">
            <div>
              <h2 id="recipe-tools-heading">Our family cookbook</h2>
              <p>A little care keeps our recipes worth passing down. Changes are shared with everyone.</p>
            </div>
            <span className="recipe-position">Recipe {index + 1} of {recipes.length}</span>
          </div>
          <div className="recipe-tools-actions">
            <button className="recipe-button recipe-button-primary" type="button" onClick={startEditing} disabled={busy || editing || loading || !ready}>
              <span aria-hidden="true">✎</span> {editing ? 'Editing recipe' : 'Edit recipe'}
            </button>
            <div className="recipe-order" role="group" aria-label="Recipe order in the full cookbook">
              <span className="recipe-order-label">In the cookbook</span>
              <div className="recipe-order-buttons">
                <button className="recipe-button" type="button" onClick={() => void handleMove('up')} disabled={busy || editing || loading || !ready || index <= 0}>
                  <span aria-hidden="true">↑</span> {pending === 'up' ? 'Moving…' : 'Move up'}
                </button>
                <button className="recipe-button" type="button" onClick={() => void handleMove('down')} disabled={busy || editing || loading || !ready || index < 0 || index >= recipes.length - 1}>
                  <span aria-hidden="true">↓</span> {pending === 'down' ? 'Moving…' : 'Move down'}
                </button>
              </div>
            </div>
            <button className="recipe-button recipe-button-delete" type="button" onClick={handleDelete} disabled={busy || editing || loading || !ready}>
              {pending === 'delete' ? 'Deleting…' : 'Delete recipe'}
            </button>
          </div>
        </section>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="recipe-notice" role="status">{notice}</p>
      {!editing || !canManage ? (
        <section className="print-recipe">
          <h1>{recipe.title}</h1>
          <div className="meta">
            <span>{recipe.category}</span>
            {recipe.servings && <span>Serves {recipe.servings}</span>}
            {recipe.prepTime && <span>Prep: {recipe.prepTime}</span>}
            {recipe.cookTime && <span>Cook: {recipe.cookTime}</span>}
            {recipe.source && <span>From: {recipe.source}</span>}
          </div>
          <article className="recipe-content">
            <ReactMarkdown>{recipe.content}</ReactMarkdown>
          </article>
        </section>
      ) : (
        <form className="form recipe-edit-form" onSubmit={handleSave} aria-busy={pending === 'save'}>
          <h1>Edit recipe</h1>
          <p className="recipe-edit-note">Keep the memories, add your notes. Your updates will appear in everyone’s cookbook.</p>
          {!liveRecipe && <p className="error" role="alert">This recipe was deleted while you were editing. Your draft is still here to copy. Restore the recipe before editing it again.</p>}
          <fieldset disabled={busy}>
          <legend className="visually-hidden">Recipe details</legend>
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            Category
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label>
            Tags (comma separated)
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </label>
          <div className="form-row">
            <label>
              Servings
              <input value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} />
            </label>
            <label>
              Prep Time
              <input value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} />
            </label>
            <label>
              Cook Time
              <input value={form.cookTime} onChange={(e) => setForm({ ...form, cookTime: e.target.value })} />
            </label>
          </div>
          <label>
            Source
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </label>
          <label>
            Recipe (Markdown supported)
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={14}
              required
            />
          </label>
          <div className="recipe-form-actions">
            <button className="recipe-button recipe-button-primary" type="submit" disabled={!ready}>{pending === 'save' ? 'Saving…' : 'Save changes'}</button>
            <button className="recipe-button" type="button" onClick={async () => { if (await guard.confirmLeave()) { guard.markSaved(); setEditing(false); setError(null); } }}>
              Cancel
            </button>
          </div>
          </fieldset>
        </form>
      )}
      {canManage && !editing && <RecipeHistory slug={recipe.slug} version={recipeVersion(recipe)} disabled={busy} />}
    </div>
  );
}
