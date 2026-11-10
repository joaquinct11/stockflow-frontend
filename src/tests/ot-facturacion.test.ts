/**
 * Tests de lógica pura para la facturación de OT (Fase 2D — ajuste mat+serv).
 * Verifica cálculos y separación de materiales vs servicios.
 */

import { describe, it, expect } from 'vitest';
import type { OtConsumoMaterialDTO } from '../services/ordenTrabajo.service';

// ── Helpers replicados del modal ──────────────────────────────────────────────

function makeConsumo(
  id: number,
  precio: number,
  cantidad: number,
  tipo: string | null = 'PRODUTO'
): OtConsumoMaterialDTO {
  return {
    id,
    ordenTrabajoId: 1,
    productoId: id,
    presentacionId: null,
    factorPresentacion: 1,
    cantidadPresentacion: cantidad,
    cantidadBase: cantidad,
    precioUnitario: precio,
    notas: null,
    registradoPor: null,
    createdAt: '2026-01-01T00:00:00',
    lotes: [],
    productoNombre: `Producto ${id}`,
    presentacionNombre: null,
    registradoPorNombre: null,
    productoTipo: tipo,
    cantidadDevuelta: 0,
    cantidadClasificada: 0,
    devoluciones: [],
    clasificaciones: [],
  };
}

function calcularTotalMateriales(consumos: OtConsumoMaterialDTO[]): number {
  return consumos
    .filter(c => c.productoTipo !== 'SERVICIO')
    .reduce((acc, c) => acc + (c.precioUnitario ?? 0) * c.cantidadBase, 0);
}

function calcularTotalServicios(consumos: OtConsumoMaterialDTO[]): number {
  return consumos
    .filter(c => c.productoTipo === 'SERVICIO')
    .reduce((acc, c) => acc + (c.precioUnitario ?? 0) * c.cantidadBase, 0);
}

function calcularTotalVenta(consumos: OtConsumoMaterialDTO[], montoManoObra: number): number {
  return calcularTotalMateriales(consumos) + calcularTotalServicios(consumos) + montoManoObra;
}

function isFormValido(vendedorId: string, metodoPago: string, montoManoObra: number): boolean {
  return !!vendedorId && !!metodoPago && montoManoObra >= 0;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Facturación OT — separación de materiales y servicios', () => {
  it('FT1: materiales y servicios se separan correctamente', () => {
    const consumos = [
      makeConsumo(1, 50, 2, 'PRODUTO'),
      makeConsumo(2, 80, 1, 'SERVICIO'),
    ];
    const mats = consumos.filter(c => c.productoTipo !== 'SERVICIO');
    const servs = consumos.filter(c => c.productoTipo === 'SERVICIO');
    expect(mats).toHaveLength(1);
    expect(servs).toHaveLength(1);
  });

  it('FT2: subtotal de materiales correcto', () => {
    const consumos = [
      makeConsumo(1, 50, 2, 'PRODUTO'),
      makeConsumo(2, 80, 1, 'SERVICIO'),
    ];
    // 50×2 = 100 (solo material)
    expect(calcularTotalMateriales(consumos)).toBeCloseTo(100);
  });

  it('FT3: subtotal de servicios correcto', () => {
    const consumos = [
      makeConsumo(1, 50, 2, 'PRODUTO'),
      makeConsumo(2, 80, 1, 'SERVICIO'),
    ];
    // 80×1 = 80 (solo servicio)
    expect(calcularTotalServicios(consumos)).toBeCloseTo(80);
  });

  it('FT4: total = materiales + servicios + mano de obra', () => {
    const consumos = [
      makeConsumo(1, 50, 2, 'PRODUTO'),
      makeConsumo(2, 80, 1, 'SERVICIO'),
    ];
    // 100 + 80 + 20 = 200
    expect(calcularTotalVenta(consumos, 20)).toBeCloseTo(200);
  });

  it('FT5: servicios SERVICIO incluidos en el total general', () => {
    const consumos = [makeConsumo(1, 100, 1, 'SERVICIO')];
    // sin materiales, sin manoObra → total = 100
    expect(calcularTotalVenta(consumos, 0)).toBeCloseTo(100);
  });

  it('FT6: OT sin servicios — total correcto', () => {
    const consumos = [makeConsumo(1, 40, 3, 'PRODUTO')];
    expect(calcularTotalServicios(consumos)).toBe(0);
    expect(calcularTotalVenta(consumos, 10)).toBeCloseTo(130); // 120 + 10
  });

  it('FT7: OT sin materiales — total correcto', () => {
    const consumos = [makeConsumo(1, 60, 2, 'SERVICIO')];
    expect(calcularTotalMateriales(consumos)).toBe(0);
    expect(calcularTotalVenta(consumos, 15)).toBeCloseTo(135); // 120 + 15
  });

  it('FT8: precio null se trata como cero en materiales', () => {
    const c = makeConsumo(1, 0, 3, 'PRODUTO');
    c.precioUnitario = null;
    expect(calcularTotalMateriales([c])).toBe(0);
  });

  it('FT9: formulario inválido cuando vendedorId vacío', () => {
    expect(isFormValido('', 'EFECTIVO', 0)).toBe(false);
  });

  it('FT10: formulario inválido cuando mano de obra negativa', () => {
    expect(isFormValido('5', 'EFECTIVO', -1)).toBe(false);
  });
});
