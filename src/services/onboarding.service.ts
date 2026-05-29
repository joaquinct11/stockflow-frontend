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

export const onboardingService = {
  getProgreso: async (): Promise<OnboardingProgreso> => {
    const { data } = await axiosInstance.get<OnboardingProgreso>(
      API_ENDPOINTS.ONBOARDING.PROGRESO
    );
    return data;
  },
};
