import { superAdminApi } from '../api/superAdminApi';

export interface TenantResumenDTO {
  tenantId: string;
  nombre: string;
  ruc: string | null;
  emailContacto: string | null;
  rubro: string | null;
  activo: boolean;
  suscripcionId: number | null;
  planId: string | null;
  estadoSuscripcion: string | null;
  precioMensual: number | null;
  preapprovalId: string | null;
  ultimos4Digitos: string | null;
  metodoPago: string | null;
  fechaProximoCobro: string | null;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  suscripcionCreadaEn: string | null;
  oseUrl: string | null;
  oseToken: string | null;
  totalUsuarios: number;
  totalProductos: number;
  totalVentas: number;
  totalComprobantes: number;
}

export interface SuperAdminStatsDTO {
  totalTenants: number;
  activos: number;
  enTrial: number;
  vencidos: number;
  cancelados: number;
  pastDue: number;
  mrrEstimado: number;
}

export interface SuperAdminFinanzasDTO {
  mrrActual: number;
  mrrAnualProyectado: number;
  cantBasico: number;
  cantPro: number;
  tenantsActivos: number;
  tenantsConOse: number;
}

export interface SuscripcionHistorialDTO {
  id: number;
  planId: string | null;
  estado: string | null;
  precioMensual: number | null;
  metodoPago: string | null;
  ultimos4Digitos: string | null;
  preapprovalId: string | null;
  fechaInicio: string | null;
  fechaProximoCobro: string | null;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  createdAt: string | null;
}

export interface SuscripcionManualUpdateDTO {
  planId?: string;
  estado?: string;
  precioMensual?: number;
  fechaProximoCobro?: string;
  trialEndDate?: string;
  currentPeriodEnd?: string;
}

export interface OseUpdateDTO {
  oseUrl?: string;
  oseToken?: string;
}

export const superAdminService = {
  login: (username: string, password: string) =>
    superAdminApi.post<{ token: string; username: string }>('/superadmin/auth/login', { username, password }),

  getStats: () =>
    superAdminApi.get<SuperAdminStatsDTO>('/superadmin/stats'),

  getFinanzas: () =>
    superAdminApi.get<SuperAdminFinanzasDTO>('/superadmin/finanzas'),

  getTenants: () =>
    superAdminApi.get<TenantResumenDTO[]>('/superadmin/tenants'),

  getCobros: (tenantId: string) =>
    superAdminApi.get<SuscripcionHistorialDTO[]>(`/superadmin/tenants/${tenantId}/cobros`),

  updateSuscripcion: (tenantId: string, dto: SuscripcionManualUpdateDTO) =>
    superAdminApi.put<TenantResumenDTO>(`/superadmin/tenants/${tenantId}/suscripcion`, dto),

  extenderTrial: (tenantId: string, dias: number) =>
    superAdminApi.post<TenantResumenDTO>(`/superadmin/tenants/${tenantId}/trial`, { dias }),

  toggleActivo: (tenantId: string, activo: boolean) =>
    superAdminApi.put<void>(`/superadmin/tenants/${tenantId}/activo`, { activo }),

  updateOse: (tenantId: string, dto: OseUpdateDTO) =>
    superAdminApi.put<void>(`/superadmin/tenants/${tenantId}/ose`, dto),
};
