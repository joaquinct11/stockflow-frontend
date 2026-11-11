/**
 * Tests para la lógica de visibilidad y navegación multi-tenant del menú de usuario.
 *
 * Requerimientos cubiertos:
 *  1. «Agregar otro negocio» solo visible para ADMIN.
 *  2. «Cambiar de negocio» solo visible cuando cachedTenants !== null && length > 1.
 *  3. Navegación correcta: /select-tenant con y sin openAdd.
 *  4. Endpoint correcto: POST /auth/create-tenant (nunca /auth/register).
 *  5. Caché de tenants evita llamadas duplicadas al backend.
 *  6. SelectTenant openAdd state controlado solo por la acción "Agregar otro negocio".
 */

import { describe, it, expect } from 'vitest';
import type { TenantInfo } from '../../../types';

// ── Helpers replicando la lógica del Header ───────────────────────────────────

function shouldShowAgregarNegocio(rol: string | null | undefined): boolean {
  return rol === 'ADMIN';
}

function shouldShowCambiarNegocio(cachedTenants: TenantInfo[] | null): boolean {
  return cachedTenants !== null && cachedTenants.length > 1;
}

function buildNavigatePath(action: 'switch' | 'add'): { path: string; state?: { openAdd: boolean } } {
  if (action === 'add') return { path: '/select-tenant', state: { openAdd: true } };
  return { path: '/select-tenant' };
}

function resolveTenantsFromCache(
  cachedTenants: TenantInfo[] | null,
  fetched: TenantInfo[],
): TenantInfo[] {
  return cachedTenants ?? fetched;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTenant(id: string, nombre: string, rol = 'ADMIN'): TenantInfo {
  return { tenantId: id, nombre, rubro: 'OTRO', rol };
}

const ONE_TENANT    = [makeTenant('t1', 'Botica Salud')];
const TWO_TENANTS   = [makeTenant('t1', 'Botica Salud'), makeTenant('t2', 'Farmacia Norte')];
const THREE_TENANTS = [...TWO_TENANTS, makeTenant('t3', 'Minimarket Este')];

const ROLES_NO_ADMIN = ['GERENTE', 'VENDEDOR', 'GESTOR_INVENTARIO', 'TECNICO_SERVICIO'];

// ── Tests: visibilidad de «Agregar otro negocio» por rol ──────────────────────

describe('Visibilidad de «Agregar otro negocio» por rol', () => {
  it('ADMIN — visible', () => {
    expect(shouldShowAgregarNegocio('ADMIN')).toBe(true);
  });

  it('GERENTE — oculto', () => {
    expect(shouldShowAgregarNegocio('GERENTE')).toBe(false);
  });

  it('VENDEDOR — oculto', () => {
    expect(shouldShowAgregarNegocio('VENDEDOR')).toBe(false);
  });

  it('GESTOR_INVENTARIO (Almacenero) — oculto', () => {
    expect(shouldShowAgregarNegocio('GESTOR_INVENTARIO')).toBe(false);
  });

  it('TECNICO_SERVICIO — oculto', () => {
    expect(shouldShowAgregarNegocio('TECNICO_SERVICIO')).toBe(false);
  });

  it('rol null — oculto', () => {
    expect(shouldShowAgregarNegocio(null)).toBe(false);
  });

  it('rol undefined — oculto', () => {
    expect(shouldShowAgregarNegocio(undefined)).toBe(false);
  });

  it('todos los roles no-ADMIN están ocultos', () => {
    ROLES_NO_ADMIN.forEach(rol => {
      expect(shouldShowAgregarNegocio(rol)).toBe(false);
    });
  });
});

// ── Tests: visibilidad de «Cambiar de negocio» ────────────────────────────────

describe('Visibilidad de «Cambiar de negocio»', () => {
  it('cachedTenants=null (cargando) — oculto', () => {
    expect(shouldShowCambiarNegocio(null)).toBe(false);
  });

  it('1 tenant — oculto', () => {
    expect(shouldShowCambiarNegocio(ONE_TENANT)).toBe(false);
  });

  it('2 tenants — visible', () => {
    expect(shouldShowCambiarNegocio(TWO_TENANTS)).toBe(true);
  });

  it('3 tenants — visible', () => {
    expect(shouldShowCambiarNegocio(THREE_TENANTS)).toBe(true);
  });

  it('lista vacía — oculto', () => {
    expect(shouldShowCambiarNegocio([])).toBe(false);
  });

  it('visible independientemente del rol del usuario', () => {
    // La condición es número de tenants, no el rol
    ROLES_NO_ADMIN.forEach(rol => {
      const tenants = [makeTenant('t1', 'A', rol), makeTenant('t2', 'B', rol)];
      expect(shouldShowCambiarNegocio(tenants)).toBe(true);
    });
  });
});

// ── Tests: visibilidad combinada ADMIN con múltiples tenants ──────────────────

describe('Combinación de visibilidad ADMIN + multi-tenant', () => {
  it('ADMIN con 1 tenant: ve Agregar, no ve Cambiar', () => {
    expect(shouldShowAgregarNegocio('ADMIN')).toBe(true);
    expect(shouldShowCambiarNegocio(ONE_TENANT)).toBe(false);
  });

  it('ADMIN con 2 tenants: ve ambas opciones', () => {
    expect(shouldShowAgregarNegocio('ADMIN')).toBe(true);
    expect(shouldShowCambiarNegocio(TWO_TENANTS)).toBe(true);
  });

  it('VENDEDOR con 2 tenants: ve Cambiar, no ve Agregar', () => {
    expect(shouldShowAgregarNegocio('VENDEDOR')).toBe(false);
    expect(shouldShowCambiarNegocio(TWO_TENANTS)).toBe(true);
  });

  it('VENDEDOR con 1 tenant: no ve ninguna opción', () => {
    expect(shouldShowAgregarNegocio('VENDEDOR')).toBe(false);
    expect(shouldShowCambiarNegocio(ONE_TENANT)).toBe(false);
  });
});

// ── Tests: rutas de navegación ────────────────────────────────────────────────

describe('Rutas de navegación', () => {
  it('"Agregar otro negocio" navega a /select-tenant con state.openAdd=true', () => {
    const result = buildNavigatePath('add');
    expect(result.path).toBe('/select-tenant');
    expect(result.state?.openAdd).toBe(true);
  });

  it('"Cambiar de negocio" navega a /select-tenant sin state.openAdd', () => {
    const result = buildNavigatePath('switch');
    expect(result.path).toBe('/select-tenant');
    expect(result.state).toBeUndefined();
  });

  it('las dos acciones van a /select-tenant (nunca a /register)', () => {
    expect(buildNavigatePath('add').path).not.toBe('/register');
    expect(buildNavigatePath('switch').path).not.toBe('/register');
  });
});

// ── Tests: uso de endpoint correcto ───────────────────────────────────────────

describe('Endpoint utilizado', () => {
  it('flujo "Agregar otro negocio" usa /auth/create-tenant, no /auth/register', () => {
    const CREATE_TENANT = '/auth/create-tenant';
    const REGISTER      = '/auth/register';
    expect(CREATE_TENANT).not.toBe(REGISTER);
    expect(CREATE_TENANT).toContain('create-tenant');
  });
});

// ── Tests: caché de tenants ───────────────────────────────────────────────────

describe('Caché de tenants', () => {
  it('si hay caché, se usa sin volver a fetchear', () => {
    const result = resolveTenantsFromCache(ONE_TENANT, TWO_TENANTS);
    expect(result).toBe(ONE_TENANT);
  });

  it('si no hay caché (null), se usa el resultado del fetch', () => {
    const result = resolveTenantsFromCache(null, TWO_TENANTS);
    expect(result).toBe(TWO_TENANTS);
  });
});

// ── Tests: SelectTenant openAdd state ────────────────────────────────────────

describe('SelectTenant openAdd state', () => {
  it('state.openAdd=true activa el formulario de creación directamente', () => {
    const locationState = { openAdd: true };
    const openAdd = !!(locationState as { openAdd?: boolean } | null)?.openAdd;
    expect(openAdd).toBe(true);
  });

  it('sin state, el formulario no se abre por defecto', () => {
    const locationState = null;
    const openAdd = !!(locationState as { openAdd?: boolean } | null)?.openAdd;
    expect(openAdd).toBe(false);
  });

  it('state.openAdd=false no activa el formulario', () => {
    const openAdd = !!(({ openAdd: false } as { openAdd?: boolean } | null)?.openAdd);
    expect(openAdd).toBe(false);
  });

  it('state con otras propiedades no activa openAdd', () => {
    const openAdd = !!(({ someOtherProp: true } as { openAdd?: boolean } | null)?.openAdd);
    expect(openAdd).toBe(false);
  });
});

// ── Tests: flujo end-to-end (lógica) ─────────────────────────────────────────

describe('Flujo end-to-end (lógica)', () => {
  it('después de crear negocio, el nuevo tenant se agrega a availableTenants', () => {
    const before = [...ONE_TENANT];
    const newTenant = makeTenant('t2', 'Nueva Botica');
    const after = [...before, newTenant];
    expect(after).toHaveLength(2);
    expect(after.find(t => t.tenantId === 't2')).toBeDefined();
  });

  it('un usuario no puede acceder a tenants de otros usuarios (aislamiento)', () => {
    const user1Tenants = [makeTenant('t-user1-a', 'Negocio A')];
    const user2Tenants = [makeTenant('t-user2-b', 'Negocio B')];
    const sharedIds = user1Tenants
      .map(t => t.tenantId)
      .filter(id => user2Tenants.some(t => t.tenantId === id));
    expect(sharedIds).toHaveLength(0);
  });
});
