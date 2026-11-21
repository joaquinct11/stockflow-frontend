import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface UbigeoDistrito {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export const ubigeoService = {
  getDepartamentos: (): Promise<string[]> =>
    axiosInstance.get(API_ENDPOINTS.UBIGEOS.DEPARTAMENTOS).then(r => r.data),

  getProvincias: (departamento: string): Promise<string[]> =>
    axiosInstance.get(API_ENDPOINTS.UBIGEOS.PROVINCIAS(departamento)).then(r => r.data),

  getDistritos: (departamento: string, provincia: string): Promise<UbigeoDistrito[]> =>
    axiosInstance.get(API_ENDPOINTS.UBIGEOS.DISTRITOS(departamento, provincia)).then(r => r.data),

  getByCodigo: (codigo: string): Promise<UbigeoDistrito | null> =>
    axiosInstance.get(API_ENDPOINTS.UBIGEOS.BY_CODIGO(codigo))
      .then(r => r.data)
      .catch(() => null),
};
