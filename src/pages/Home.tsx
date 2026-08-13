import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { recipes, getCategories } from '../lib/recipes';

export default function Home() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...getCategories()], []);

  const filtered = recipes.filter((recipe) => {
    const matchesCategory = category === 'All' || recipe.category === category;
    const haystack = `${recipe.title} ${recipe.tags.join(' ')}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="page">
      <h1>Family Recipes</h1>
      <div className="controls">
        <input
          type="text"
          placeholder="Search by name or tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p>No recipes found.</p>
      ) : (
        <ul className="recipe-list">
          {filtered.map((recipe) => (
            <li key={recipe.slug} className="recipe-card">
              <Link to={`/recipe/${recipe.slug}`}>
                <h2>{recipe.title}</h2>
                <p className="category">{recipe.category}</p>
                {recipe.tags.length > 0 && (
                  <p className="tags">{recipe.tags.join(', ')}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
