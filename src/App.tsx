import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipe/:slug" element={<RecipeDetail />} />
      </Routes>
    </HashRouter>
  )
}

export default App
