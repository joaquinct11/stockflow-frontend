import { useEffect, useState } from 'react';
import { onboardingService } from '../services/onboarding.service';
import { useAuthStore } from '../store/authStore';

export function useOseConfigured() {
  const { user } = useAuthStore();
  const [oseConfigured, setOseConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.rol !== 'ADMIN') { setOseConfigured(true); return; }
    onboardingService.getProgreso()
      .then(data => {
        const paso = data.pasos.find(p => p.id === 'facturacion');
        setOseConfigured(paso?.completado ?? true);
      })
      .catch(() => setOseConfigured(true));
  }, [user?.rol]);

  return oseConfigured;
}
