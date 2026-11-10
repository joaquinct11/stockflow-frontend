import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TenantConfigDTO } from '../types';

interface TenantConfigState {
  config: TenantConfigDTO | null;
  /** Rubro del tenant activo. Se establece inmediatamente al seleccionar tenant,
   *  antes de que llegue el GET /tenant/config completo. */
  rubro: string | null;
  setConfig: (config: TenantConfigDTO) => void;
  setRubro: (rubro: string | null) => void;
  clearConfig: () => void;
}

export const useTenantConfigStore = create<TenantConfigState>()(
  persist(
    (set) => ({
      config: null,
      rubro: null,
      setConfig: (config) => set({ config, rubro: config.rubro ?? null }),
      setRubro: (rubro) => set({ rubro }),
      clearConfig: () => set({ config: null, rubro: null }),
    }),
    {
      name: 'tenant-config',
      partialize: (state) => ({
        config: state.config
          ? { ...state.config, logoBase64: undefined }
          : null,
        rubro: state.rubro,
      }),
    }
  )
);
