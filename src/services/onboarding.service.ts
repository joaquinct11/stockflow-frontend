import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface PasoOnboarding {
  id: string;
  titulo: string;
  descripcion: string;
  completado: boolean;
  url: string | null;
  opcional: boolean;
}

export interface OnboardingProgreso {
  pasos: PasoOnboarding[];
  porcentaje: number;
  completado: boolean;
}

// ── Caché de deduplicación ────────────────────────────────────────────────────
// Evita que múltiples componentes (Dashboard, Checklist, OseBanner) lancen
// llamadas simultáneas al mismo endpoint. Si hay una petición en vuelo, todas
// comparten la misma Promise. El resultado se cachea 10s para cubrir re-renders
// y cambios de ruta rápidos; se invalida explícitamente cuando el usuario
// completa un paso del onboarding.
let _cache: { data: OnboardingProgreso; at: number } | null = null;
let _inFlight: Promise<OnboardingProgreso> | null = null;
const TTL = 10_000;

export const onboardingService = {
  getProgreso: (): Promise<OnboardingProgreso> => {
    if (_cache && Date.now() - _cache.at < TTL) return Promise.resolve(_cache.data);
    if (_inFlight) return _inFlight;
    _inFlight = axiosInstance
      .get<OnboardingProgreso>(API_ENDPOINTS.ONBOARDING.PROGRESO)
      .then(({ data }) => {
        _cache = { data, at: Date.now() };
        _inFlight = null;
        return data;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  invalidarCache: () => {
    _cache = null;
  },
};
