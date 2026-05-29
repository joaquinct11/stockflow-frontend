import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface CulqiConfigResponse {
  publicKey: string;
  planId: string;
  precioMensual: number;
  nombrePlan: string;
}

export interface CulqiSuscribirRequest {
  tokenId: string;
  planId?: string;
}

export interface CulqiSuscribirResponse {
  suscripcionId: number;
  estado: string;
  planId: string;
  precioMensual: number;
  fechaInicio: string;
  fechaProximoCobro: string;
  culqiSubscriptionId: string;
  mensaje: string;
}

export const culqiService = {
  /**
   * Obtiene la public key y datos del plan desde el backend.
   * Usado para inicializar Culqi.js antes de abrir el modal de pago.
   */
  getConfig: async (): Promise<CulqiConfigResponse> => {
    const { data } = await axiosInstance.get<CulqiConfigResponse>(API_ENDPOINTS.CULQI.CONFIG);
    return data;
  },

  /**
   * Envía el token generado por Culqi.js al backend para crear la suscripción.
   * El backend crea: Customer → Card → Subscription en Culqi, y activa la suscripción local.
   */
  suscribir: async (tokenId: string, planId?: string): Promise<CulqiSuscribirResponse> => {
    const payload: CulqiSuscribirRequest = { tokenId, planId };
    const { data } = await axiosInstance.post<CulqiSuscribirResponse>(
      API_ENDPOINTS.CULQI.SUSCRIBIR,
      payload,
    );
    return data;
  },
};
