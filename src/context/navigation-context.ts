import { createContext, useContext, useEffect } from 'react';

export const NavigationContext = createContext<{ setDirty: (dirty: boolean) => void; confirmLeave: () => Promise<boolean> }>({
  setDirty: (_dirty: boolean) => { void _dirty; },
  confirmLeave: async () => true,
});

export function useUnsavedChanges(dirty: boolean) {
  const guard = useContext(NavigationContext);
  useEffect(() => {
    guard.setDirty(dirty);
    return () => guard.setDirty(false);
  }, [dirty, guard]);
  return { markSaved: () => guard.setDirty(false), confirmLeave: guard.confirmLeave };
}
