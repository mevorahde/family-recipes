export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo. For an iPhone HEIC photo, export it as JPG first.');
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Choose a photo smaller than 10 MB.');
}

export async function prepareRecipeImage(file: File) {
  validateImageFile(file);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('This photo couldn’t be opened. Try a JPG or PNG copy.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('This photo is too large. Export a smaller copy first.');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo importing isn’t supported by this browser.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Re-encoding removes EXIF/location metadata before the explicit upload step.
    const preview = canvas.toDataURL('image/jpeg', 0.9);
    const imageBase64 = preview.split(',')[1];
    if (imageBase64.length > 4_000_000) throw new Error('This photo is still too large. Crop it to one recipe and try again.');
    return { preview, imageBase64 };
  } finally { bitmap.close(); }
}
