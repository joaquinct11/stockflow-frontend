import { useAuthStore } from '../store/authStore';

export type PlanId = 'BASICO' | 'PRO';

export interface PlanInfo {
  planId: PlanId;
  isBasico: boolean;
  isPro: boolean;
  limites: {
    usuarios: number;
    productos: number;
  };
}

const LIMITES_BASICO = { usuarios: 5,    productos: 2000 };
const LIMITES_PRO    = { usuarios: 15,   productos: 5000 };

export function usePlan(): PlanInfo {
  const { user } = useAuthStore();
  const rawPlanId = user?.suscripcion?.planId?.toUpperCase();
  const isPro     = rawPlanId === 'PRO';
  const planId    = isPro ? 'PRO' : 'BASICO';

  return {
    planId,
    isBasico: !isPro,
    isPro,
    limites: isPro ? LIMITES_PRO : LIMITES_BASICO,
  };
}
