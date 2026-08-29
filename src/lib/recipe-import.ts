import type { Address } from 'postal-mime';
import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './firebase';

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
  if (!functionsClient) throw new Error('Firebase is not configured; website imports are unavailable.');
  const importRecipe = httpsCallable<{ url: string }, ImportedRecipe>(functionsClient, 'importRecipeUrl');
  return (await importRecipe({ url })).data;
}