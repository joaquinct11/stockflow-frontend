/**
 * Tests para la lógica de saldo del Kardex en InventarioList.tsx.
 * Extrae y verifica la misma lógica inline del componente de forma aislada.
 */

import { describe, it, expect } from 'vitest';

// Replica exacta de la lógica inline del componente (sorted.forEach)
function calcularFilas(movimientos: Array<{ tipo?: string; cantidad?: number }>) {
  let stockAcumulado = 0;
  return movimientos.map((m) => {
    const esSalida = m.tipo === 'SALIDA';
    const esMerma = m.tipo === 'MERMA';
    const esDescuento = m.tipo === 'SALIDA' || m.tipo === 'MERMA' || m.tipo === 'CONSUMO_OT';
    const esEntrada = ['ENTRADA', 'SALDO_INICIAL', 'DEVOLUCION', 'DEVOLUCION_OT'].includes(m.tipo ?? '');
    if (esEntrada) stockAcumulado += m.cantidad ?? 0;
    else if (m.tipo === 'AJUSTE') stockAcumulado = m.cantidad ?? stockAcumulado;
    else if (esDescuento) stockAcumulado -= m.cantidad ?? 0;
    return { tipo: m.tipo, cantidad: m.cantidad, esEntrada, esSalida, esMerma, esDescuento, stockAcumulado };
  });
}

function saldos(movs: Array<{ tipo?: string; cantidad?: number }>) {
  return calcularFilas(movs).map((f) => f.stockAcumulado);
}

// ── Caso principal del spec ───────────────────────────────────────────────────
// SALDO_INICIAL(23) → CONSUMO_OT(1) → CONSUMO_OT(5) → DEVOLUCION_OT(2)
// Saldos esperados: 23 → 22 → 17 → 19

describe('caso principal spec', () => {
  const movs = [
    { tipo: 'SALDO_INICIAL', cantidad: 23 },
    { tipo: 'CONSUMO_OT', cantidad: 1 },
    { tipo: 'CONSUMO_OT', cantidad: 5 },
    { tipo: 'DEVOLUCION_OT', cantidad: 2 },
  ];

  it('reconstruye saldos correctamente: 23 → 22 → 17 → 19', () => {
    expect(saldos(movs)).toEqual([23, 22, 17, 19]);
  });

  it('el saldo final es 19, no 23', () => {
    const filas = calcularFilas(movs);
    expect(filas[filas.length - 1].stockAcumulado).toBe(19);
    expect(filas[filas.length - 1].stockAcumulado).not.toBe(23);
  });
});

// ── CONSUMO_OT ────────────────────────────────────────────────────────────────

describe('CONSUMO_OT', () => {
  it('se clasifica como esDescuento (resta del saldo)', () => {
    const [fila] = calcularFilas([{ tipo: 'CONSUMO_OT', cantidad: 5 }]);
    expect(fila.esDescuento).toBe(true);
    expect(fila.esEntrada).toBe(false);
  });

  it('resta 1 unidad del saldo', () => {
    expect(saldos([{ tipo: 'CONSUMO_OT', cantidad: 1 }])).toEqual([-1]);
  });

  it('resta 5 unidades del saldo', () => {
    expect(saldos([{ tipo: 'CONSUMO_OT', cantidad: 5 }])).toEqual([-5]);
  });

  it('dos consumos se restan en orden cronológico', () => {
    expect(saldos([
      { tipo: 'CONSUMO_OT', cantidad: 1 },
      { tipo: 'CONSUMO_OT', cantidad: 5 },
    ])).toEqual([-1, -6]);
  });

  it('NO se clasifica como esSalida (sin expand de lotes)', () => {
    const [fila] = calcularFilas([{ tipo: 'CONSUMO_OT', cantidad: 3 }]);
    expect(fila.esSalida).toBe(false);
  });
});

// ── DEVOLUCION_OT ─────────────────────────────────────────────────────────────

describe('DEVOLUCION_OT', () => {
  it('se clasifica como esEntrada (suma al saldo)', () => {
    const [fila] = calcularFilas([{ tipo: 'DEVOLUCION_OT', cantidad: 2 }]);
    expect(fila.esEntrada).toBe(true);
    expect(fila.esDescuento).toBe(false);
  });

  it('suma 2 unidades al saldo', () => {
    expect(saldos([{ tipo: 'DEVOLUCION_OT', cantidad: 2 }])).toEqual([2]);
  });

  it('múltiples devoluciones OT se acumulan correctamente', () => {
    expect(saldos([
      { tipo: 'DEVOLUCION_OT', cantidad: 2 },
      { tipo: 'DEVOLUCION_OT', cantidad: 3 },
    ])).toEqual([2, 5]);
  });
});

// ── Consumo y devolución combinados ──────────────────────────────────────────

describe('consumo y devolución OT combinados', () => {
  it('consumo luego devolución produce saldo correcto', () => {
    expect(saldos([
      { tipo: 'CONSUMO_OT', cantidad: 5 },
      { tipo: 'DEVOLUCION_OT', cantidad: 3 },
    ])).toEqual([-5, -2]);
  });

  it('SALDO_INICIAL + consumos + devolución', () => {
    expect(saldos([
      { tipo: 'SALDO_INICIAL', cantidad: 23 },
      { tipo: 'CONSUMO_OT', cantidad: 1 },
      { tipo: 'CONSUMO_OT', cantidad: 5 },
      { tipo: 'DEVOLUCION_OT', cantidad: 2 },
    ])).toEqual([23, 22, 17, 19]);
  });
});

// ── Compatibilidad tipos existentes ──────────────────────────────────────────

describe('compatibilidad tipos existentes', () => {
  it('ENTRADA sigue sumando al saldo', () => {
    const [f] = calcularFilas([{ tipo: 'ENTRADA', cantidad: 10 }]);
    expect(f.esEntrada).toBe(true);
    expect(f.stockAcumulado).toBe(10);
  });

  it('SALIDA sigue restando del saldo', () => {
    const [f] = calcularFilas([{ tipo: 'SALIDA', cantidad: 3 }]);
    expect(f.esSalida).toBe(true);
    expect(f.esDescuento).toBe(true);
    expect(f.stockAcumulado).toBe(-3);
  });

  it('DEVOLUCION (normal) sigue siendo esEntrada', () => {
    const [f] = calcularFilas([{ tipo: 'DEVOLUCION', cantidad: 2 }]);
    expect(f.esEntrada).toBe(true);
    expect(f.stockAcumulado).toBe(2);
  });

  it('MERMA sigue restando del saldo', () => {
    const [f] = calcularFilas([{ tipo: 'MERMA', cantidad: 1 }]);
    expect(f.esMerma).toBe(true);
    expect(f.esDescuento).toBe(true);
    expect(f.stockAcumulado).toBe(-1);
  });

  it('AJUSTE reemplaza el saldo acumulado', () => {
    const filas = calcularFilas([
      { tipo: 'ENTRADA', cantidad: 10 },
      { tipo: 'AJUSTE', cantidad: 15 },
    ]);
    expect(filas[1].stockAcumulado).toBe(15);
  });

  it('CONSUMO_OT y SALIDA tienen el mismo efecto en saldo', () => {
    expect(saldos([{ tipo: 'SALIDA', cantidad: 3 }])).toEqual(
      saldos([{ tipo: 'CONSUMO_OT', cantidad: 3 }]),
    );
  });

  it('DEVOLUCION_OT y DEVOLUCION tienen el mismo efecto en saldo', () => {
    expect(saldos([{ tipo: 'DEVOLUCION', cantidad: 2 }])).toEqual(
      saldos([{ tipo: 'DEVOLUCION_OT', cantidad: 2 }]),
    );
  });

  it('lista vacía devuelve array vacío', () => {
    expect(calcularFilas([])).toEqual([]);
  });
});
