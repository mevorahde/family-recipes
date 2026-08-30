import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { purgeRecipe, requireFamily, reserveImageImport, validateImage } from './recipe-actions.js';

function database() { if (!getApps().length) initializeApp(); return getFirestore(); }

export const permanentlyDeleteRecipe = onCall({ region: 'us-central1', timeoutSeconds: 120, memory: '256MiB', maxInstances: 2 }, async (request) => {
  return purgeRecipe(database(), request.auth?.uid, request.data?.slug, request.data?.confirmedTitle);
});

export const importRecipeImage = onCall({ region: 'us-central1', timeoutSeconds: 60, memory: '512MiB', maxInstances: 2 }, async (request) => {
  const db = database();
  const uid = await requireFamily(db, request.auth?.uid);
  const content = validateImage(request.data?.imageBase64);
  await reserveImageImport(db, uid);
  // No image storage or payload logging. One feature, one image, no SDK retries:
  // every service attempt consumes one reserved slot, including failed attempts.
  const client = new ImageAnnotatorClient();
  try {
    const [batch] = await client.batchAnnotateImages({ requests: [{ image: { content }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }, { timeout: 45_000, retry: null });
    const result = batch.responses?.[0];
    if (!result) throw new HttpsError('unavailable', 'No response was received. Please try again.');
    if (result.error?.code) throw new HttpsError('unavailable', 'Photo reading is unavailable. Please try again later.');
    const text = result.fullTextAnnotation?.text?.trim();
    if (!text) throw new HttpsError('failed-precondition', 'No readable text was found. Try a sharper, well-lit photo.');
    if (text.length > 100_000) throw new HttpsError('invalid-argument', 'This image contains too much text. Import one recipe page at a time.');
    return { content: text };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'We couldn’t read this photo. Try a clear JPG or PNG, or try again later.');
  } finally { await client.close(); }
});
