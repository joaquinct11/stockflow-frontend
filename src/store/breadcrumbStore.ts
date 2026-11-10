import { create } from 'zustand';

interface BreadcrumbState {
  label: string | null;
  parentLabel: string | null;
  parentHref: string | null;
  set: (label: string, parentLabel?: string, parentHref?: string) => void;
  clear: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  label: null,
  parentLabel: null,
  parentHref: null,
  set: (label, parentLabel = undefined, parentHref = undefined) =>
    set({ label, parentLabel, parentHref }),
  clear: () => set({ label: null, parentLabel: null, parentHref: null }),
}));
