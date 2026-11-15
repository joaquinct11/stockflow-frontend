/**
 * Tests para funciones puras del formulario de registro.
 * Verifican que los segmentos comerciales se mapeen correctamente
 * a códigos de catálogo y rubros operativos del backend.
 *
 * Las réplicas de las funciones deben mantenerse sincronizadas con Register.tsx.
 * ALMACENES y RESTAURANTE han sido eliminados del registro público.
 */

import { describe, it, expect } from 'vitest';

// ── Réplicas de las funciones puras de Register.tsx ─────────────────────────

const SEGMENTO_A_PLAN_PREFIJO: Record<string, string> = {};

function toPlanCodigo(segmento: string, nivel: string): string {
  const prefijo = SEGMENTO_A_PLAN_PREFIJO[segmento] ?? segmento;
  return `${prefijo}_${nivel}`;
}

const SEGMENTO_A_RUBRO: Record<string, string> = {
  TIENDA_BODEGA: 'TIENDA',
  TIENDA_ROPA:   'TIENDA_ROPA',
};

function toRubroOperativo(segmento: string): string {
  return SEGMENTO_A_RUBRO[segmento] ?? segmento;
}

const PRECIOS_FALLBACK: Record<string, { basico: number; pro: number }> = {
  VETERINARIA:       { basico: 109, pro: 189 },
  BOTICA:            { basico: 89,  pro: 169 },
  FARMACIA:          { basico: 89,  pro: 169 },
  TIENDA_ROPA:       { basico: 89,  pro: 169 },
  TIENDA_BODEGA:     { basico: 79,  pro: 149 },
  FERRETERIA:        { basico: 99,  pro: 179 },
  MINIMARKET:        { basico: 99,  pro: 179 },
  EMPRESA_SERVICIOS: { basico: 99,  pro: 179 },
  DEFAULT:           { basico: 89,  pro: 169 },
};

function getFallbackPrecio(segmento: string): { basico: number; pro: number } {
  return PRECIOS_FALLBACK[segmento] ?? PRECIOS_FALLBACK.DEFAULT;
}

// ── toPlanCodigo ─────────────────────────────────────────────────────────────

describe('toPlanCodigo', () => {
  it.each([
    ['BOTICA',            'BASICO', 'BOTICA_BASICO'],
    ['BOTICA',            'PRO',    'BOTICA_PRO'],
    ['FARMACIA',          'BASICO', 'FARMACIA_BASICO'],
    ['FARMACIA',          'PRO',    'FARMACIA_PRO'],
    ['VETERINARIA',       'BASICO', 'VETERINARIA_BASICO'],
    ['VETERINARIA',       'PRO',    'VETERINARIA_PRO'],
    ['TIENDA_ROPA',       'BASICO', 'TIENDA_ROPA_BASICO'],
    ['TIENDA_BODEGA',     'BASICO', 'TIENDA_BODEGA_BASICO'],
    ['TIENDA_BODEGA',     'PRO',    'TIENDA_BODEGA_PRO'],
    ['FERRETERIA',        'BASICO', 'FERRETERIA_BASICO'],
    ['MINIMARKET',        'PRO',    'MINIMARKET_PRO'],
    ['EMPRESA_SERVICIOS', 'BASICO', 'EMPRESA_SERVICIOS_BASICO'],
  ])('toPlanCodigo(%s, %s) === %s', (segmento, nivel, esperado) => {
    expect(toPlanCodigo(segmento, nivel)).toBe(esperado);
  });
});

// ── toRubroOperativo ─────────────────────────────────────────────────────────

describe('toRubroOperativo', () => {
  it('TIENDA_BODEGA → rubro operativo TIENDA (nunca TIENDA_BODEGA)', () => {
    expect(toRubroOperativo('TIENDA_BODEGA')).toBe('TIENDA');
  });

  it('TIENDA_ROPA → rubro operativo TIENDA_ROPA (rubro propio)', () => {
    expect(toRubroOperativo('TIENDA_ROPA')).toBe('TIENDA_ROPA');
  });

  it.each([
    'BOTICA', 'FARMACIA', 'VETERINARIA', 'MINIMARKET',
    'FERRETERIA', 'EMPRESA_SERVICIOS',
  ])('%s pasa sin transformación', (segmento) => {
    expect(toRubroOperativo(segmento)).toBe(segmento);
  });
});

// ── getFallbackPrecio ────────────────────────────────────────────────────────

describe('getFallbackPrecio', () => {
  it.each([
    ['VETERINARIA',       109, 189],
    ['TIENDA_BODEGA',     79,  149],
    ['FERRETERIA',        99,  179],
    ['MINIMARKET',        99,  179],
    ['EMPRESA_SERVICIOS', 99,  179],
    ['BOTICA',            89,  169],
    ['FARMACIA',          89,  169],
    ['TIENDA_ROPA',       89,  169],
  ])('%s → basico=%i, pro=%i', (segmento, basico, pro) => {
    const p = getFallbackPrecio(segmento);
    expect(p.basico).toBe(basico);
    expect(p.pro).toBe(pro);
  });

  it('segmento desconocido devuelve DEFAULT (89/169)', () => {
    expect(getFallbackPrecio('DESCONOCIDO')).toEqual({ basico: 89, pro: 169 });
    expect(getFallbackPrecio('')).toEqual({ basico: 89, pro: 169 });
  });
});

// ── Consistencia de precios fallback ─────────────────────────────────────────

describe('Precios fallback son consistentes', () => {
  it('TIENDA_BODEGA tiene precio menor que TIENDA_ROPA (79 vs 89)', () => {
    expect(getFallbackPrecio('TIENDA_BODEGA').basico).toBeLessThan(
      getFallbackPrecio('TIENDA_ROPA').basico
    );
  });

  it('VETERINARIA tiene precio Básico mayor que TIENDA_ROPA (109 vs 89)', () => {
    expect(getFallbackPrecio('VETERINARIA').basico).toBeGreaterThan(
      getFallbackPrecio('TIENDA_ROPA').basico
    );
  });

  it('BOTICA y FARMACIA tienen el mismo precio fallback', () => {
    expect(getFallbackPrecio('BOTICA')).toEqual(getFallbackPrecio('FARMACIA'));
  });
});
