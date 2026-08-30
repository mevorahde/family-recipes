import { createContext } from 'react';
import type { Recipe } from '../types';

export type NewRecipeInput = Omit<Recipe, 'slug'>;

export interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  addRecipe: (recipe: NewRecipeInput) => Promise<void>;
  updateRecipe: (slug: string, recipe: Partial<NewRecipeInput>) => Promise<void>;
  reorderRecipes: (slug: string, direction: 'up' | 'down') => Promise<void>;
  deleteRecipe: (slug: string) => Promise<void>;
}

export const RecipesContext = createContext<RecipesContextValue | undefined>(undefined);
