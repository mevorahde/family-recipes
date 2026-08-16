import { createContext } from 'react';
import type { Recipe } from '../types';

export type NewRecipeInput = Omit<Recipe, 'slug'>;

export interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  addRecipe: (recipe: NewRecipeInput) => Promise<void>;
}

export const RecipesContext = createContext<RecipesContextValue | undefined>(undefined);
