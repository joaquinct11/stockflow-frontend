import { useAuthStore } from '../store/authStore';

export type PlanId = 'BASICO' | 'PRO';

export interface PlanInfo {
  planId: PlanId;
  isBasico: boolean;
  isPro: boolean;
  /** Límites del plan (plan único con todo incluido) */
  limites: {
    usuarios: number;
    productos: number;
  };
}

// Plan único — sin límites restrictivos
const LIMITES_BASICO = { usuarios: 9999, productos: 9999 };

export function usePlan(): PlanInfo {
  // Ignorar el planId del JWT — hay un solo plan con todo incluido.
  // isPro siempre true para que PlanGuard no bloquee ninguna funcionalidad.
  void useAuthStore(); // mantener la dependencia para compatibilidad futura

  return {
    planId:   'BASICO',
    isBasico: false,
    isPro:    true,
    limites:  LIMITES_BASICO,
  };
}
