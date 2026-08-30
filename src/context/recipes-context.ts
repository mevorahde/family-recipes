import { createContext } from 'react';
import type { Recipe, RecipeVersion, DeletedRecipe } from '../types';

export type NewRecipeInput = Omit<Recipe, 'slug' | 'createdBy' | 'version' | 'order'>;

export interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  canManage: boolean;
  accessLoading: boolean;
  syncMessage: string;
  ready: boolean;
  retry: () => void;
  deletedRecipes: DeletedRecipe[];
  trashLoading: boolean;
  trashError: string;
  addRecipe: (recipe: NewRecipeInput) => Promise<void>;
  updateRecipe: (slug: string, recipe: Partial<NewRecipeInput>, expectedVersion: number) => Promise<void>;
  reorderRecipes: (slug: string, direction: 'up' | 'down') => Promise<void>;
  deleteRecipe: (slug: string) => Promise<void>;
  restoreRecipe: (slug: string) => Promise<void>;
  getHistory: (slug: string) => Promise<RecipeVersion[]>;
  restoreVersion: (slug: string, id: string, expectedVersion: number) => Promise<void>;
}

export const RecipesContext = createContext<RecipesContextValue | undefined>(undefined);
