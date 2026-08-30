import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { NavigationContext } from './navigation-context';

export function NavigationGuard({ children }: { children: ReactNode }) {
  const dirty = useRef(false);
  const [request, setRequest] = useState<{ resolve: (leave: boolean) => void } | null>(null);
  const confirmLeave = useCallback(() => {
    if (!dirty.current) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => setRequest({ resolve }));
  }, []);
  const blocker = useBlocker(() => dirty.current);
  const dialog = useRef<HTMLDialogElement>(null);
  const showing = blocker.state === 'blocked' || request !== null;
  useEffect(() => {
    if (showing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showing]);
  function answer(leave: boolean) {
    if (request) { request.resolve(leave); setRequest(null); }
    else if (blocker.state === 'blocked') {
      if (leave) { dirty.current = false; blocker.proceed(); }
      else blocker.reset();
    }
  }
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  const value = useMemo(() => ({ setDirty: (value: boolean) => { dirty.current = value; }, confirmLeave }), [confirmLeave]);
  return <NavigationContext.Provider value={value}>
    {children}
    <dialog ref={dialog} className="unsaved-dialog" aria-labelledby="unsaved-title" onCancel={(event) => { event.preventDefault(); answer(false); }}>
      <h2 id="unsaved-title">Keep your recipe changes?</h2>
      <p>Your changes haven’t been saved yet.</p>
      <div className="recipe-form-actions">
        <button className="recipe-button recipe-button-primary" onClick={() => answer(false)}>Keep editing</button>
        <button className="recipe-button" onClick={() => answer(true)}>Leave without saving</button>
      </div>
    </dialog>
  </NavigationContext.Provider>;
}
