import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useRecipes } from '../context/useRecipes';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { canManage, accessLoading } = useRecipes();

  if (loading || accessLoading) {
    return <div className="page">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canManage) return <div className="page">Only invited family members can change this cookbook.</div>;
  return <>{children}</>;
}
