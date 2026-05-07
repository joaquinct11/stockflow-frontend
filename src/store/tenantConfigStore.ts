import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TenantConfigDTO } from '../types';

interface TenantConfigState {
  config: TenantConfigDTO | null;
  setConfig: (config: TenantConfigDTO) => void;
  clearConfig: () => void;
}

export const useTenantConfigStore = create<TenantConfigState>()(
  persist(
    (set) => ({
      config: null,
      setConfig: (config) => set({ config }),
      clearConfig: () => set({ config: null }),
    }),
    {
      name: 'tenant-config',
      // No persistir el logo en localStorage — es muy grande y siempre viene del API
      partialize: (state) => ({
        config: state.config
          ? { ...state.config, logoBase64: undefined }
          : null,
      }),
    }
  )
);
