import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './firebase';

export async function permanentlyDeleteRecipe(slug: string, confirmedTitle: string) {
  if (!functionsClient) throw new Error('Recipe deletion is unavailable.');
  await httpsCallable(functionsClient, 'permanentlyDeleteRecipe', { timeout: 130_000 })({ slug, confirmedTitle });
}

export async function transcribeRecipeImage(imageBase64: string): Promise<string> {
  if (!functionsClient) throw new Error('Photo importing is unavailable.');
  const result = await httpsCallable<{ imageBase64: string }, { content: string }>(functionsClient, 'importRecipeImage', { timeout: 70_000 })({ imageBase64 });
  return result.data.content;
}
