import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

/** Usado dentro de RequireAuth — bloqueia quem não é "master" (governança de acesso). */
export function RequireMaster({ children }: { children: ReactNode }) {
  const { sessao } = useAuth();

  if (sessao?.role !== 'master') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
