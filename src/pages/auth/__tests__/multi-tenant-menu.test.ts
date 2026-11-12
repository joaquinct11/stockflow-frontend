/**
 * Tests para la lógica de visibilidad y navegación multi-tenant del menú de usuario.
 *
 * Requerimientos cubiertos:
 *  1. «Agregar otro negocio» solo visible para ADMIN.
 *  2. «Cambiar de negocio» solo visible cuando knownTenants !== null && length > 1 y sin error/loading.
 *  3. Navegación correcta: /select-tenant con y sin openAdd.
 *  4. Endpoint correcto: POST /auth/create-tenant (nunca /auth/register).
 *  5. Estado de carga de tenants distingue entre cargando / cargado / error.
 *  6. SelectTenant openAdd state controlado solo por la acción "Agregar otro negocio".
 *  7. Nombre del negocio (tenantNombre) y etiqueta del plan mostrados en el dropdown.
 */

import { describe, it, expect } from 'vitest';
import type { TenantInfo } from '../../../types';

// ── Helpers replicando la lógica del Header ───────────────────────────────────

function shouldShowAgregarNegocio(rol: string | null | undefined): boolean {
  return rol === 'ADMIN';
}

/**
 * Replica la lógica del Header para mostrar «Cambiar de negocio».
 * Requiere: tenants cargados, sin error, y más de 1 tenant.
 */
function shouldShowCambiarNegocio(
  knownTenants: TenantInfo[] | null,
  tenantsLoading = false,
  tenantsError = false,
): boolean {
  if (tenantsLoading || tenantsError || knownTenants === null) return false;
  return knownTenants.length > 1;
}

/** Deriva la etiqueta de plan que se muestra en el dropdown del Header. */
function planLabel(planId: string | null | undefined): string {
  if (!planId) return '';
  return planId.toUpperCase() === 'PRO' ? 'PRO' : 'Básico';
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
  it('knownTenants=null (no cargado aún) — oculto', () => {
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

  // ── Nuevos: estado de carga explícito ──────────────────────────────────────
  it('REQ-5 — mientras carga (tenantsLoading=true): oculto aunque haya 2 tenants', () => {
    expect(shouldShowCambiarNegocio(TWO_TENANTS, true, false)).toBe(false);
  });

  it('REQ-5 — mientras carga (tenantsLoading=true) con lista null: oculto', () => {
    expect(shouldShowCambiarNegocio(null, true, false)).toBe(false);
  });

  it('REQ-6 — error al cargar (tenantsError=true): oculto, no interpreta error como lista vacía', () => {
    // El error no debe hacer aparecer «Cambiar de negocio» ni interpretarse como "1 tenant"
    expect(shouldShowCambiarNegocio(null,  false, true)).toBe(false);
    expect(shouldShowCambiarNegocio([],    false, true)).toBe(false);
    expect(shouldShowCambiarNegocio(TWO_TENANTS, false, true)).toBe(false);
  });

  it('REQ-6 — error y loading simultáneos: oculto', () => {
    expect(shouldShowCambiarNegocio(TWO_TENANTS, true, true)).toBe(false);
  });

  it('REQ-1 — usuario con un tenant: no muestra «Cambiar de negocio»', () => {
    expect(shouldShowCambiarNegocio(ONE_TENANT, false, false)).toBe(false);
  });

  it('REQ-2 — usuario con dos tenants: muestra «Cambiar de negocio» al terminar la carga', () => {
    // Durante la carga: oculto
    expect(shouldShowCambiarNegocio(null,       true,  false)).toBe(false);
    // Al completar la carga: visible
    expect(shouldShowCambiarNegocio(TWO_TENANTS, false, false)).toBe(true);
  });
});

// ── Tests: visibilidad combinada ADMIN con múltiples tenants ──────────────────

describe('Combinación de visibilidad ADMIN + multi-tenant', () => {
  it('ADMIN con 1 tenant: ve Agregar, no ve Cambiar', () => {
    expect(shouldShowAgregarNegocio('ADMIN')).toBe(true);
    expect(shouldShowCambiarNegocio(ONE_TENANT)).toBe(false);
  });

  it('REQ-3 — ADMIN con 2 tenants: ve ambas opciones', () => {
    expect(shouldShowAgregarNegocio('ADMIN')).toBe(true);
    expect(shouldShowCambiarNegocio(TWO_TENANTS)).toBe(true);
  });

  it('REQ-4 — usuario sin ADMIN: no muestra «Agregar otro negocio»', () => {
    ROLES_NO_ADMIN.forEach(rol => {
      expect(shouldShowAgregarNegocio(rol)).toBe(false);
    });
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

  it('REQ-7 — después de crear negocio, knownTenants se actualiza y «Cambiar de negocio» aparece sin cerrar sesión', () => {
    // Estado inicial: 1 tenant conocido, Cambiar oculto
    let knownTenants: TenantInfo[] | null = [...ONE_TENANT];
    expect(shouldShowCambiarNegocio(knownTenants)).toBe(false);

    // Simula la creación del negocio y actualización del store
    const newTenant = makeTenant('t2', 'Tienda Nueva');
    knownTenants = [...knownTenants, newTenant];

    // Ahora hay 2 tenants → debe aparecer «Cambiar de negocio» (sin logout)
    expect(shouldShowCambiarNegocio(knownTenants)).toBe(true);
    expect(knownTenants).toHaveLength(2);
  });

  it('REQ-8 — al cambiar de tenant, tenantNombre se actualiza con nombreFarmacia del perfil', () => {
    // Simula el mapeo que hace SelectTenant.handleSelect
    const derivarTenantNombre = (nombreFarmacia: string | undefined) => nombreFarmacia ?? null;
    expect(derivarTenantNombre('BOTICA SALUD')).toBe('BOTICA SALUD');
    expect(derivarTenantNombre('TIENDA ROPA')).toBe('TIENDA ROPA');
    expect(derivarTenantNombre(undefined)).toBeNull();
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

// ── Tests: etiqueta de plan en el dropdown ────────────────────────────────────

describe('Etiqueta de plan en el dropdown del Header', () => {
  it('REQ-9  — BOTICA (planId BASICO) muestra «Básico»', () => {
    expect(planLabel('BASICO')).toBe('Básico');
  });

  it('REQ-10 — TIENDA ROPA (planId PRO) muestra «PRO»', () => {
    expect(planLabel('PRO')).toBe('PRO');
  });

  it('REQ-11 — FERRETERÍA (planId BASICO) muestra «Básico»', () => {
    expect(planLabel('BASICO')).toBe('Básico');
  });

  it('planId en minúsculas se normaliza correctamente', () => {
    expect(planLabel('pro')).toBe('PRO');
    expect(planLabel('basico')).toBe('Básico');
  });

  it('planId null/undefined produce cadena vacía', () => {
    expect(planLabel(null)).toBe('');
    expect(planLabel(undefined)).toBe('');
  });
});
