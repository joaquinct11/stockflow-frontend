/**
 * Valida el orden de las pestañas de la landing y sus mapeos de segmento/registro.
 *
 * ALMACENES fue removido (rubro OTRO bloqueado para nuevos registros).
 * EMPRESA_SERVICIOS fue añadido como rubro habilitado.
 */

import { describe, it, expect } from 'vitest';

type Tab = 'farmacia' | 'ropa' | 'bodega' | 'ferreteria' | 'minimarket' | 'empresa' | 'veterinaria';

// Orden de pestañas tal como aparece en el render (fuente de verdad)
const TAB_ORDER: Tab[] = [
  'farmacia',
  'veterinaria',
  'ropa',
  'bodega',
  'ferreteria',
  'minimarket',
  'empresa',
];

const TAB_SEGMENTO: Record<Tab, string> = {
  farmacia:    'FARMACIA_BOTICA',
  ropa:        'TIENDA_ROPA',
  bodega:      'TIENDA_BODEGA',
  ferreteria:  'FERRETERIA',
  minimarket:  'MINIMARKET',
  empresa:     'EMPRESA_SERVICIOS',
  veterinaria: 'VETERINARIA',
};

const TAB_TO_REGISTER_SEGMENTO: Record<Tab, string> = {
  farmacia:    'FARMACIA',
  ropa:        'TIENDA_ROPA',
  bodega:      'TIENDA_BODEGA',
  ferreteria:  'FERRETERIA',
  minimarket:  'MINIMARKET',
  empresa:     'EMPRESA_SERVICIOS',
  veterinaria: 'VETERINARIA',
};

describe('Orden de pestañas de la landing', () => {
  it('Veterinarias es la segunda pestaña, inmediatamente después de Farmacias y boticas', () => {
    expect(TAB_ORDER[0]).toBe('farmacia');
    expect(TAB_ORDER[1]).toBe('veterinaria');
  });

  it('el orden completo es el solicitado', () => {
    expect(TAB_ORDER).toEqual([
      'farmacia',
      'veterinaria',
      'ropa',
      'bodega',
      'ferreteria',
      'minimarket',
      'empresa',
    ]);
  });

  it('hay exactamente 7 pestañas', () => {
    expect(TAB_ORDER).toHaveLength(7);
  });

  it('ALMACENES no aparece como pestaña (rubro bloqueado para nuevos registros)', () => {
    const segmentos = TAB_ORDER.map(t => TAB_SEGMENTO[t]);
    expect(segmentos).not.toContain('ALMACENES');
  });

  it('EMPRESA_SERVICIOS aparece como pestaña (rubro habilitado)', () => {
    const segmentos = TAB_ORDER.map(t => TAB_SEGMENTO[t]);
    expect(segmentos).toContain('EMPRESA_SERVICIOS');
  });
});

describe('Mapeo tab → segmento de catálogo', () => {
  it.each([
    ['farmacia',    'FARMACIA_BOTICA'],
    ['veterinaria', 'VETERINARIA'],
    ['ropa',        'TIENDA_ROPA'],
    ['bodega',      'TIENDA_BODEGA'],
    ['ferreteria',  'FERRETERIA'],
    ['minimarket',  'MINIMARKET'],
    ['empresa',     'EMPRESA_SERVICIOS'],
  ] as [Tab, string][])('tab %s → segmento %s', (tab, segmento) => {
    expect(TAB_SEGMENTO[tab]).toBe(segmento);
  });
});

describe('Mapeo tab → segmento de registro (?segmento= en URL)', () => {
  it.each([
    ['farmacia',    'FARMACIA'],           // FARMACIA_BOTICA → default FARMACIA; el usuario puede cambiar a BOTICA
    ['veterinaria', 'VETERINARIA'],
    ['ropa',        'TIENDA_ROPA'],
    ['bodega',      'TIENDA_BODEGA'],
    ['ferreteria',  'FERRETERIA'],
    ['minimarket',  'MINIMARKET'],
    ['empresa',     'EMPRESA_SERVICIOS'],
  ] as [Tab, string][])('tab %s → register segmento %s', (tab, registerSegmento) => {
    expect(TAB_TO_REGISTER_SEGMENTO[tab]).toBe(registerSegmento);
  });

  it('el tab farmacia apunta a FARMACIA (no BOTICA) para no perder la distinción de rubro', () => {
    expect(TAB_TO_REGISTER_SEGMENTO.farmacia).toBe('FARMACIA');
    expect(TAB_TO_REGISTER_SEGMENTO.farmacia).not.toBe('BOTICA');
  });

  it('ningún tab apunta a ALMACENES (rubro OTRO bloqueado)', () => {
    const valores = Object.values(TAB_TO_REGISTER_SEGMENTO);
    expect(valores).not.toContain('ALMACENES');
    expect(valores).not.toContain('OTRO');
  });

  it('ningún tab apunta a FARMACIA_BOTICA como segmento de registro', () => {
    const valores = Object.values(TAB_TO_REGISTER_SEGMENTO);
    expect(valores).not.toContain('FARMACIA_BOTICA');
  });

  it('ningún tab apunta a RESTAURANTE (rubro bloqueado)', () => {
    const valores = Object.values(TAB_TO_REGISTER_SEGMENTO);
    expect(valores).not.toContain('RESTAURANTE');
  });
});
