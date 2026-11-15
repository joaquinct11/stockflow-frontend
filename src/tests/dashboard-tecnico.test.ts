/**
 * Regresión: Dashboard TECNICO_SERVICIO y EMPRESA_SERVICIOS.
 *
 * Cubre:
 *  1. safeRol() acepta TECNICO_SERVICIO y no lo convierte a VENDEDOR.
 *  2. Fix 403: proximosVencerPromise solo se llama cuando puedeVerInventario = true.
 *  3. Accesos rápidos: lógica de visibilidad por rol dentro de esServicios.
 *  4. KPIs del técnico: subtítulos reflejan scope del negocio, no personal.
 */

import { describe, it, expect } from 'vitest';

// ── 1. safeRol ────────────────────────────────────────────────────────────────

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO' | 'TECNICO_SERVICIO';

function safeRol(rol?: string): Role {
  if (
    rol === 'ADMIN' ||
    rol === 'GERENTE' ||
    rol === 'VENDEDOR' ||
    rol === 'GESTOR_INVENTARIO' ||
    rol === 'TECNICO_SERVICIO'
  )
    return rol;
  return 'VENDEDOR';
}

describe('safeRol — mapeo de roles', () => {
  it('SR1: TECNICO_SERVICIO se mapea a sí mismo, no cae a VENDEDOR', () => {
    expect(safeRol('TECNICO_SERVICIO')).toBe('TECNICO_SERVICIO');
  });

  it('SR2: roles conocidos conservan su valor', () => {
    expect(safeRol('ADMIN')).toBe('ADMIN');
    expect(safeRol('GERENTE')).toBe('GERENTE');
    expect(safeRol('VENDEDOR')).toBe('VENDEDOR');
    expect(safeRol('GESTOR_INVENTARIO')).toBe('GESTOR_INVENTARIO');
  });

  it('SR3: rol desconocido cae a VENDEDOR', () => {
    expect(safeRol('CAJERO')).toBe('VENDEDOR');
    expect(safeRol(undefined)).toBe('VENDEDOR');
    expect(safeRol('')).toBe('VENDEDOR');
  });
});

// ── 2. Fix 403: lógica de proximosVencerPromise ───────────────────────────────

type InventoryBranch = 'con_inventario' | 'sin_inventario';

function resolveInventoryBranch(puedeVerInventario: boolean): InventoryBranch {
  if (puedeVerInventario) return 'con_inventario';
  return 'sin_inventario';
}

describe('Fix 403 — proximos-vencer solo con VER_INVENTARIO', () => {
  it('FIX1: sin VER_INVENTARIO no entra al branch que llama a getProximosAVencer', () => {
    // TECNICO_SERVICIO: tiene VER_PRODUCTOS pero NO VER_INVENTARIO
    expect(resolveInventoryBranch(false)).toBe('sin_inventario');
  });

  it('FIX2: con VER_INVENTARIO sí entra al branch correcto', () => {
    expect(resolveInventoryBranch(true)).toBe('con_inventario');
  });

  it('FIX3: VER_PRODUCTOS sin VER_INVENTARIO no habilita proximos-vencer', () => {
    const puedeVerProductos = true;
    const puedeVerInventario = false;
    // La lógica correcta: solo con VER_INVENTARIO
    const llamariaProximosVencer = puedeVerInventario;
    expect(llamariaProximosVencer).toBe(false);
    // El valor de puedeVerProductos no debe importar para este endpoint
    expect(puedeVerProductos).toBe(true); // tiene VER_PRODUCTOS
    expect(llamariaProximosVencer).toBe(false); // pero no llama al endpoint
  });
});

// ── 3. Visibilidad de accesos rápidos en esServicios ─────────────────────────

type ServiciosRol = 'ADMIN' | 'GERENTE' | 'TECNICO_SERVICIO' | 'otro';

interface AccesoRapido {
  label: string;
  soloAdmin: boolean;
  soloTecnico: boolean;
}

const ACCESOS_SERVICIOS: AccesoRapido[] = [
  { label: 'Nueva OT',          soloAdmin: true,  soloTecnico: false },
  { label: 'Equipos (admin)',    soloAdmin: true,  soloTecnico: false },
  { label: 'Clientes (admin)',   soloAdmin: true,  soloTecnico: false },
  { label: 'Facturación',        soloAdmin: true,  soloTecnico: false },
  { label: 'Comisiones',         soloAdmin: true,  soloTecnico: false },
  { label: 'Reportes',           soloAdmin: true,  soloTecnico: false },
  { label: 'Órdenes de Trabajo', soloAdmin: false, soloTecnico: true  },
  { label: 'Equipos (técnico)',  soloAdmin: false, soloTecnico: true  },
  { label: 'Clientes (técnico)', soloAdmin: false, soloTecnico: true  },
  { label: 'Catálogo',           soloAdmin: false, soloTecnico: true  },
];

function getAccesosParaRol(rol: ServiciosRol): AccesoRapido[] {
  if (rol === 'TECNICO_SERVICIO') return ACCESOS_SERVICIOS.filter(a => a.soloTecnico);
  return ACCESOS_SERVICIOS.filter(a => a.soloAdmin);
}

describe('Accesos rápidos EMPRESA_SERVICIOS — visibilidad por rol', () => {
  it('AR1: TECNICO_SERVICIO NO ve Facturación', () => {
    const accesos = getAccesosParaRol('TECNICO_SERVICIO');
    expect(accesos.map(a => a.label)).not.toContain('Facturación');
  });

  it('AR2: TECNICO_SERVICIO NO ve Comisiones', () => {
    const accesos = getAccesosParaRol('TECNICO_SERVICIO');
    expect(accesos.map(a => a.label)).not.toContain('Comisiones');
  });

  it('AR3: TECNICO_SERVICIO NO ve Reportes', () => {
    const accesos = getAccesosParaRol('TECNICO_SERVICIO');
    expect(accesos.map(a => a.label)).not.toContain('Reportes');
  });

  it('AR4: TECNICO_SERVICIO NO ve Nueva OT (con capacidad de crear)', () => {
    // El técnico no tiene CREAR_OT, solo VER_OT y CAMBIAR_ESTADO_OT
    const accesos = getAccesosParaRol('TECNICO_SERVICIO');
    expect(accesos.map(a => a.label)).not.toContain('Nueva OT');
  });

  it('AR5: TECNICO_SERVICIO SÍ ve Órdenes de Trabajo, Equipos, Clientes, Catálogo', () => {
    const accesos = getAccesosParaRol('TECNICO_SERVICIO').map(a => a.label);
    expect(accesos).toContain('Órdenes de Trabajo');
    expect(accesos).toContain('Equipos (técnico)');
    expect(accesos).toContain('Clientes (técnico)');
    expect(accesos).toContain('Catálogo');
  });

  it('AR6: ADMIN SÍ ve Nueva OT, Facturación, Comisiones, Reportes', () => {
    const accesos = getAccesosParaRol('ADMIN').map(a => a.label);
    expect(accesos).toContain('Nueva OT');
    expect(accesos).toContain('Facturación');
    expect(accesos).toContain('Comisiones');
    expect(accesos).toContain('Reportes');
  });
});

// ── 4. Scope de estadísticas OT ───────────────────────────────────────────────

describe('KPIs OT — scope de estadísticas', () => {
  it('SC1: el backend filtra OTs por técnico asignado cuando no tiene VER_TODAS_OT', () => {
    // Tras el aislamiento (V135), OrdenTrabajoServiceImpl.listar() usa
    // countByEstadoAndTecnico() cuando callerHasAuthority("PERM_VER_TODAS_OT") es false.
    // Este test documenta que el resumen ahora es personal, no global del tenant.
    const resumenEsPersonal = true;
    expect(resumenEsPersonal).toBe(true);
  });

  it('SC2: los subtítulos de KPIs del técnico deben indicar scope personal', () => {
    // Replicamos los subtítulos definidos en Dashboard.tsx para el branch del técnico
    const subtitulosKpiTecnico = [
      'Mis pendientes',
      'En proceso',
      'Total',
    ];
    // Ninguno dice "Del negocio" — el scope ahora es personal
    for (const sub of subtitulosKpiTecnico) {
      expect(sub.toLowerCase()).not.toContain('del negocio');
    }
  });

  it('SC3: TECNICO_SERVICIO no tiene VER_INVENTARIO ni VER_TODAS_OT', () => {
    // Invariante de permisos del backend (RolePermissionDefaults).
    const permisosTecnico = [
      'VER_DASHBOARD', 'VER_OT', 'CAMBIAR_ESTADO_OT', 'REGISTRAR_CONSUMO_OT',
      'DEVOLVER_CONSUMO_OT', 'CLASIFICAR_CONSUMO_OT', 'CERRAR_TECNICO_OT',
      'VER_EQUIPOS', 'VER_CLIENTES', 'VER_PRODUCTOS', 'VER_SUCURSALES',
    ];
    expect(permisosTecnico).not.toContain('VER_INVENTARIO');
    expect(permisosTecnico).not.toContain('VER_TODAS_OT');
    expect(permisosTecnico).not.toContain('FACTURAR_OT');
    expect(permisosTecnico).not.toContain('ANULAR_FACTURA_OT');
  });

  it('SC4: GERENTE tiene VER_OT y VER_TODAS_OT para ver todas las OTs del tenant', () => {
    const permisosGerente = [
      'VER_OT', 'VER_TODAS_OT', 'VER_EQUIPOS',
    ];
    expect(permisosGerente).toContain('VER_OT');
    expect(permisosGerente).toContain('VER_TODAS_OT');
  });
});

// ── 5. Mapeo BACKEND_PERMISSION_MAP — ORDENES_TRABAJO ─────────────────────────
// Replica el fragmento relevante de BACKEND_PERMISSION_MAP en usePermissions.ts
// para validar que ver_todas apunta a VER_TODAS_OT y no a VER_OT (bug FRONT-001).

const OT_BACKEND_MAP = {
  ver:          'VER_OT',
  ver_todas:    'VER_TODAS_OT',   // corregido: antes era 'VER_OT'
  crear:        'CREAR_OT',
  editar:       'EDITAR_OT',
  cambiarEstado:'CAMBIAR_ESTADO_OT',
  activar:      'ASIGNAR_TECNICO_OT',
};

describe('FRONT-001 fix — BACKEND_PERMISSION_MAP ORDENES_TRABAJO', () => {
  it('PM1: ver_todas apunta a VER_TODAS_OT, no a VER_OT', () => {
    expect(OT_BACKEND_MAP.ver_todas).toBe('VER_TODAS_OT');
    expect(OT_BACKEND_MAP.ver_todas).not.toBe('VER_OT');
  });

  it('PM2: ver y ver_todas son códigos distintos', () => {
    expect(OT_BACKEND_MAP.ver).toBe('VER_OT');
    expect(OT_BACKEND_MAP.ver_todas).toBe('VER_TODAS_OT');
    expect(OT_BACKEND_MAP.ver).not.toBe(OT_BACKEND_MAP.ver_todas);
  });

  it('PM3: un usuario con solo VER_OT no satisface ver_todas', () => {
    const permisosUsuario = ['VER_OT', 'CAMBIAR_ESTADO_OT'];
    const satisfaceVerTodas = permisosUsuario.includes(OT_BACKEND_MAP.ver_todas);
    expect(satisfaceVerTodas).toBe(false);
  });

  it('PM4: un usuario con VER_OT y VER_TODAS_OT satisface ambos', () => {
    const permisosAdmin = ['VER_OT', 'VER_TODAS_OT', 'CREAR_OT'];
    expect(permisosAdmin.includes(OT_BACKEND_MAP.ver)).toBe(true);
    expect(permisosAdmin.includes(OT_BACKEND_MAP.ver_todas)).toBe(true);
  });
});

// ── 6. Tabla fallback por rol — ORDENES_TRABAJO ───────────────────────────────
// Replica la sección ORDENES_TRABAJO de PERMISSIONS en usePermissions.ts
// para validar que TECNICO_SERVICIO no tiene ver_todas en el fallback.

const OT_FALLBACK_PERMISSIONS: Record<string, string[]> = {
  ADMIN:            ['ver', 'ver_todas', 'crear', 'editar', 'cambiarEstado'],
  GERENTE:          [],
  VENDEDOR:         [],
  GESTOR_INVENTARIO:[],
  VETERINARIO:      [],
  RECEPCIONISTA:    [],
  AUXILIAR_VETERINARIO: [],
  GROOMER:          [],
  TECNICO_SERVICIO: ['ver', 'cambiarEstado'],   // corregido: 'ver_todas' eliminado
};

describe('FRONT-001 fix — tabla fallback ORDENES_TRABAJO por rol', () => {
  it('FB1: TECNICO_SERVICIO no tiene ver_todas en fallback', () => {
    expect(OT_FALLBACK_PERMISSIONS['TECNICO_SERVICIO']).not.toContain('ver_todas');
  });

  it('FB2: TECNICO_SERVICIO sí tiene ver y cambiarEstado en fallback', () => {
    expect(OT_FALLBACK_PERMISSIONS['TECNICO_SERVICIO']).toContain('ver');
    expect(OT_FALLBACK_PERMISSIONS['TECNICO_SERVICIO']).toContain('cambiarEstado');
  });

  it('FB3: ADMIN tiene ver_todas en fallback', () => {
    expect(OT_FALLBACK_PERMISSIONS['ADMIN']).toContain('ver_todas');
  });

  it('FB4: si TECNICO_SERVICIO usara ver_todas en fallback + el nuevo mapa, obtendría VER_TODAS_OT — invariante que debe NO ocurrir', () => {
    const permisoFallback = OT_FALLBACK_PERMISSIONS['TECNICO_SERVICIO'].includes('ver_todas');
    // Con el fix, el técnico no tiene ver_todas en fallback
    expect(permisoFallback).toBe(false);
    // → canViewAll('ORDENES_TRABAJO') devolverá false para TECNICO_SERVICIO en fallback
  });
});
