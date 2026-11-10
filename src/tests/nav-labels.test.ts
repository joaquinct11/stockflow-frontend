/**
 * Tests de lógica pura para etiquetas de navegación y visibilidad de módulos.
 */

import { describe, it, expect } from 'vitest';

// ── Réplica del menu de Sidebar ───────────────────────────────────────────────

type Rubro = 'EMPRESA_SERVICIOS' | 'VETERINARIA' | 'BOTICA' | 'FARMACIA' | 'TIENDA_ROPA' | string;

function buildVentasLabel(): string {
  return 'Historial de ventas';
}

function comisionesVisible(rubro: Rubro, isAdmin: boolean, puedeVerComisiones: boolean): boolean {
  const esServicios = rubro === 'EMPRESA_SERVICIOS';
  return esServicios && (isAdmin || puedeVerComisiones);
}

function otVisible(rubro: Rubro, isAdmin: boolean, puedeVerOt: boolean): boolean {
  return rubro === 'EMPRESA_SERVICIOS' && (isAdmin || puedeVerOt);
}

function equiposVisible(rubro: Rubro, isAdmin: boolean, puedeVerEquipos: boolean): boolean {
  return rubro === 'EMPRESA_SERVICIOS' && (isAdmin || puedeVerEquipos);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Etiqueta de ventas', () => {
  it('N1: siempre es "Historial de ventas" independientemente del rubro', () => {
    expect(buildVentasLabel()).toBe('Historial de ventas');
  });

  it('N2: no incluye "Servicios Prestados" en el label', () => {
    expect(buildVentasLabel()).not.toContain('Servicios');
  });
});

describe('Visibilidad de Comisiones por rubro', () => {
  it('N3: visible para EMPRESA_SERVICIOS admin', () => {
    expect(comisionesVisible('EMPRESA_SERVICIOS', true, false)).toBe(true);
  });

  it('N4: visible para EMPRESA_SERVICIOS con permiso VER_COMISIONES', () => {
    expect(comisionesVisible('EMPRESA_SERVICIOS', false, true)).toBe(true);
  });

  it('N5: oculto para EMPRESA_SERVICIOS sin permisos', () => {
    expect(comisionesVisible('EMPRESA_SERVICIOS', false, false)).toBe(false);
  });

  it('N6: oculto para VETERINARIA (aunque sea admin)', () => {
    expect(comisionesVisible('VETERINARIA', true, false)).toBe(false);
  });

  it('N7: oculto para BOTICA', () => {
    expect(comisionesVisible('BOTICA', true, false)).toBe(false);
  });

  it('N8: oculto para TIENDA_ROPA', () => {
    expect(comisionesVisible('TIENDA_ROPA', true, false)).toBe(false);
  });
});

describe('Visibilidad de OT y Equipos', () => {
  it('N9: OT visible para EMPRESA_SERVICIOS admin', () => {
    expect(otVisible('EMPRESA_SERVICIOS', true, false)).toBe(true);
  });

  it('N10: OT oculto para VETERINARIA', () => {
    expect(otVisible('VETERINARIA', true, false)).toBe(false);
  });

  it('N11: Equipos visible para EMPRESA_SERVICIOS admin', () => {
    expect(equiposVisible('EMPRESA_SERVICIOS', true, false)).toBe(true);
  });

  it('N12: Equipos oculto para BOTICA', () => {
    expect(equiposVisible('BOTICA', true, false)).toBe(false);
  });
});
