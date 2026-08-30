import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ImageRecipeImporter from '../src/components/ImageRecipeImporter';
import '../src/index.css';
export default function Fixture() {
  const [draft, setDraft] = useState('Existing family note.');
  const [calls, setCalls] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [fail, setFail] = useState(false);
  return <main className="page"><h1>Local photo-import test</h1><p>Fake transcription only. No image is sent to Google and no recipes are saved.</p>
    <label><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} /> Simulate reading failure</label>
    <p>Reading attempts: {calls} · {busy ? 'Busy' : 'Ready'} · {hasDraft ? 'Unsaved photo' : 'No pending photo'}</p>
    <ImageRecipeImporter disabled={false} onBusyChange={setBusy} onDraftChange={setHasDraft} onUseText={(text) => setDraft((current) => `${current}\n\n${text}`)} transcribe={async () => { setCalls((current) => current + 1); await new Promise((resolve) => setTimeout(resolve, 300)); if (fail) throw new Error('Couldn’t read this photo. Please try again.'); return 'SAMPLE INSURANCE\nPat Sample, Agent\nwww.example.com\nFried Rice\n2 eggs\n3 cups rice (defrosed)\nAdd choped onions'; }} />
    <label>Recipe draft<textarea rows={8} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
