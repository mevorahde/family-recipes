import type { Address } from 'postal-mime';

export interface ImportedRecipe {
  title?: string;
  source?: string;
  content: string;
}

function htmlToText(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return document.body.textContent?.trim() ?? '';
}

function addressLabel(address?: Address) {
  if (!address) return undefined;
  if ('group' in address && address.group) {
    return address.group.map((mailbox) => mailbox.name || mailbox.address).join(', ');
  }
  return address.name || address.address;
}

function asText(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  return typeof value === 'string' ? value : undefined;
}

function jsonLdRecipe(data: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(data)) {
    return data.map(jsonLdRecipe).find(Boolean);
  }
  if (!data || typeof data !== 'object') return undefined;

  const item = data as Record<string, unknown>;
  const type = item['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return item;
  return jsonLdRecipe(item['@graph']);
}

function recipeMarkdown(recipe: Record<string, unknown>) {
  const ingredients = recipe.recipeIngredient;
  const instructions = recipe.recipeInstructions;
  const ingredientText = Array.isArray(ingredients)
    ? ingredients.map((ingredient) => `- ${asText(ingredient) ?? ''}`).join('\n')
    : asText(ingredients);
  const instructionText = Array.isArray(instructions)
    ? instructions
        .map((instruction) => {
          if (typeof instruction === 'string') return instruction;
          if (instruction && typeof instruction === 'object') {
            return asText((instruction as Record<string, unknown>).text) ?? '';
          }
          return '';
        })
        .filter(Boolean)
        .map((instruction, index) => `${index + 1}. ${instruction}`)
        .join('\n')
    : asText(instructions);

  return [ingredientText && `## Ingredients\n\n${ingredientText}`, instructionText && `## Instructions\n\n${instructionText}`]
    .filter(Boolean)
    .join('\n\n');
}

export async function importRecipeFile(file: File): Promise<ImportedRecipe> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { title: file.name.replace(/\.docx$/i, ''), content: result.value.trim() };
  }

  if (extension === 'eml') {
    const { default: PostalMime } = await import('postal-mime');
    const email = await PostalMime.parse(await file.arrayBuffer());
    return {
      title: email.subject,
      source: addressLabel(email.from),
      content: (email.text || (email.html && htmlToText(email.html)) || '').trim(),
    };
  }

  if (extension === 'msg') {
    const { default: MsgReader } = await import('@kenjiuno/msgreader');
    const message = new MsgReader(await file.arrayBuffer()).getFileData();
    return {
      title: message.subject,
      source: message.senderName || message.senderSmtpAddress || message.senderEmail,
      content: (message.body || (message.bodyHtml && htmlToText(message.bodyHtml)) || '').trim(),
    };
  }

  throw new Error('Choose a Word (.docx), saved email (.eml or .msg) file.');
}

export async function importRecipeUrl(url: string): Promise<ImportedRecipe> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The recipe page could not be loaded.');

  const document = new DOMParser().parseFromString(await response.text(), 'text/html');
  const recipes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .flatMap((script) => {
      try {
        return [jsonLdRecipe(JSON.parse(script.textContent ?? ''))];
      } catch {
        return [];
      }
    })
    .filter((recipe): recipe is Record<string, unknown> => Boolean(recipe));
  const recipe = recipes[0];
  if (!recipe) throw new Error('No recipe data was found on that page.');

  const content = recipeMarkdown(recipe);
  if (!content) throw new Error('That recipe page did not include ingredients or instructions to import.');
  return { title: asText(recipe.name), source: url, content };
}