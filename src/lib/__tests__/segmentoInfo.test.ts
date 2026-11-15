/**
 * Tests de segmentoInfo — catálogo centralizado de funcionalidades por segmento.
 *
 * Verifica:
 *  1. segmentoFromPlanCodigo extrae el segmento correctamente.
 *  2. getSegmentoInfo devuelve la info correcta y el fallback es OTRO.
 *  3. Todos los segmentos tienen configuración definida.
 *  4. Veterinaria no incluye funcionalidades no implementadas.
 *  5. Botica/Farmacia incluye DIGEMID/OPPF; Veterinaria no.
 *  6. Tienda Ropa incluye tallas/variantes; Botica no.
 *  7. Suscripciones legado (sin planCodigo) usan fallback OTRO.
 *  8. Los precios y límites NO están en la estructura (vienen de la API).
 */

import { describe, it, expect } from 'vitest';
import {
  segmentoFromPlanCodigo,
  getSegmentoInfo,
  SEGMENTO_MAP,
  type SegmentoInfo,
} from '../segmentoInfo';

// ── segmentoFromPlanCodigo ────────────────────────────────────────────────────

describe('segmentoFromPlanCodigo', () => {
  it.each([
    ['VETERINARIA_BASICO',    'VETERINARIA'],
    ['VETERINARIA_PRO',       'VETERINARIA'],
    ['FARMACIA_BOTICA_BASICO','FARMACIA_BOTICA'],
    ['FARMACIA_BOTICA_PRO',   'FARMACIA_BOTICA'],
    ['TIENDA_BODEGA_BASICO',  'TIENDA_BODEGA'],
    ['TIENDA_BODEGA_PRO',     'TIENDA_BODEGA'],
    ['TIENDA_ROPA_BASICO',    'TIENDA_ROPA'],
    ['FERRETERIA_BASICO',     'FERRETERIA'],
    ['MINIMARKET_PRO',        'MINIMARKET'],
    ['ALMACENES_BASICO',      'ALMACENES'],
    ['ALMACENES_PRO',         'ALMACENES'],
  ])('%s → %s', (planCodigo, expected) => {
    expect(segmentoFromPlanCodigo(planCodigo)).toBe(expected);
  });

  it('devuelve null para valores vacíos', () => {
    expect(segmentoFromPlanCodigo(null)).toBeNull();
    expect(segmentoFromPlanCodigo(undefined)).toBeNull();
    expect(segmentoFromPlanCodigo('')).toBeNull();
  });

  it('devuelve null para cadenas sin sufijo _BASICO o _PRO', () => {
    expect(segmentoFromPlanCodigo('VETERINARIA')).toBeNull();
    expect(segmentoFromPlanCodigo('BASICO')).toBeNull();
  });
});

// ── getSegmentoInfo — todos los segmentos definidos ──────────────────────────

describe('getSegmentoInfo — cobertura de segmentos', () => {
  const SEGMENTOS_REQUERIDOS = [
    'FARMACIA_BOTICA',
    'VETERINARIA',
    'TIENDA_ROPA',
    'TIENDA_BODEGA',
    'FERRETERIA',
    'MINIMARKET',
    'ALMACENES',
    'RESTAURANTE',
    'EMPRESA_SERVICIOS',
    'OTRO',
  ];

  it.each(SEGMENTOS_REQUERIDOS)('segmento %s tiene configuración definida', (seg) => {
    const info = getSegmentoInfo(seg);
    expect(info.title).toBeTruthy();
    expect(info.desc).toBeTruthy();
    expect(info.checks).toHaveLength(3);
    expect(info.tags.length).toBeGreaterThan(0);
    expect(info.featuresBasico.length).toBeGreaterThan(0);
    expect(info.featuresPro.length).toBeGreaterThan(0);
  });

  it('SEGMENTO_MAP tiene exactamente los 10 segmentos requeridos', () => {
    SEGMENTOS_REQUERIDOS.forEach(s => {
      expect(SEGMENTO_MAP).toHaveProperty(s);
    });
    expect(Object.keys(SEGMENTO_MAP)).toHaveLength(SEGMENTOS_REQUERIDOS.length);
  });
});

// ── Fallback legado ───────────────────────────────────────────────────────────

describe('Fallback para suscripciones legado', () => {
  it('getSegmentoInfo(null) devuelve OTRO, no undefined', () => {
    const info = getSegmentoInfo(null);
    expect(info).toBeDefined();
    expect(info.title).toBe(getSegmentoInfo('OTRO').title);
  });

  it('getSegmentoInfo(undefined) devuelve OTRO', () => {
    expect(getSegmentoInfo(undefined)).toEqual(getSegmentoInfo('OTRO'));
  });

  it('segmento desconocido devuelve fallback OTRO', () => {
    expect(getSegmentoInfo('SEGMENTO_INVENTADO')).toEqual(getSegmentoInfo('OTRO'));
  });
});

// ── Veterinaria — funcionalidades correctas ───────────────────────────────────

describe('VETERINARIA — funcionalidades verificadas', () => {
  const vet = getSegmentoInfo('VETERINARIA');

  it('muestra mascotas y citas', () => {
    const allFeatures = [...vet.featuresBasico, ...vet.checks];
    const textoCompleto = allFeatures.join(' ').toLowerCase();
    expect(textoCompleto).toMatch(/mascota/);
    expect(textoCompleto).toMatch(/cita/);
  });

  it('NO promete historia clínica, vacunas ni hospitalización', () => {
    const todo = [...vet.featuresBasico, ...vet.featuresPro, ...vet.checks, vet.desc].join(' ').toLowerCase();
    expect(todo).not.toMatch(/historia clínica/);
    expect(todo).not.toMatch(/historial clínico/);
    expect(todo).not.toMatch(/vacuna/);
    expect(todo).not.toMatch(/hospitaliz/);
    expect(todo).not.toMatch(/receta/);
  });

  it('tags NO incluye "Historial clínico"', () => {
    expect(vet.tags.map(t => t.toLowerCase())).not.toContain('historial clínico');
  });

  it('Pro de veterinaria incluye multi-sucursal', () => {
    const proText = vet.featuresPro.join(' ').toLowerCase();
    expect(proText).toMatch(/sucursal/);
  });
});

// ── FARMACIA_BOTICA — funcionalidades específicas ────────────────────────────

describe('FARMACIA_BOTICA — funcionalidades específicas', () => {
  const botica = getSegmentoInfo('FARMACIA_BOTICA');

  it('incluye DIGEMID en features o tags', () => {
    const todo = [...botica.featuresBasico, ...botica.tags].join(' ').toUpperCase();
    expect(todo).toContain('DIGEMID');
  });

  it('incluye OPPF en features o tags', () => {
    const todo = [...botica.featuresBasico, ...botica.tags].join(' ').toUpperCase();
    expect(todo).toContain('OPPF');
  });

  it('incluye control de lotes y vencimientos', () => {
    const basico = botica.featuresBasico.join(' ').toLowerCase();
    expect(basico).toMatch(/lote/);
    expect(basico).toMatch(/vencimiento/);
  });
});

// ── Separación de segmentos — sin mezcla ─────────────────────────────────────

describe('Separación entre segmentos — sin mezcla de contenido', () => {
  it('Veterinaria NO incluye DIGEMID ni OPPF', () => {
    const vet = getSegmentoInfo('VETERINARIA');
    const todo = [...vet.featuresBasico, ...vet.featuresPro, ...vet.tags].join(' ').toUpperCase();
    expect(todo).not.toContain('DIGEMID');
    expect(todo).not.toContain('OPPF');
  });

  it('FARMACIA_BOTICA NO incluye gestión de mascotas ni citas', () => {
    const botica = getSegmentoInfo('FARMACIA_BOTICA');
    const todo = [...botica.featuresBasico, ...botica.featuresPro, ...botica.checks].join(' ').toLowerCase();
    expect(todo).not.toMatch(/mascota/);
    expect(todo).not.toMatch(/\bcita\b/);
  });

  it('TIENDA_ROPA NO incluye DIGEMID ni mascotas', () => {
    const ropa = getSegmentoInfo('TIENDA_ROPA');
    const todo = [...ropa.featuresBasico, ...ropa.tags].join(' ').toUpperCase();
    expect(todo).not.toContain('DIGEMID');
    expect(todo.toLowerCase()).not.toMatch(/mascota/);
  });

  it('TIENDA_ROPA incluye tallas o variantes', () => {
    const ropa = getSegmentoInfo('TIENDA_ROPA');
    const todo = [...ropa.featuresBasico, ...ropa.checks, ...ropa.tags].join(' ').toLowerCase();
    const tieneVariante = todo.match(/talla/) || todo.match(/variante/) || todo.match(/color/);
    expect(tieneVariante).toBeTruthy();
  });
});

// ── Estructura — precios y límites ausentes ───────────────────────────────────

describe('Estructura — precios y límites no están en segmentoInfo', () => {
  it('SegmentoInfo no tiene campo precio', () => {
    const info = getSegmentoInfo('VETERINARIA') as SegmentoInfo & { precio?: unknown };
    expect(info.precio).toBeUndefined();
  });

  it('SegmentoInfo no tiene campo maxUsuarios', () => {
    const info = getSegmentoInfo('FARMACIA_BOTICA') as SegmentoInfo & { maxUsuarios?: unknown };
    expect(info.maxUsuarios).toBeUndefined();
  });

  it('featuresBasico NO hardcodea precios (ninguna feature contiene "S/")', () => {
    Object.values(SEGMENTO_MAP).forEach(info => {
      info.featuresBasico.forEach(f => {
        expect(f).not.toContain('S/');
      });
    });
  });
});

// ── Consistencia entre segmentos ─────────────────────────────────────────────

describe('Consistencia entre segmentos', () => {
  it('Básico y Pro del mismo segmento no son idénticos', () => {
    Object.entries(SEGMENTO_MAP).forEach(([seg, info]) => {
      expect(info.featuresBasico).not.toEqual(info.featuresPro);
      expect(info.featuresPro.join('')).not.toBe(info.featuresBasico.join('')), seg;
    });
  });

  it('featuresPro de todos los segmentos menciona "sucursal"', () => {
    Object.entries(SEGMENTO_MAP).forEach(([seg, info]) => {
      const proText = info.featuresPro.join(' ').toLowerCase();
      expect(proText, `segmento ${seg}`).toMatch(/sucursal/);
    });
  });

  it('planCodigo VETERINARIA_BASICO → info de veterinaria', () => {
    const segmento = segmentoFromPlanCodigo('VETERINARIA_BASICO');
    const info = getSegmentoInfo(segmento);
    expect(info.title).toBe(getSegmentoInfo('VETERINARIA').title);
  });

  it('planCodigo FARMACIA_BOTICA_PRO → info de farmacia/botica', () => {
    const segmento = segmentoFromPlanCodigo('FARMACIA_BOTICA_PRO');
    const info = getSegmentoInfo(segmento);
    expect(info.title).toBe(getSegmentoInfo('FARMACIA_BOTICA').title);
  });
});
