/**
 * Tests para la lógica de precio y disponibilidad en RegistrarConsumoModal (OtDetailPage.tsx).
 *
 * Replica las funciones puras del modal para testearlas de forma aislada:
 *   - resolverPrecioInicial:   precio a mostrar al seleccionar un producto
 *   - resolverPrecioPresentacion: precio al cambiar de presentación
 *   - stockEfectivo:           stockVigente ?? stockActual ?? 0
 *   - puedeSeleccionar:        SERVICIO siempre; PRODUCTO solo si stock > 0
 *   - validarCantidadVsStock:  error si cantBase > stockEfectivo (solo físicos)
 */

import { describe, it, expect } from 'vitest';

// ── Tipos mínimos ─────────────────────────────────────────────────────────────

interface ProductoMin {
  tipo?: string;
  precioVenta: number;
  stockActual: number;
  stockVigente?: number;
  unidadMedidaNombre?: string;
}

interface PresentacionMin {
  id?: number;
  precioVenta: number;
  factor: number;
}

// ── Réplicas exactas de la lógica de OtDetailPage.tsx ────────────────────────

function stockEfectivo(p: ProductoMin): number {
  return p.stockVigente ?? p.stockActual ?? 0;
}

function puedeSeleccionar(p: ProductoMin): boolean {
  return p.tipo === 'SERVICIO' || stockEfectivo(p) > 0;
}

function resolverPrecioInicial(p: ProductoMin): string {
  return p.precioVenta > 0 ? String(p.precioVenta) : '';
}

function resolverPrecioPresentacion(
  presentaciones: PresentacionMin[],
  id: number,
  precioModificado: boolean,
): string | null {
  if (precioModificado) return null;
  const pres = presentaciones.find(p => p.id === id);
  return pres ? (pres.precioVenta > 0 ? String(pres.precioVenta) : '') : null;
}

function validarCantidadVsStock(
  cantBase: number,
  producto: ProductoMin,
): string | null {
  if (producto.tipo === 'SERVICIO') return null;
  const stock = stockEfectivo(producto);
  return cantBase > stock
    ? `Supera el stock disponible (${stock} ${producto.unidadMedidaNombre ?? 'u.'})`
    : null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const productoFisico: ProductoMin = {
  tipo: 'PRODUCTO',
  precioVenta: 25.5,
  stockActual: 10,
  stockVigente: 8,
  unidadMedidaNombre: 'UNID',
};

const productoServicio: ProductoMin = {
  tipo: 'SERVICIO',
  precioVenta: 150,
  stockActual: 0,
};

const productoSinPrecio: ProductoMin = {
  tipo: 'PRODUCTO',
  precioVenta: 0,
  stockActual: 5,
};

const presentaciones: PresentacionMin[] = [
  { id: 1, precioVenta: 25.5, factor: 1 },
  { id: 2, precioVenta: 240, factor: 10 },
];

describe('resolverPrecioInicial', () => {
  it('PC-1: producto físico autocompleta precio de venta', () => {
    expect(resolverPrecioInicial(productoFisico)).toBe('25.5');
  });

  it('PC-2: servicio autocompleta precio de venta', () => {
    expect(resolverPrecioInicial(productoServicio)).toBe('150');
  });

  it('PC-3: producto sin precio devuelve string vacío (ingreso manual)', () => {
    expect(resolverPrecioInicial(productoSinPrecio)).toBe('');
  });

  it('PC-4: cambiar producto actualiza el precio (nuevo producto tiene precio diferente)', () => {
    const precioP1 = resolverPrecioInicial(productoFisico);
    const precioP2 = resolverPrecioInicial(productoServicio);
    expect(precioP1).toBe('25.5');
    expect(precioP2).toBe('150');
    expect(precioP1).not.toBe(precioP2);
  });
});

describe('resolverPrecioPresentacion', () => {
  it('PC-5: cambiar presentación actualiza el precio si no fue editado manualmente', () => {
    const nuevo = resolverPrecioPresentacion(presentaciones, 2, false);
    expect(nuevo).toBe('240');
  });

  it('PC-6: editar precio manualmente conserva el valor al cambiar presentación', () => {
    const resultado = resolverPrecioPresentacion(presentaciones, 2, true);
    expect(resultado).toBeNull();
  });
});

describe('puedeSeleccionar', () => {
  it('PC-7: servicios aparecen aunque no tengan stock', () => {
    expect(puedeSeleccionar(productoServicio)).toBe(true);
  });

  it('PC-9: productos físicos sin stock no se pueden seleccionar', () => {
    const sinStock: ProductoMin = { tipo: 'PRODUCTO', precioVenta: 10, stockActual: 0, stockVigente: 0 };
    expect(puedeSeleccionar(sinStock)).toBe(false);
  });
});

describe('servicios no generan descuentos de inventario', () => {
  it('PC-8: validarCantidadVsStock retorna null para servicios aunque superen cualquier número', () => {
    const error = validarCantidadVsStock(9999, productoServicio);
    expect(error).toBeNull();
  });
});

describe('validarCantidadVsStock', () => {
  it('PC-9b: físico dentro del stock → sin error', () => {
    expect(validarCantidadVsStock(5, productoFisico)).toBeNull();
  });

  it('PC-9c: físico supera stock vigente → error con cantidad', () => {
    const error = validarCantidadVsStock(10, productoFisico);
    expect(error).toContain('Supera el stock disponible');
    expect(error).toContain('8');
  });
});

// ── filtrarPorSegmento ────────────────────────────────────────────────────────

function filtrarPorSegmento(
  productos: ProductoMin[],
  segmento: 'TODOS' | 'MATERIALES' | 'SERVICIOS',
): ProductoMin[] {
  if (segmento === 'MATERIALES') return productos.filter(p => p.tipo !== 'SERVICIO');
  if (segmento === 'SERVICIOS') return productos.filter(p => p.tipo === 'SERVICIO');
  return productos;
}

const mezcla: ProductoMin[] = [
  { tipo: 'PRODUCTO', precioVenta: 25.5, stockActual: 10 },
  { tipo: 'SERVICIO', precioVenta: 150, stockActual: 0 },
  { tipo: 'PRODUCTO', precioVenta: 0, stockActual: 5 },
];

describe('filtrarPorSegmento', () => {
  it('FP-1: Todos muestra materiales y servicios', () => {
    expect(filtrarPorSegmento(mezcla, 'TODOS')).toHaveLength(3);
  });

  it('FP-2: Materiales excluye servicios', () => {
    const result = filtrarPorSegmento(mezcla, 'MATERIALES');
    expect(result).toHaveLength(2);
    expect(result.every(p => p.tipo !== 'SERVICIO')).toBe(true);
  });

  it('FP-3: Servicios excluye materiales', () => {
    const result = filtrarPorSegmento(mezcla, 'SERVICIOS');
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('SERVICIO');
  });

  it('FP-4: Materiales no incluye ningún servicio', () => {
    const result = filtrarPorSegmento(mezcla, 'MATERIALES');
    expect(result.some(p => p.tipo === 'SERVICIO')).toBe(false);
  });

  it('FP-5: Servicios no incluye ningún material', () => {
    const result = filtrarPorSegmento(mezcla, 'SERVICIOS');
    expect(result.some(p => p.tipo !== 'SERVICIO')).toBe(false);
  });

  it('FP-6: Todos sobre lista vacía devuelve vacío', () => {
    expect(filtrarPorSegmento([], 'TODOS')).toHaveLength(0);
  });
});
