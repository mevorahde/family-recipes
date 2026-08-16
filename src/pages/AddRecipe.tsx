import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useRecipes } from '../context/useRecipes';

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
