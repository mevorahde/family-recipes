import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RecipesProvider } from './context/RecipesContext';
import { NavigationGuard } from './context/NavigationGuard';
import NavBar from './components/NavBar';
import SyncStatus from './components/SyncStatus';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import AddRecipe from './pages/AddRecipe';
import RecentlyDeleted from './pages/RecentlyDeleted';

const router = createHashRouter([{
  element: <AuthProvider><RecipesProvider><NavigationGuard><NavBar /><SyncStatus /><Outlet /></NavigationGuard></RecipesProvider></AuthProvider>,
  children: [
    { path: '/', element: <Home /> },
    { path: '/recipe/:slug', element: <RecipeDetail /> },
    { path: '/login', element: <Login /> },
    { path: '/add-recipe', element: <ProtectedRoute><AddRecipe /></ProtectedRoute> },
    { path: '/recently-deleted', element: <ProtectedRoute><RecentlyDeleted /></ProtectedRoute> },
  ],
}]);

export default function App() { return <RouterProvider router={router} />; }
