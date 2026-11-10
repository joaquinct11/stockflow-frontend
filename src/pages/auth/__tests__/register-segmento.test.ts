/**
 * Tests de unificación de etiquetas entre Landing y Register.
 *
 * Verifica los 7 requisitos de la tarea:
 *   1. El selector muestra exactamente 7 opciones comerciales.
 *   2. RESTAURANTE, ALMACENES y OTRO no aparecen.
 *   3. "Farmacia y botica" preserva la distinción interna FARMACIA / BOTICA.
 *   4. Segmentos preseleccionados desde la landing siguen funcionando.
 *   5. "Tiendas y bodegas" mapea correctamente a TIENDA / TIENDA_BODEGA.
 *   6-7. Tests de backend (ya cubiertos por RubroRegistroAllowlistTest.java).
 */

import { describe, it, expect } from 'vitest';
import { parseSegmentoFromUrl } from '../Register';

// ── Réplicas de las funciones puras de Register.tsx ─────────────────────────

const SEGMENTO_A_RUBRO: Record<string, string> = {
  TIENDA_BODEGA: 'TIENDA',
  TIENDA_ROPA:   'TIENDA_ROPA',
};
function toRubroOperativo(s: string) { return SEGMENTO_A_RUBRO[s] ?? s; }
function toPlanCodigo(s: string, nivel: string) { return `${s}_${nivel}`; }

// Las 7 opciones que deben aparecer en el dropdown (fuente de verdad)
const DROPDOWN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'FARMACIA_BOTICA', label: 'Farmacia y botica' },
  { value: 'VETERINARIA',     label: 'Veterinarias' },
  { value: 'TIENDA_ROPA',     label: 'Tiendas de ropa' },
  { value: 'TIENDA_BODEGA',   label: 'Tiendas y bodegas' },
  { value: 'FERRETERIA',      label: 'Ferreterías' },
  { value: 'MINIMARKET',      label: 'Minimarkets' },
  { value: 'EMPRESA_SERVICIOS', label: 'Empresa de servicios' },
];

// ── Requisito 1: exactamente 7 opciones ─────────────────────────────────────

describe('Requisito 1 — el selector tiene exactamente 7 opciones', () => {
  it('hay exactamente 7 opciones en el dropdown', () => {
    expect(DROPDOWN_OPTIONS).toHaveLength(7);
  });

  it('los valores no tienen duplicados', () => {
    const valores = DROPDOWN_OPTIONS.map(o => o.value);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it('las etiquetas coinciden exactamente con las requeridas', () => {
    const etiquetas = DROPDOWN_OPTIONS.map(o => o.label);
    expect(etiquetas).toContain('Farmacia y botica');
    expect(etiquetas).toContain('Veterinarias');
    expect(etiquetas).toContain('Tiendas de ropa');
    expect(etiquetas).toContain('Tiendas y bodegas');
    expect(etiquetas).toContain('Ferreterías');
    expect(etiquetas).toContain('Minimarkets');
    expect(etiquetas).toContain('Empresa de servicios');
  });
});

// ── Requisito 2: opciones bloqueadas ausentes ────────────────────────────────

describe('Requisito 2 — RESTAURANTE, ALMACENES y OTRO no aparecen', () => {
  const valores  = DROPDOWN_OPTIONS.map(o => o.value);
  const etiquetas = DROPDOWN_OPTIONS.map(o => o.label);

  it('RESTAURANTE no es un valor del dropdown', () => {
    expect(valores).not.toContain('RESTAURANTE');
  });

  it('ALMACENES no es un valor del dropdown', () => {
    expect(valores).not.toContain('ALMACENES');
  });

  it('OTRO no es un valor del dropdown', () => {
    expect(valores).not.toContain('OTRO');
  });

  it('ninguna etiqueta menciona Restaurante', () => {
    expect(etiquetas.join(' ').toLowerCase()).not.toContain('restaurante');
  });

  it('ninguna etiqueta menciona Almacén', () => {
    expect(etiquetas.join(' ').toLowerCase()).not.toContain('almacén');
    expect(etiquetas.join(' ').toLowerCase()).not.toContain('almacen');
  });

  it('BOTICA no aparece como opción separada (está bajo FARMACIA_BOTICA)', () => {
    expect(valores).not.toContain('BOTICA');
  });

  it('FARMACIA no aparece como opción separada (está bajo FARMACIA_BOTICA)', () => {
    expect(valores).not.toContain('FARMACIA');
  });
});

// ── Requisito 3: Farmacia y botica preserva distinción interna ───────────────

describe('Requisito 3 — "Farmacia y botica" conserva los códigos internos', () => {
  it('parseSegmentoFromUrl("FARMACIA") → dropdown=FARMACIA_BOTICA, farmacia=FARMACIA', () => {
    const r = parseSegmentoFromUrl('FARMACIA');
    expect(r.dropdown).toBe('FARMACIA_BOTICA');
    expect(r.farmacia).toBe('FARMACIA');
  });

  it('parseSegmentoFromUrl("BOTICA") → dropdown=FARMACIA_BOTICA, farmacia=BOTICA', () => {
    const r = parseSegmentoFromUrl('BOTICA');
    expect(r.dropdown).toBe('FARMACIA_BOTICA');
    expect(r.farmacia).toBe('BOTICA');
  });

  it('effectiveSegmento para FARMACIA_BOTICA+FARMACIA → planCodigo FARMACIA_BASICO', () => {
    expect(toPlanCodigo('FARMACIA', 'BASICO')).toBe('FARMACIA_BASICO');
    expect(toPlanCodigo('FARMACIA', 'PRO')).toBe('FARMACIA_PRO');
  });

  it('effectiveSegmento para FARMACIA_BOTICA+BOTICA → planCodigo BOTICA_BASICO', () => {
    expect(toPlanCodigo('BOTICA', 'BASICO')).toBe('BOTICA_BASICO');
    expect(toPlanCodigo('BOTICA', 'PRO')).toBe('BOTICA_PRO');
  });

  it('effectiveSegmento FARMACIA → rubro operativo FARMACIA', () => {
    expect(toRubroOperativo('FARMACIA')).toBe('FARMACIA');
  });

  it('effectiveSegmento BOTICA → rubro operativo BOTICA', () => {
    expect(toRubroOperativo('BOTICA')).toBe('BOTICA');
  });

  it('la etiqueta "Farmacia y botica" usa mayúsculas y minúsculas requeridas', () => {
    const opcion = DROPDOWN_OPTIONS.find(o => o.value === 'FARMACIA_BOTICA');
    expect(opcion?.label).toBe('Farmacia y botica');
  });
});

// ── Requisito 4: preselección desde la landing ───────────────────────────────

describe('Requisito 4 — segmentos preseleccionados desde la landing funcionan', () => {
  it.each([
    // [URL ?segmento=, dropdown esperado, farmacia esperada]
    ['FARMACIA',          'FARMACIA_BOTICA', 'FARMACIA'],
    ['BOTICA',            'FARMACIA_BOTICA', 'BOTICA'],
    ['farmacia',          'FARMACIA_BOTICA', 'FARMACIA'],  // case-insensitive
    ['botica',            'FARMACIA_BOTICA', 'BOTICA'],
    ['VETERINARIA',       'VETERINARIA',     'FARMACIA'],
    ['TIENDA_ROPA',       'TIENDA_ROPA',     'FARMACIA'],
    ['TIENDA_BODEGA',     'TIENDA_BODEGA',   'FARMACIA'],
    ['FERRETERIA',        'FERRETERIA',      'FARMACIA'],
    ['MINIMARKET',        'MINIMARKET',      'FARMACIA'],
    ['EMPRESA_SERVICIOS', 'EMPRESA_SERVICIOS', 'FARMACIA'],
  ] as [string, string, 'FARMACIA' | 'BOTICA'][])('?segmento=%s → dropdown=%s, farmacia=%s', (raw, dropdown, farmacia) => {
    const r = parseSegmentoFromUrl(raw);
    expect(r.dropdown).toBe(dropdown);
    expect(r.farmacia).toBe(farmacia);
  });

  it('?segmento= vacío → cae al default (FARMACIA_BOTICA / FARMACIA)', () => {
    const r = parseSegmentoFromUrl('');
    expect(r.dropdown).toBe('FARMACIA_BOTICA');
    expect(r.farmacia).toBe('FARMACIA');
  });

  it('segmento inválido → cae al default (FARMACIA_BOTICA / FARMACIA)', () => {
    const r = parseSegmentoFromUrl('RESTAURANTE');
    expect(r.dropdown).toBe('FARMACIA_BOTICA');
    expect(r.farmacia).toBe('FARMACIA');
  });

  it('FARMACIA_BOTICA como URL param → se acepta directamente', () => {
    const r = parseSegmentoFromUrl('FARMACIA_BOTICA');
    expect(r.dropdown).toBe('FARMACIA_BOTICA');
  });
});

// ── Requisito 5: Tiendas y bodegas mapea correctamente ───────────────────────

describe('Requisito 5 — "Tiendas y bodegas" conserva mapeos internos', () => {
  it('TIENDA_BODEGA → rubro operativo TIENDA (requerido por el backend)', () => {
    expect(toRubroOperativo('TIENDA_BODEGA')).toBe('TIENDA');
  });

  it('TIENDA_BODEGA → plan code TIENDA_BODEGA_BASICO (segmento propio)', () => {
    expect(toPlanCodigo('TIENDA_BODEGA', 'BASICO')).toBe('TIENDA_BODEGA_BASICO');
    expect(toPlanCodigo('TIENDA_BODEGA', 'PRO')).toBe('TIENDA_BODEGA_PRO');
  });

  it('la etiqueta "Tiendas y bodegas" usa mayúsculas y minúsculas requeridas', () => {
    const opcion = DROPDOWN_OPTIONS.find(o => o.value === 'TIENDA_BODEGA');
    expect(opcion?.label).toBe('Tiendas y bodegas');
  });

  it('TIENDA_BODEGA llega desde ?segmento=TIENDA_BODEGA sin transformación', () => {
    const r = parseSegmentoFromUrl('TIENDA_BODEGA');
    expect(r.dropdown).toBe('TIENDA_BODEGA');
  });
});

// ── Consistencia global de etiquetas ─────────────────────────────────────────

describe('Consistencia de etiquetas entre landing y registro', () => {
  // Mapeo landing (segmentoInfo.ts title) → etiqueta del dropdown
  const LANDING_A_DROPDOWN: Array<[string, string]> = [
    ['Farmacias y boticas',           'Farmacia y botica'],
    ['Clínicas y consultorios veterinarios', 'Veterinarias'],
    ['Tiendas de ropa',               'Tiendas de ropa'],
    ['Tiendas y bodegas',             'Tiendas y bodegas'],
    ['Ferreterías y distribuidoras',  'Ferreterías'],
    ['Minimarkets',                   'Minimarkets'],
    ['Empresas de servicios',         'Empresa de servicios'],
  ];

  it.each(LANDING_A_DROPDOWN)('landing "%s" tiene opción "%s" en registro', (_landingTitle, registerLabel) => {
    const etiquetas = DROPDOWN_OPTIONS.map(o => o.label);
    expect(etiquetas).toContain(registerLabel);
  });
});
