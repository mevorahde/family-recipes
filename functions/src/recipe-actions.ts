import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export async function requireFamily(db: Firestore, uid?: string) {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  if ((await db.doc(`members/${uid}`).get()).data()?.enabled !== true) {
    throw new HttpsError('permission-denied', 'Only invited family members can do this.');
  }
  return uid;
}

export function validatePurgeInput(slug: unknown, title: unknown) {
  if (typeof slug !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(slug) || typeof title !== 'string' || !title || title.length > 500) {
    throw new HttpsError('invalid-argument', 'Choose a deleted recipe and confirm its title.');
  }
  return { slug, title };
}

export async function purgeRecipe(db: Firestore, uid: string | undefined, slugValue: unknown, titleValue: unknown) {
  await requireFamily(db, uid);
  const { slug, title } = validatePurgeInput(slugValue, titleValue);
  const recipeRef = db.doc(`recipes/${slug}`);
  const trashRef = db.doc(`recipeTrash/${slug}`);
  // Freeze this slug before removing history. An interrupted purge can be retried;
  // no browser can restore or edit it halfway through cleanup.
  await db.runTransaction(async (tx) => {
    const [recipe, trash] = await Promise.all([tx.get(recipeRef), tx.get(trashRef)]);
    if (!recipe.data()?.deleted || (!trash.exists && !recipe.data()?.purged)) {
      throw new HttpsError('failed-precondition', 'Only recipes in Recently deleted can be permanently deleted.');
    }
    if (trash.exists && trash.data()?.recipe?.title !== title) {
      throw new HttpsError('failed-precondition', 'The recipe changed. Reopen Recently deleted and try again.');
    }
    if (!recipe.data()?.purged) {
      tx.set(recipeRef, { deleted: true, purged: true, version: Number(recipe.data()?.version ?? 0) + 1 });
    }
    if (trash.exists) tx.update(trashRef, { purging: true });
  });
  const versions = db.collection(`recipeHistory/${slug}/versions`);
  // Bound each batch; retry resumes safely even for large histories.
  for (;;) {
    const batch = await versions.limit(400).get();
    if (batch.empty) break;
    const writes = db.batch();
    for (const version of batch.docs) writes.delete(version.ref);
    await writes.commit();
  }
  await trashRef.delete();
  // Keep a content-free marker: bundled markdown must never reappear on reload.
  return { deleted: true };
}

export function validateImage(base64: unknown) {
  if (typeof base64 !== 'string' || base64.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new HttpsError('invalid-argument', 'Choose a smaller JPG, PNG, or WebP image.');
  }
  const bytes = Buffer.from(base64, 'base64');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!jpeg && !png && !webp) throw new HttpsError('invalid-argument', 'That file is not a supported image.');
  return bytes;
}

export async function reserveImageImport(db: Firestore, uid: string, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  const day = now.toISOString().slice(0, 10);
  const monthly = db.doc(`imageImportUsage/month-${month}`);
  const daily = db.doc(`imageImportUsage/day-${day}-${uid}`);
  await db.runTransaction(async (tx) => {
    const [total, personal] = await Promise.all([tx.get(monthly), tx.get(daily)]);
    const totalCount = Number(total.data()?.count ?? 0);
    const personalCount = Number(personal.data()?.count ?? 0);
    if (totalCount >= 100 || personalCount >= 20) throw new HttpsError('resource-exhausted', 'The photo import limit has been reached. Try another day or month, or type the recipe instead.');
    tx.set(monthly, { count: totalCount + 1, updatedAt: FieldValue.serverTimestamp() });
    tx.set(daily, { count: personalCount + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}
