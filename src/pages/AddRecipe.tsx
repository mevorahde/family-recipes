import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../context/navigation-context';
import { useRecipes } from '../context/useRecipes';
import { importRecipeFile, importRecipeUrl, type ImportedRecipe } from '../lib/recipe-import';
import ImageRecipeImporter from '../components/ImageRecipeImporter';
import { detailLabels, emptyDetailSuggestions, type RecipeDetails } from '../lib/recipe-suggestions';

export default function AddRecipe({ transcribePhoto }: { transcribePhoto?: (base64: string) => Promise<string> } = {}) {
  const { addRecipe, ready } = useRecipes();
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
  const [imageBusy, setImageBusy] = useState(false);
  const [imageDraft, setImageDraft] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState('');
  const guard = useUnsavedChanges([title, category, tags, servings, prepTime, cookTime, source, content, importUrl].some(Boolean) || importing || imageBusy || imageDraft);

  function applyImport(recipe: ImportedRecipe) {
    if (recipe.title) setTitle(recipe.title);
    if (recipe.category) setCategory(recipe.category);
    if (recipe.tags) setTags(recipe.tags);
    if (recipe.servings) setServings(recipe.servings);
    if (recipe.prepTime) setPrepTime(recipe.prepTime);
    if (recipe.cookTime) setCookTime(recipe.cookTime);
    if (recipe.source) setSource(recipe.source);
    setContent(recipe.content);
  }

  function fillDetails(text: string) {
    const suggestions = emptyDetailSuggestions({ title, category, tags, servings, prepTime, cookTime, source }, text);
    const setters = { title: setTitle, category: setCategory, tags: setTags, servings: setServings, prepTime: setPrepTime, cookTime: setCookTime, source: setSource };
    const fields = Object.keys(suggestions) as (keyof RecipeDetails)[];
    for (const field of fields) setters[field](suggestions[field]!);
    setDetailsMessage(fields.length
      ? `Suggested ${fields.map((field) => detailLabels[field]).join(', ')}. Please check them below. Your existing details and recipe text were kept.`
      : 'No additional details found for the empty fields. You can enter them yourself; nothing was changed.');
  }

  function addPhotoText(text: string) {
    const combined = content.trim() ? `${content}\n\n${text}` : text;
    setContent(combined);
    fillDetails(combined);
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
    if (submitting || importing || imageBusy || !ready) return;
    if (imageDraft) { setError('Add the reviewed photo text to the recipe, or discard the photo, before saving.'); return; }
    if (!title.trim() || !content.trim()) { setError('Please add a title and recipe before saving.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await addRecipe({
        title: title.trim(),
        category: category.trim() || 'Uncategorized',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        servings: servings || undefined,
        prepTime: prepTime || undefined,
        cookTime: cookTime || undefined,
        source: source || undefined,
        content,
      });
      guard.markSaved();
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the recipe. Your draft is still here.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Add a Recipe</h1>
      <ImageRecipeImporter disabled={submitting || importing || !ready} onBusyChange={setImageBusy} onDraftChange={setImageDraft} onUseText={addPhotoText} transcribe={transcribePhoto} />
      <form className="form" onSubmit={handleSubmit}>
        <fieldset disabled={submitting || importing || imageBusy} className="recipe-form-fields">
        <legend className="visually-hidden">New recipe details</legend>
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
        <section className="import-section" aria-labelledby="suggest-details-heading">
          <h2 id="suggest-details-heading">A little help with the details</h2>
          <p>Use the recipe text to suggest a title, category, and tags. Servings, times, and source are filled only when clearly stated. Existing fields are never replaced.</p>
          <button type="button" onClick={() => fillDetails(content)} disabled={!content.trim()}>Fill empty details from text</button>
          <p>Suggestions are made on this device. Check or change them before saving; categories and tags are suggestions, not dietary advice.</p>
          <p role="status">{detailsMessage}</p>
        </section>
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
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || importing || !ready}>
          {submitting ? 'Saving…' : 'Save Recipe'}
        </button>
        </fieldset>
      </form>
    </div>
  );
}
