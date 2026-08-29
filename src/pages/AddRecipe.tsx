import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useRecipes } from '../context/useRecipes';
import { importRecipeFile, importRecipeUrl, type ImportedRecipe } from '../lib/recipe-import';

export default function AddRecipe() {
  const { user } = useAuth();
  const { addRecipe } = useRecipes();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  function applyImport(recipe: ImportedRecipe) {
    if (recipe.title) setTitle(recipe.title);
    if (recipe.source) setSource(recipe.source);
    setContent(recipe.content);
  }

  async function handleFileImport(file: File | undefined) {
    if (!file) return;

    setError(null);
    setImporting(true);
    try {
      applyImport(await importRecipeFile(file));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not import that file.');
    } finally {
      setImporting(false);
    }
  }

  async function handleUrlImport() {
    if (!importUrl.trim()) return;

    setError(null);
    setImporting(true);
    try {
      applyImport(await importRecipeUrl(importUrl.trim()));
    } catch {
      setError('Could not import that website. It may block browser access or not publish recipe data.');
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addRecipe({
        title,
        category: category || 'Uncategorized',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        servings: servings || undefined,
        prepTime: prepTime || undefined,
        cookTime: cookTime || undefined,
        source: source || undefined,
        content,
        createdByEmail: user?.email ?? undefined,
      });
      navigate('/');
    } catch {
      setError('Could not save the recipe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Add a Recipe</h1>
      <form className="form" onSubmit={handleSubmit}>
        <fieldset className="import-section" disabled={importing || submitting}>
          <legend>Import a recipe</legend>
          <label>
            Word document or saved email
            <input
              type="file"
              accept=".docx,.eml,.msg"
              onChange={(e) => void handleFileImport(e.target.files?.[0])}
            />
          </label>
          <div className="import-url">
            <label>
              Recipe website address
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/recipe"
              />
            </label>
            <button type="button" onClick={() => void handleUrlImport()} disabled={!importUrl.trim()}>
              {importing ? 'Importing…' : 'Import Website'}
            </button>
          </div>
        </fieldset>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Servings
            <input value={servings} onChange={(e) => setServings(e.target.value)} />
          </label>
          <label>
            Prep Time
            <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
          </label>
          <label>
            Cook Time
            <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
          </label>
        </div>
        <label>
          Source
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label>
          Recipe (Markdown supported — e.g. ## Ingredients, ## Instructions)
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Recipe'}
        </button>
      </form>
    </div>
  );
}
