import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/** Registra silenciosamente qual página o colaborador logado visitou, para a governança de acesso (ver /logs). */
export function useTrackVisit() {
  const { sessao } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!sessao) return;
    fetch('/api/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessao.token}`,
      },
      body: JSON.stringify({ caminho: location.pathname }),
    }).catch(() => {
      // Rastreamento é best-effort — nunca deve travar ou poluir a navegação do usuário.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, sessao?.token]);
}
