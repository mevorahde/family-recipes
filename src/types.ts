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
  // present only for recipes added via the site (stored in Firestore)
  createdBy?: string;
  createdByEmail?: string;
}
