/**
 * Tests para funciones puras del formulario de registro.
 * Verifican que los segmentos comerciales se mapeen correctamente
 * a códigos de catálogo y rubros operativos del backend.
 */

import { describe, it, expect } from 'vitest';

// ── Réplicas de las funciones puras de Register.tsx ─────────────────────────

const SEGMENTO_A_PLAN_PREFIJO: Record<string, string> = {
  ALMACENES: 'ALMACEN',
};

function toPlanCodigo(segmento: string, nivel: string): string {
  const prefijo = SEGMENTO_A_PLAN_PREFIJO[segmento] ?? segmento;
  return `${prefijo}_${nivel}`;
}

const SEGMENTO_A_RUBRO: Record<string, string> = {
  TIENDA_BODEGA: 'TIENDA',
  TIENDA_ROPA:   'TIENDA_ROPA',
  ALMACENES:     'OTRO',
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
  RESTAURANTE:       { basico: 119, pro: 199 },
  EMPRESA_SERVICIOS: { basico: 99,  pro: 179 },
  ALMACENES:         { basico: 89,  pro: 169 },
  DEFAULT:           { basico: 89,  pro: 169 },
};

function getFallbackPrecio(segmento: string): { basico: number; pro: number } {
  return PRECIOS_FALLBACK[segmento] ?? PRECIOS_FALLBACK.DEFAULT;
}

const SEGMENTOS_VALIDOS = [
  'BOTICA','FARMACIA','VETERINARIA','MINIMARKET','FERRETERIA',
  'TIENDA_ROPA','TIENDA_BODEGA','RESTAURANTE','EMPRESA_SERVICIOS','ALMACENES','OTRO',
];

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
    ['RESTAURANTE',       'BASICO', 'RESTAURANTE_BASICO'],
    ['RESTAURANTE',       'PRO',    'RESTAURANTE_PRO'],
    ['EMPRESA_SERVICIOS', 'BASICO', 'EMPRESA_SERVICIOS_BASICO'],
    ['OTRO',              'BASICO', 'OTRO_BASICO'],
    ['OTRO',              'PRO',    'OTRO_PRO'],
  ])('toPlanCodigo(%s, %s) === %s', (segmento, nivel, esperado) => {
    expect(toPlanCodigo(segmento, nivel)).toBe(esperado);
  });

  it('ALMACENES con BASICO produce ALMACEN_BASICO (sin S, igual que el catálogo)', () => {
    expect(toPlanCodigo('ALMACENES', 'BASICO')).toBe('ALMACEN_BASICO');
  });

  it('ALMACENES con PRO produce ALMACEN_PRO (sin S, igual que el catálogo)', () => {
    expect(toPlanCodigo('ALMACENES', 'PRO')).toBe('ALMACEN_PRO');
  });

  it('ALMACENES nunca produce ALMACENES_BASICO (ese código no existe en el catálogo)', () => {
    expect(toPlanCodigo('ALMACENES', 'BASICO')).not.toBe('ALMACENES_BASICO');
    expect(toPlanCodigo('ALMACENES', 'PRO')).not.toBe('ALMACENES_PRO');
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

  it('ALMACENES → rubro operativo OTRO (transitional hasta migración)', () => {
    expect(toRubroOperativo('ALMACENES')).toBe('OTRO');
  });

  it.each([
    'BOTICA', 'FARMACIA', 'VETERINARIA', 'MINIMARKET',
    'FERRETERIA', 'RESTAURANTE', 'EMPRESA_SERVICIOS', 'OTRO',
  ])('%s pasa sin transformación', (segmento) => {
    expect(toRubroOperativo(segmento)).toBe(segmento);
  });
});

// ── getFallbackPrecio ────────────────────────────────────────────────────────

describe('getFallbackPrecio', () => {
  it.each([
    ['VETERINARIA',       109, 189],
    ['TIENDA_BODEGA',     79,  149],
    ['RESTAURANTE',       119, 199],
    ['FERRETERIA',        99,  179],
    ['MINIMARKET',        99,  179],
    ['EMPRESA_SERVICIOS', 99,  179],
    ['BOTICA',            89,  169],
    ['FARMACIA',          89,  169],
    ['TIENDA_ROPA',       89,  169],
    ['ALMACENES',         89,  169],
    ['OTRO',              89,  169],
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

// ── SEGMENTOS_VALIDOS (validación de ?segmento= en URL) ──────────────────────

describe('SEGMENTOS_VALIDOS', () => {
  it('contiene 11 segmentos del catálogo (incluye RESTAURANTE y ALMACENES)', () => {
    expect(SEGMENTOS_VALIDOS).toContain('RESTAURANTE');
    expect(SEGMENTOS_VALIDOS).toContain('ALMACENES');
    expect(SEGMENTOS_VALIDOS).toHaveLength(11);
  });

  it('rechaza segmento vacío', () => {
    expect(SEGMENTOS_VALIDOS.includes('')).toBe(false);
  });

  it('acepta ALMACENES (la landing lo envía; toPlanCodigo produce ALMACEN_BASICO)', () => {
    expect(SEGMENTOS_VALIDOS.includes('ALMACENES')).toBe(true);
  });

  it('rechaza FARMACIA_BOTICA (es segmento de landing, no de registro)', () => {
    expect(SEGMENTOS_VALIDOS.includes('FARMACIA_BOTICA')).toBe(false);
  });

  it('contiene tanto BOTICA como FARMACIA por separado', () => {
    expect(SEGMENTOS_VALIDOS).toContain('BOTICA');
    expect(SEGMENTOS_VALIDOS).toContain('FARMACIA');
  });
});

// ── Consistencia de precios fallback vs catálogo ─────────────────────────────

describe('Precios fallback son consistentes con el catálogo V110', () => {
  it('TIENDA_BODEGA tiene precio menor que TIENDA_ROPA (79 vs 89)', () => {
    expect(getFallbackPrecio('TIENDA_BODEGA').basico).toBeLessThan(
      getFallbackPrecio('TIENDA_ROPA').basico
    );
  });

  it('RESTAURANTE es el precio más alto del catálogo (119/199)', () => {
    const rubros = Object.keys(PRECIOS_FALLBACK).filter(k => k !== 'DEFAULT');
    const maxBasico = Math.max(...rubros.map(r => PRECIOS_FALLBACK[r].basico));
    expect(getFallbackPrecio('RESTAURANTE').basico).toBe(maxBasico);
  });

  it('VETERINARIA tiene precio Básico mayor que la mayoría (109)', () => {
    expect(getFallbackPrecio('VETERINARIA').basico).toBeGreaterThan(
      getFallbackPrecio('TIENDA_ROPA').basico
    );
  });

  it('ALMACENES y OTRO tienen el mismo precio fallback (89/169)', () => {
    expect(getFallbackPrecio('ALMACENES')).toEqual(getFallbackPrecio('OTRO'));
  });
});
