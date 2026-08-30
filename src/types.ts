export interface Recipe {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  source?: string;
  content: string;
  order?: number;
  // present only for recipes added via the site (stored in Firestore)
  createdBy?: string;
  version?: number;
}

export interface RecipeVersion {
  id: string;
  recipe: Recipe;
  action: string;
  recordedAt: number;
}

export interface DeletedRecipe {
  recipe: Recipe;
  deletedAt: number;
}
