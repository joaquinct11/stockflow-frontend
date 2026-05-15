import { useAuthStore } from '../store/authStore';

export type PlanId = 'BASICO' | 'PRO';

export interface PlanInfo {
  planId: PlanId;
  isBasico: boolean;
  isPro: boolean;
  /** Límites del plan BÁSICO */
  limites: {
    usuarios: number;   // 3
    productos: number;  // 500
  };
}

const LIMITES_BASICO = { usuarios: 3, productos: 500 };

export function usePlan(): PlanInfo {
  const { user } = useAuthStore();
  const raw = user?.suscripcion?.planId?.toUpperCase() ?? 'BASICO';
  const planId = (raw === 'PRO' ? 'PRO' : 'BASICO') as PlanId;

  return {
    planId,
    isBasico: planId === 'BASICO',
    isPro:    planId === 'PRO',
    limites:  LIMITES_BASICO,
  };
}
