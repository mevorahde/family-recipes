import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useContext, useState } from 'react';
import { NavigationContext } from '../context/navigation-context';
import { useRecipes } from '../context/useRecipes';

export default function NavBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { canManage } = useRecipes();
  const guard = useContext(NavigationContext);
  const [error, setError] = useState('');

  async function handleSignOut() {
    if (!await guard.confirmLeave()) return;
    try {
      await signOut();
      guard.setDirty(false);
      navigate('/');
    } catch { setError('Couldn’t sign out. Please try again.'); }
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Family Recipes
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            {canManage && <><Link to="/add-recipe">Add Recipe</Link><Link to="/recently-deleted">Recently deleted</Link></>}
            <span className="nav-user">{user.email}</span>
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/login">Sign In</Link>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </nav>
  );
}
