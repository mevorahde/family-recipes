import { load as loadYaml, FAILSAFE_SCHEMA } from 'js-yaml';
import type { Recipe } from '../types';

const files = import.meta.glob('../recipes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) {
    return { data: {}, content: raw };
  }
  const [, yamlBlock, content] = match;
  // FAILSAFE_SCHEMA disables custom/JS type tags, keeping parsing to plain scalars/maps/lists
  const data = (loadYaml(yamlBlock, { schema: FAILSAFE_SCHEMA }) as Record<string, unknown>) ?? {};
  return { data, content };
}

function slugify(fileName: string): string {
  return fileName.replace(/^.*\//, '').replace(/\.md$/, '');
}

export const recipes: Recipe[] = Object.entries(files)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    return {
      slug: slugify(path),
      title: (data.title as string) ?? slugify(path),
      category: (data.category as string) ?? 'Uncategorized',
      tags: (data.tags as string[]) ?? [],
      servings: data.servings as string | undefined,
      prepTime: data.prepTime as string | undefined,
      cookTime: data.cookTime as string | undefined,
      source: data.source as string | undefined,
      content,
    } satisfies Recipe;
  })
  .sort((a, b) => a.title.localeCompare(b.title));


export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.slug === slug);
}

export function getCategories(): string[] {
  return Array.from(new Set(recipes.map((recipe) => recipe.category))).sort();
}

export function getTags(): string[] {
  return Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort();
}
