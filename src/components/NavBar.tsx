import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function NavBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Family Recipes
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/add-recipe">Add Recipe</Link>
            <span className="nav-user">{user.email}</span>
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/login">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
