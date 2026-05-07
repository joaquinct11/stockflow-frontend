import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { TenantConfigDTO } from '../types';

export const tenantConfigService = {
  getConfig: async (): Promise<TenantConfigDTO> => {
    const { data } = await axiosInstance.get<TenantConfigDTO>(API_ENDPOINTS.TENANT.CONFIG);
    return data;
  },

  updateConfig: async (dto: Partial<TenantConfigDTO>): Promise<TenantConfigDTO> => {
    const { data } = await axiosInstance.put<TenantConfigDTO>(API_ENDPOINTS.TENANT.CONFIG, dto);
    return data;
  },
};
