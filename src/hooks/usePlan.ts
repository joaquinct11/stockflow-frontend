import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { segmentoFromPlanCodigo } from '../lib/segmentoInfo';

export type PlanId = 'BASICO' | 'PRO';

export interface PlanLimites {
  usuarios: number;
  productos: number;
  sucursales: number;
}

export interface PlanInfo {
  planId: PlanId;
  isBasico: boolean;
  isPro: boolean;
  limites: PlanLimites;
  loading: boolean;
  /** true cuando la API falló al resolver un plan con planCodigo; los límites mostrados son el fallback genérico */
  error: boolean;
  /**
   * Segmento comercial derivado de planCodigo (ej: "VETERINARIA", "FARMACIA_BOTICA").
   * null para suscripciones legado sin planCodigo; usar getSegmentoInfo(segmento) para features.
   */
  segmento: string | null;
}

export const LIMITES_BASICO: PlanLimites = { usuarios: 5,  productos: 2000, sucursales: 1 };
export const LIMITES_PRO: PlanLimites    = { usuarios: 15, productos: 5000, sucursales: 5 };

export function usePlan(): PlanInfo {
  const { user } = useAuthStore();
  const rawPlanId  = user?.suscripcion?.planId?.toUpperCase();
  const isPro      = rawPlanId === 'PRO';
  const planId     = isPro ? 'PRO' : 'BASICO';
  const planCodigo = user?.suscripcion?.planCodigo;
  const segmento   = segmentoFromPlanCodigo(planCodigo);

  const fallback = isPro ? LIMITES_PRO : LIMITES_BASICO;

  const [limites, setLimites] = useState<PlanLimites>(fallback);
  const [loading, setLoading] = useState<boolean>(!!planCodigo);
  const [error,   setError]   = useState<boolean>(false);

  useEffect(() => {
    if (!planCodigo) {
      // Suscripción legado: conservar límites históricos, sin error
      setLimites(fallback);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    authService.getPlanPorCodigo(planCodigo)
      .then(p => {
        setLimites({ usuarios: p.maxUsuarios, productos: p.maxProductos, sucursales: p.maxSucursales });
        setError(false);
      })
      .catch(() => {
        // No reemplazar silenciosamente: marcar error y conservar el fallback genérico
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [planCodigo, isPro]); // eslint-disable-line react-hooks/exhaustive-deps

  return { planId, isBasico: !isPro, isPro, limites, loading, error, segmento };
}
