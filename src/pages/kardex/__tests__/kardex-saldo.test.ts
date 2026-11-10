/**
 * Tests para calcularSaldoKardex — función pura de reconstrucción de saldo histórico.
 * Cubre CONSUMO_OT, DEVOLUCION_OT y la compatibilidad con tipos existentes.
 */

import { describe, it, expect } from 'vitest';
import { calcularSaldoKardex } from '../KardexPage';
import type { MovimientoInventarioDTO } from '../../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mov(
  tipo: MovimientoInventarioDTO['tipo'],
  cantidad: number,
  id = Math.random(),
): MovimientoInventarioDTO {
  return {
    id,
    productoId: 1,
    tipo,
    cantidad,
    descripcion: '',
    tenantId: 'test',
  };
}

function saldos(movimientos: MovimientoInventarioDTO[], stockActual: number) {
  return calcularSaldoKardex(movimientos, stockActual).map((f) => f.stockAcumulado);
}

function clasificacion(movimientos: MovimientoInventarioDTO[], stockActual: number) {
  return calcularSaldoKardex(movimientos, stockActual).map((f) => ({
    esEntrada: f.esEntrada,
    esSalida: f.esSalida,
    esAjuste: f.esAjuste,
  }));
}

// ── Caso principal del spec ────────────────────────────────────────────────────
// Movimientos: SALDO_INICIAL(23) → CONSUMO_OT(1) → CONSUMO_OT(5) → DEVOLUCION_OT(2)
// stockActual = 19 (23 - 1 - 5 + 2)
// Saldos esperados:          23      22             17             19

describe('caso principal spec', () => {
  const movimientos: MovimientoInventarioDTO[] = [
    mov('SALDO_INICIAL', 23),
    mov('CONSUMO_OT', 1),
    mov('CONSUMO_OT', 5),
    mov('DEVOLUCION_OT', 2),
  ];
  const stockActual = 19; // 23 - 1 - 5 + 2

  it('reconstruye saldos cronológicos correctamente', () => {
    expect(saldos(movimientos, stockActual)).toEqual([23, 22, 17, 19]);
  });

  it('el último saldo coincide con stockActual', () => {
    const filas = calcularSaldoKardex(movimientos, stockActual);
    expect(filas[filas.length - 1].stockAcumulado).toBe(stockActual);
  });

  it('CONSUMO_OT se clasifica como esSalida', () => {
    const c = clasificacion(movimientos, stockActual);
    expect(c[1]).toEqual({ esEntrada: false, esSalida: true, esAjuste: false });
    expect(c[2]).toEqual({ esEntrada: false, esSalida: true, esAjuste: false });
  });

  it('DEVOLUCION_OT se clasifica como esEntrada', () => {
    const c = clasificacion(movimientos, stockActual);
    expect(c[3]).toEqual({ esEntrada: true, esSalida: false, esAjuste: false });
  });
});

// ── CONSUMO_OT unitario ────────────────────────────────────────────────────────

describe('CONSUMO_OT', () => {
  it('resta 1 unidad del saldo', () => {
    expect(saldos([mov('CONSUMO_OT', 1)], 22)).toEqual([22]);
  });

  it('resta 5 unidades del saldo', () => {
    expect(saldos([mov('CONSUMO_OT', 5)], 17)).toEqual([17]);
  });

  it('dos consumos se restan en orden cronológico', () => {
    // stockActual=17, net=-6, inicio=23
    expect(saldos([mov('CONSUMO_OT', 1), mov('CONSUMO_OT', 5)], 17)).toEqual([22, 17]);
  });

  it('el saldo final coincide con stockActual al solo haber consumos en el período', () => {
    const filas = calcularSaldoKardex([mov('CONSUMO_OT', 3), mov('CONSUMO_OT', 2)], 10);
    expect(filas[filas.length - 1].stockAcumulado).toBe(10);
  });
});

// ── DEVOLUCION_OT ──────────────────────────────────────────────────────────────

describe('DEVOLUCION_OT', () => {
  it('suma 2 unidades al saldo', () => {
    // stockActual=19, net=+2, inicio=17
    expect(saldos([mov('DEVOLUCION_OT', 2)], 19)).toEqual([19]);
  });

  it('el saldo final coincide con stockActual al solo haber una devolución OT', () => {
    const filas = calcularSaldoKardex([mov('DEVOLUCION_OT', 4)], 24);
    expect(filas[filas.length - 1].stockAcumulado).toBe(24);
  });
});

// ── Consumo y devolución combinados ───────────────────────────────────────────

describe('consumo y devolución combinados', () => {
  it('consumo OT luego devolución OT produce saldo correcto', () => {
    // consumo 5, devolución 3 → net = -5+3 = -2 → inicio = stockActual + 2
    // stockActual = 18, inicio = 20
    // fila 1: 20 - 5 = 15
    // fila 2: 15 + 3 = 18
    expect(saldos([mov('CONSUMO_OT', 5), mov('DEVOLUCION_OT', 3)], 18)).toEqual([15, 18]);
  });

  it('múltiples consumos y devolución respetan orden cronológico', () => {
    // CONSUMO(1), CONSUMO(5), DEVOLUCION(2) → net=-4 → inicio = stockActual+4
    // stockActual=19, inicio=23
    expect(
      saldos([mov('CONSUMO_OT', 1), mov('CONSUMO_OT', 5), mov('DEVOLUCION_OT', 2)], 19),
    ).toEqual([22, 17, 19]);
  });
});

// ── Saldo inicial + movimientos anteriores ────────────────────────────────────

describe('saldo inicial', () => {
  it('SALDO_INICIAL crea el saldo de partida correcto', () => {
    // SALDO_INICIAL(23), CONSUMO_OT(1), CONSUMO_OT(5)
    // net = 23 - 1 - 5 = 17 → inicio = 17 - 17 = 0
    expect(saldos([mov('SALDO_INICIAL', 23), mov('CONSUMO_OT', 1), mov('CONSUMO_OT', 5)], 17))
      .toEqual([23, 22, 17]);
  });
});

// ── Compatibilidad con tipos existentes ──────────────────────────────────────

describe('compatibilidad tipos existentes', () => {
  it('ENTRADA se clasifica como esEntrada y suma al saldo', () => {
    expect(saldos([mov('ENTRADA', 10)], 10)).toEqual([10]);
    const c = clasificacion([mov('ENTRADA', 10)], 10);
    expect(c[0].esEntrada).toBe(true);
  });

  it('SALIDA se clasifica como esSalida y resta del saldo', () => {
    expect(saldos([mov('SALIDA', 3)], 7)).toEqual([7]);
    const c = clasificacion([mov('SALIDA', 3)], 7);
    expect(c[0].esSalida).toBe(true);
  });

  it('DEVOLUCION se clasifica como esEntrada y suma al saldo', () => {
    expect(saldos([mov('DEVOLUCION', 2)], 12)).toEqual([12]);
    const c = clasificacion([mov('DEVOLUCION', 2)], 12);
    expect(c[0].esEntrada).toBe(true);
  });

  it('AJUSTE se clasifica como esAjuste y suma al saldo', () => {
    expect(saldos([mov('AJUSTE', 5)], 15)).toEqual([15]);
    const c = clasificacion([mov('AJUSTE', 5)], 15);
    expect(c[0].esAjuste).toBe(true);
  });

  it('tipos sin clasificar (MERMA, AJUSTE_PRECIO) no alteran el saldo', () => {
    // stockActual=10, net=0 (MERMA no clasificado), inicio=10, después no cambia
    expect(saldos([mov('MERMA', 2)], 10)).toEqual([10]);
  });

  it('CONSUMO_OT y SALIDA se comportan igual en el saldo', () => {
    const conSalida = saldos([mov('SALIDA', 3)], 7);
    const conConsumo = saldos([mov('CONSUMO_OT', 3)], 7);
    expect(conSalida).toEqual(conConsumo);
  });

  it('DEVOLUCION_OT y DEVOLUCION se comportan igual en el saldo', () => {
    const conDev = saldos([mov('DEVOLUCION', 2)], 12);
    const conDevOt = saldos([mov('DEVOLUCION_OT', 2)], 12);
    expect(conDev).toEqual(conDevOt);
  });

  it('lista vacía devuelve array vacío', () => {
    expect(calcularSaldoKardex([], 20)).toEqual([]);
  });
});
