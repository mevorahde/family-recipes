import { useRecipes } from '../context/useRecipes';

export default function SyncStatus() {
  const { syncMessage, retry, loading } = useRecipes();
  if (!syncMessage) return null;
  return <aside className="sync-status" role="status">
    {syncMessage}{' '}
    {!loading && <button type="button" onClick={retry}>Try again</button>}
  </aside>;
}
