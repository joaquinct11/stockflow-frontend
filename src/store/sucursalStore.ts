import { create } from 'zustand';
import type { SucursalDTO } from '../services/sucursal.service';

interface SucursalState {
  sucursales: SucursalDTO[];
  sucursalActual: SucursalDTO | null;
  loading: boolean;
  loaded: boolean;
  setSucursales: (sucursales: SucursalDTO[]) => void;
  setSucursalActual: (sucursal: SucursalDTO) => void;
  clearSucursales: () => void;
  setLoading: (loading: boolean) => void;
}

const STORAGE_KEY = 'sucursalActualId';

function restoreFromStorage(sucursales: SucursalDTO[]): SucursalDTO | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return sucursales.find((s) => s.esPrincipal) ?? sucursales[0] ?? null;
  const id = parseInt(saved, 10);
  return sucursales.find((s) => s.id === id) ?? sucursales.find((s) => s.esPrincipal) ?? sucursales[0] ?? null;
}

export const useSucursalStore = create<SucursalState>((set) => ({
  sucursales: [],
  sucursalActual: null,
  loading: false,
  loaded: false,

  setSucursales: (sucursales) => {
    const sucursalActual = restoreFromStorage(sucursales);
    if (sucursalActual) {
      localStorage.setItem(STORAGE_KEY, String(sucursalActual.id));
    }
    set({ sucursales, sucursalActual, loading: false, loaded: true });
  },

  setSucursalActual: (sucursal) => {
    localStorage.setItem(STORAGE_KEY, String(sucursal.id));
    set({ sucursalActual: sucursal });
  },

  clearSucursales: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ sucursales: [], sucursalActual: null, loaded: true });
  },

  setLoading: (loading) => set({ loading }),
}));
