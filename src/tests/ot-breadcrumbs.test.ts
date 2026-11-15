/**
 * Tests de lógica pura para breadcrumbs de OT y Equipos.
 */

import { describe, it, expect } from 'vitest';

// ── Réplica del routeMap de Breadcrumb.tsx ────────────────────────────────────

type BreadcrumbEntry = { group?: string; label: string };

const routeMap: Record<string, BreadcrumbEntry> = {
  '/dashboard/ventas':          { group: 'Ventas',     label: 'Historial de ventas' },
  '/dashboard/ordenes-trabajo': { label: 'Órdenes de trabajo' },
  '/dashboard/equipos':         { label: 'Equipos' },
};

function getEntry(path: string): BreadcrumbEntry | null {
  return routeMap[path] ?? null;
}

function isOtDetailPath(path: string): boolean {
  return /^\/dashboard\/ordenes-trabajo\/\d+/.test(path);
}

function buildOtDetailCrumbs(path: string, dynamicLabel: string | null) {
  if (!isOtDetailPath(path)) return null;
  return [
    { label: 'Inicio', href: '/dashboard' },
    { label: 'Órdenes de trabajo', href: '/dashboard/ordenes-trabajo' },
    { label: dynamicLabel ?? 'Detalle', href: undefined },
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Breadcrumb — Listados', () => {
  it('B1: listado OT tiene label "Órdenes de trabajo"', () => {
    const entry = getEntry('/dashboard/ordenes-trabajo');
    expect(entry?.label).toBe('Órdenes de trabajo');
  });

  it('B2: listado OT no tiene grupo', () => {
    const entry = getEntry('/dashboard/ordenes-trabajo');
    expect(entry?.group).toBeUndefined();
  });

  it('B3: listado Equipos tiene label "Equipos"', () => {
    const entry = getEntry('/dashboard/equipos');
    expect(entry?.label).toBe('Equipos');
  });

  it('B4: listado Equipos no tiene grupo', () => {
    const entry = getEntry('/dashboard/equipos');
    expect(entry?.group).toBeUndefined();
  });

  it('B5: ventas tiene label "Historial de ventas" (sin mayúsculas extra)', () => {
    const entry = getEntry('/dashboard/ventas');
    expect(entry?.label).toBe('Historial de ventas');
  });
});

describe('Breadcrumb — Detalle OT', () => {
  it('B6: ruta numérica reconocida como detalle OT', () => {
    expect(isOtDetailPath('/dashboard/ordenes-trabajo/42')).toBe(true);
  });

  it('B7: ruta listado NO reconocida como detalle', () => {
    expect(isOtDetailPath('/dashboard/ordenes-trabajo')).toBe(false);
  });

  it('B8: breadcrumb de detalle muestra número OT real', () => {
    const crumbs = buildOtDetailCrumbs('/dashboard/ordenes-trabajo/42', 'OT-2026-00042');
    expect(crumbs?.[2].label).toBe('OT-2026-00042');
  });

  it('B9: breadcrumb de detalle usa "Detalle" si no hay número aún', () => {
    const crumbs = buildOtDetailCrumbs('/dashboard/ordenes-trabajo/42', null);
    expect(crumbs?.[2].label).toBe('Detalle');
  });

  it('B10: breadcrumb de detalle incluye enlace al listado OT', () => {
    const crumbs = buildOtDetailCrumbs('/dashboard/ordenes-trabajo/42', 'OT-2026-00001');
    expect(crumbs?.[1].href).toBe('/dashboard/ordenes-trabajo');
  });
});
