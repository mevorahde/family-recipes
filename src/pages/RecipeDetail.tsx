import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/useAuth';
import { useRecipes } from '../context/useRecipes';

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { recipes, deleteRecipe } = useRecipes();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const recipe = slug ? recipes.find((r) => r.slug === slug) : undefined;

  async function handleDelete() {
    if (!recipe || !window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteRecipe(recipe.slug);
      navigate('/');
    } catch {
      setDeleteError('Could not delete the recipe. Please try again.');
      setDeleting(false);
    }
  }

  if (!recipe) {
    return (
      <div className="page">
        <p>Recipe not found.</p>
        <Link to="/">Back to all recipes</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back to all recipes
      </Link>
      <h1>{recipe.title}</h1>
      {user?.uid === recipe.createdBy && (
        <button type="button" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Recipe'}
        </button>
      )}
      {deleteError && <p className="error">{deleteError}</p>}
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
    </div>
  );
}
