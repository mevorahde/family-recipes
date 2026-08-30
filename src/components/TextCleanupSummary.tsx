import type { TextCleanup } from '../lib/recipe-text-cleanup';

export default function TextCleanupSummary({ cleanup }: { cleanup: TextCleanup | null }) {
  if (!cleanup) return null;
  const changed = cleanup.text !== cleanup.original;
  return <div className="text-cleanup-summary">
    <p role="status">{changed ? 'Text cleanup applied. Please review the changes before saving.' : 'No common spelling errors or clear letterhead found. Please check the text yourself.'}</p>
    {cleanup.removedHeaderLines > 0 && <p>Removed {cleanup.removedHeaderLines} leading letterhead lines above the recipe.</p>}
    {cleanup.corrections.length > 0 && <p>Spelling corrections: {cleanup.corrections.join('; ')}.</p>}
    <p>Only common spelling errors are corrected. Ingredient amounts, units, and cooking times are not guessed.</p>
    {changed && <details>
      <summary>Compare with original text</summary>
      <p>This is the text before cleanup. You can copy anything you want to keep back into the editor.</p>
      <label>Original text before cleanup<textarea readOnly rows={8} value={cleanup.original} /></label>
    </details>}
  </div>;
}
