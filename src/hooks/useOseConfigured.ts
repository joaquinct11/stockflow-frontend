import { useEffect, useState } from 'react';
import { onboardingService } from '../services/onboarding.service';
import { useAuthStore } from '../store/authStore';

function fetchOseStatus(set: (v: boolean) => void) {
  onboardingService.getProgreso()
    .then(data => {
      const paso = data.pasos.find((p: { id: string; completado: boolean }) => p.id === 'facturacion');
      set(paso?.completado ?? true);
    })
    .catch(() => { /* mantener estado actual en error */ });
}

export function useOseConfigured() {
  const { user } = useAuthStore();
  const [oseConfigured, setOseConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.rol !== 'ADMIN') { queueMicrotask(() => setOseConfigured(true)); return; }
    fetchOseStatus(setOseConfigured);
  }, [user?.rol]);

  // Cuando no está habilitado, re-verificar al volver al tab (el usuario puede haber activado
  // la facturación electrónica desde WhatsApp y vuelto a la app sin recargar).
  useEffect(() => {
    if (oseConfigured !== false) return;
    const handler = () => fetchOseStatus(setOseConfigured);
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [oseConfigured]);

  return oseConfigured;
}
