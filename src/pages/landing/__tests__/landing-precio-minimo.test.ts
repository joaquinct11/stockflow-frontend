/**
 * Tests para la función precioMinimoDesde exportada desde LandingPage.
 * Verifica que el indicador "Desde S/ …" calcule el mínimo real
 * entre todos los segmentos activos, sin hardcodear ningún valor.
 */

import { describe, it, expect } from 'vitest';
import { precioMinimoDesde } from '../LandingPage';

// Datos representativos basados en la tabla comercial vigente (V118)
const PLANES_POR_SEGMENTO = [
  // FARMACIA_BOTICA
  [{ nivel: 'BASICO', precioMensual: 89 }, { nivel: 'PRO', precioMensual: 169 }],
  // VETERINARIA
  [{ nivel: 'BASICO', precioMensual: 109 }, { nivel: 'PRO', precioMensual: 199 }],
  // TIENDA_ROPA  ← precio mínimo esperado tras V118
  [{ nivel: 'BASICO', precioMensual: 69 }, { nivel: 'PRO', precioMensual: 119 }],
  // TIENDA_BODEGA
  [{ nivel: 'BASICO', precioMensual: 79 }, { nivel: 'PRO', precioMensual: 139 }],
  // FERRETERIA
  [{ nivel: 'BASICO', precioMensual: 89 }, { nivel: 'PRO', precioMensual: 169 }],
  // MINIMARKET
  [{ nivel: 'BASICO', precioMensual: 89 }, { nivel: 'PRO', precioMensual: 169 }],
  // EMPRESA_SERVICIOS
  [{ nivel: 'BASICO', precioMensual: 89 }, { nivel: 'PRO', precioMensual: 169 }],
];

describe('precioMinimoDesde — cálculo dinámico del precio mínimo', () => {
  it('devuelve 69 con los precios de catálogo actuales (TIENDA_ROPA_BASICO es el más barato)', () => {
    const min = precioMinimoDesde(PLANES_POR_SEGMENTO);
    expect(min).toBe(69);
  });

  it('no hardcodea el valor: si cambia el mínimo, el resultado cambia', () => {
    const plansMod = PLANES_POR_SEGMENTO.map((g, i) =>
      i === 2 ? [{ nivel: 'BASICO', precioMensual: 49 }, { nivel: 'PRO', precioMensual: 99 }] : g
    );
    expect(precioMinimoDesde(plansMod)).toBe(49);
  });

  it('ignora los planes PRO al calcular el mínimo', () => {
    const soloUnSegmento = [[{ nivel: 'PRO', precioMensual: 10 }, { nivel: 'BASICO', precioMensual: 200 }]];
    expect(precioMinimoDesde(soloUnSegmento)).toBe(200);
  });

  it('devuelve null cuando no hay ningún plan BASICO', () => {
    const sinBasico = [[{ nivel: 'PRO', precioMensual: 99 }]];
    expect(precioMinimoDesde(sinBasico)).toBeNull();
  });

  it('devuelve null con array vacío', () => {
    expect(precioMinimoDesde([])).toBeNull();
  });

  it('devuelve null cuando todos los grupos están vacíos', () => {
    expect(precioMinimoDesde([[], []])).toBeNull();
  });

  it('funciona con un único segmento', () => {
    expect(precioMinimoDesde([[{ nivel: 'BASICO', precioMensual: 89 }]])).toBe(89);
  });

  it('maneja precios iguales en varios segmentos (devuelve ese precio)', () => {
    const iguales = [
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 89 }],
    ];
    expect(precioMinimoDesde(iguales)).toBe(89);
  });

  it('el mínimo es siempre un precio de catálogo real, nunca un promedio', () => {
    const planes = [
      [{ nivel: 'BASICO', precioMensual: 100 }],
      [{ nivel: 'BASICO', precioMensual: 50 }],
      [{ nivel: 'BASICO', precioMensual: 80 }],
    ];
    // min=50, no el promedio (76.67)
    expect(precioMinimoDesde(planes)).toBe(50);
    expect(precioMinimoDesde(planes)).not.toBe(76.67);
  });
});

describe('precioMinimoDesde — estado de carga', () => {
  it('con grupos fulfilled parciales (como Promise.allSettled), usa solo los disponibles', () => {
    // Simula que 2 de 7 segmentos fallaron; los demás tienen precios
    const gruposParciales = [
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 79 }],
      // los 5 restantes fallaron → no se incluyen en el array
    ];
    expect(precioMinimoDesde(gruposParciales)).toBe(79);
  });
});
