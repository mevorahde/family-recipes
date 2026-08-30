import { useState } from 'react';
import { prepareRecipeImage } from '../lib/image-import';
import { transcribeRecipeImage } from '../lib/family-features';
import { cleanRecipeText, type TextCleanup } from '../lib/recipe-text-cleanup';
import TextCleanupSummary from './TextCleanupSummary';

export default function ImageRecipeImporter({ disabled, onUseText, onBusyChange, onDraftChange, transcribe = transcribeRecipeImage }: {
  disabled: boolean;
  onUseText: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  onDraftChange: (hasDraft: boolean) => void;
  transcribe?: (base64: string) => Promise<string>;
}) {
  const [image, setImage] = useState<{ preview: string; imageBase64: string } | null>(null);
  const [text, setText] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('');
  const [cleanup, setCleanup] = useState<TextCleanup | null>(null);
  function working(value: boolean) { setBusy(value); onBusyChange(value); }
  async function choose(file?: File) {
    if (!file) return;
    working(true); setError(''); setStage('Opening photo…');
    setImage(null); setText(''); setHasResult(false); setCleanup(null); onDraftChange(true);
    try { setImage(await prepareRecipeImage(file)); setStage('Photo ready. It hasn’t been sent yet.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t open this photo.'); onDraftChange(false); }
    finally { working(false); }
  }
  async function read() {
    if (!image || busy) return;
    working(true); setError(''); setStage('Reading your photo… this can take a moment.');
    try {
      const cleaned = cleanRecipeText(await transcribe(image.imageBase64));
      setCleanup(cleaned); setText(cleaned.text); setHasResult(true); setStage('Text ready. Check it against the photo before adding it.');
    }
    catch (caught) { setStage(''); setError(caught instanceof Error ? caught.message : 'Couldn’t read this photo. Please try again.'); }
    finally { working(false); }
  }
  function clear() { setImage(null); setText(''); setHasResult(false); setCleanup(null); setError(''); setStage(''); onDraftChange(false); }
  return <section className="image-import import-section" aria-labelledby="image-import-heading" aria-busy={busy}>
    <h2 id="image-import-heading">Start with a photo</h2>
    <p>Use a clear photo or screenshot of a printed or handwritten recipe. Import one page at a time.</p>
    <label className="image-file-label">Recipe photo (JPG, PNG, WebP; up to 10 MB)
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled || Boolean(image)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file); }} />
    </label>
    <p className="import-privacy">Selecting a photo only previews it here. “Read photo” sends it to Google for text recognition. We don’t save the photo in the cookbook.</p>
    <p role="status">{stage}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {image && <>
      <img className="recipe-photo-preview" src={image.preview} alt="Selected recipe photo for checking the transcription" />
      <div className="recipe-form-actions">
        <button className="recipe-button" type="button" disabled={busy || disabled} onClick={() => void read()}>{busy ? 'Reading…' : text ? 'Read photo again' : 'Read photo'}</button>
        <button className="recipe-button" type="button" disabled={busy || disabled} onClick={clear}>Discard photo</button>
      </div>
      {hasResult && <div className="image-review">
        <h3>Check the recipe text</h3>
        <p>Handwriting can be misread. Double-check ingredient amounts, fractions, temperatures, and cooking times. Nothing is saved yet.</p>
        <TextCleanupSummary cleanup={cleanup} />
        <label>Text from the photo<textarea rows={12} spellCheck lang="en" value={text} disabled={busy || disabled} onChange={(event) => setText(event.target.value)} /></label>
        <button type="button" className="recipe-button recipe-button-primary" disabled={busy || disabled || !text.trim()} onClick={() => { onUseText(text.trim()); clear(); }}>Add text to recipe</button>
        <p>This adds to any recipe text you’ve already entered and suggests any missing details. Check the fields below, then save when ready.</p>
      </div>}
    </>}
  </section>;
}
