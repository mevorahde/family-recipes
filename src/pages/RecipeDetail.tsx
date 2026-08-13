import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getRecipeBySlug } from '../lib/recipes';

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const recipe = slug ? getRecipeBySlug(slug) : undefined;

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
