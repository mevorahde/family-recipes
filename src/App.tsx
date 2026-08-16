import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RecipesProvider } from './context/RecipesContext'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'
import Login from './pages/Login'
import AddRecipe from './pages/AddRecipe'

function App() {
  return (
    <AuthProvider>
      <RecipesProvider>
        <HashRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipe/:slug" element={<RecipeDetail />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/add-recipe"
              element={
                <ProtectedRoute>
                  <AddRecipe />
                </ProtectedRoute>
              }
            />
          </Routes>
        </HashRouter>
      </RecipesProvider>
    </AuthProvider>
  )
}

export default App
