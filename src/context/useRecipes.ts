import { useContext } from 'react';
import { RecipesContext, type RecipesContextValue } from './recipes-context';

export function useRecipes(): RecipesContextValue {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipesProvider');
  }
  return context;
}
