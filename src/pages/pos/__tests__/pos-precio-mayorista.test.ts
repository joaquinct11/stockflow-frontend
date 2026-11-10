/**
 * Tests para la lógica de cálculo de precios mayoristas en el carrito del POS.
 *
 * Replica la función calcularPrecioItem de POSPage.tsx como función pura para
 * poder testearla de forma aislada. Cubre las 4 capas de prioridad:
 *   1. precioOverride (edición manual autorizada: variantes ropa, ADMIN/GERENTE)
 *   2. Precio mayorista de la presentación (cantidad >= cantidadMinima)
 *   3. Precio mayorista del producto base (sin presentación)
 *   4. precioVenta del producto (fallback)
 */

import { describe, it, expect } from 'vitest';

// ── Réplica exacta de PresentacionPrecio (POSPage.tsx:33) ─────────────────────

interface PresentacionPrecio {
  precioVenta: number;
  precioMayorista?: number;
  cantidadMinima?: number;
  factor?: number;
}

// ── Réplica exacta de calcularPrecioItem (POSPage.tsx:186) ────────────────────

interface ProductoBase {
  precioVenta?: number | null;
  precioMayorista?: number | null;
  cantidadMinimaMayorista?: number | null;
}

function calcularPrecioItem(
  producto: ProductoBase,
  cantidad: number,
  precioOverride?: number,
  presentacion?: PresentacionPrecio | null,
): number {
  if (precioOverride != null && precioOverride > 0) return precioOverride;
  if (presentacion) {
    // Config propia completa → usarla directamente
    if (presentacion.precioMayorista != null && presentacion.cantidadMinima != null) {
      return cantidad >= presentacion.cantidadMinima
        ? presentacion.precioMayorista
        : presentacion.precioVenta;
    }
    // Sin config propia → fallback a config base con unidades equivalentes
    const factor = presentacion.factor ?? 1;
    const cantidadBase = cantidad * factor;
    if (
      producto.precioMayorista != null &&
      producto.cantidadMinimaMayorista != null &&
      cantidadBase >= producto.cantidadMinimaMayorista
    ) {
      return producto.precioMayorista;
    }
    return presentacion.precioVenta;
  }
  if (
    producto.precioMayorista != null &&
    producto.cantidadMinimaMayorista != null &&
    cantidad >= producto.cantidadMinimaMayorista
  ) {
    return producto.precioMayorista;
  }
  return producto.precioVenta ?? 0;
}

// ── Helpers de fixtures ───────────────────────────────────────────────────────

const makeProducto = (precioVenta: number, precioMayorista?: number, cantidadMinima?: number): ProductoBase => ({
  precioVenta,
  precioMayorista: precioMayorista ?? null,
  cantidadMinimaMayorista: cantidadMinima ?? null,
});

const makePresentacion = (precioVenta: number, precioMayorista?: number, cantidadMinima?: number): PresentacionPrecio => ({
  precioVenta,
  precioMayorista,
  cantidadMinima,
});

// ── Presentación "Unidad" (factor=1) sin config mayorista propia → hereda base ─

describe('calcularPrecioItem — presentación Unidad (factor=1) heredando config del producto base', () => {
  // Dexametasona: precio base S/5.00, mayorista base S/2.00 desde 5 tabletas
  const producto = makeProducto(5.00, 2.00, 5);
  // Presentación "Unidad" con factor=1, sin config mayorista propia
  const presUnidad = { precioVenta: 5.00, factor: 1 };

  it('por debajo del mínimo: usa precioVenta de la presentación (= precio base)', () => {
    expect(calcularPrecioItem(producto, 4, undefined, presUnidad)).toBe(5.00);
  });

  it('exactamente en el mínimo: aplica precio mayorista del producto base', () => {
    expect(calcularPrecioItem(producto, 5, undefined, presUnidad)).toBe(2.00);
  });

  it('por encima del mínimo: mantiene precio mayorista del producto base', () => {
    expect(calcularPrecioItem(producto, 10, undefined, presUnidad)).toBe(2.00);
  });

  it('el factor 1 no altera la comparación (cantidadBase = cantidad × 1 = cantidad)', () => {
    // Con factor=1 la regla es exactamente igual que sin presentación
    expect(calcularPrecioItem(producto, 5, undefined, presUnidad))
      .toBe(calcularPrecioItem(producto, 5));
  });

  it('producto sin config mayorista base: Unidad solo devuelve precioVenta', () => {
    const sinBase = makeProducto(5.00);
    expect(calcularPrecioItem(sinBase, 100, undefined, { precioVenta: 5.00, factor: 1 })).toBe(5.00);
  });
});

// ── Presentación con factor > 1 sin config propia → hereda base por unidades equiv.

describe('calcularPrecioItem — presentación con factor>1 sin config propia (fallback equivalente)', () => {
  // Blíster (factor=10), sin config mayorista propia; producto base: S/0.30, mayor. ≥20 tabletas → S/0.20
  const producto = makeProducto(0.30, 0.20, 20);
  const presBlister = { precioVenta: 2.80, factor: 10 };

  it('1 blíster = 10 tabletas < 20 mínimo: usa precioVenta del blíster', () => {
    expect(calcularPrecioItem(producto, 1, undefined, presBlister)).toBe(2.80);
  });

  it('2 blísteres = 20 tabletas = mínimo exacto: aplica precio mayorista base', () => {
    expect(calcularPrecioItem(producto, 2, undefined, presBlister)).toBe(0.20);
  });

  it('3 blísteres = 30 tabletas > 20 mínimo: precio mayorista base', () => {
    expect(calcularPrecioItem(producto, 3, undefined, presBlister)).toBe(0.20);
  });
});

// ── Producto base (sin presentación) ─────────────────────────────────────────

describe('calcularPrecioItem — producto sin presentación', () => {
  const producto = makeProducto(5.00, 3.50, 10);

  it('usa precioVenta cuando la cantidad está por debajo del mínimo mayorista', () => {
    expect(calcularPrecioItem(producto, 9)).toBe(5.00);
  });

  it('activa precio mayorista exactamente en el mínimo (cantidad === cantidadMinima)', () => {
    expect(calcularPrecioItem(producto, 10)).toBe(3.50);
  });

  it('mantiene precio mayorista por encima del mínimo', () => {
    expect(calcularPrecioItem(producto, 50)).toBe(3.50);
  });

  it('devuelve precioVenta cuando el producto no tiene config mayorista', () => {
    const sinMayorista = makeProducto(5.00);
    expect(calcularPrecioItem(sinMayorista, 100)).toBe(5.00);
  });

  it('devuelve 0 cuando precioVenta es null/undefined', () => {
    const sinPrecio: ProductoBase = { precioVenta: null, precioMayorista: null, cantidadMinimaMayorista: null };
    expect(calcularPrecioItem(sinPrecio, 1)).toBe(0);
  });
});

// ── Presentación sin config mayorista ────────────────────────────────────────

describe('calcularPrecioItem — presentación sin precio mayorista propio', () => {
  // Producto base: tableta S/0.30, mayorista S/0.20 desde 100 tabletas.
  // La presentación tiene factor=1 (sin declarar), precio S/24 pero no tiene
  // config mayorista propia → hereda la config base del producto.
  const producto = makeProducto(0.30, 0.20, 100);
  const pres = makePresentacion(24.00); // factor no declarado → 1 por defecto

  it('usa precioVenta de la presentación cuando la cantidad no alcanza el mínimo base', () => {
    // cantidadBase = 1 * 1 = 1 < 100 → precioVenta de la presentación
    expect(calcularPrecioItem(producto, 1, undefined, pres)).toBe(24.00);
  });

  it('aplica el mayorista del producto base cuando las unidades equivalentes lo alcanzan', () => {
    // cantidadBase = 200 * 1 = 200 >= 100 → precio mayorista base
    expect(calcularPrecioItem(producto, 200, undefined, pres)).toBe(0.20);
  });

  it('exactamente en el mínimo base: aplica mayorista', () => {
    // cantidadBase = 100 * 1 = 100 >= 100 → precio mayorista base
    expect(calcularPrecioItem(producto, 100, undefined, pres)).toBe(0.20);
  });

  it('un paso antes del mínimo: usa precioVenta de la presentación', () => {
    expect(calcularPrecioItem(producto, 99, undefined, pres)).toBe(24.00);
  });

  it('presentación sin config y producto sin config: siempre precioVenta', () => {
    const sinBase = makeProducto(0.30);
    expect(calcularPrecioItem(sinBase, 1000, undefined, makePresentacion(24.00))).toBe(24.00);
  });
});

// ── Presentación con precio mayorista ────────────────────────────────────────

describe('calcularPrecioItem — presentación con precio mayorista', () => {
  const producto = makeProducto(0.30, 0.20, 100);
  // Caja de 24 unidades: precioVenta=24.00, mayor. ≥5 cajas → S/20.00
  const pres = makePresentacion(24.00, 20.00, 5);

  it('usa precioVenta de la presentación cuando la cantidad está por debajo del mínimo', () => {
    expect(calcularPrecioItem(producto, 4, undefined, pres)).toBe(24.00);
  });

  it('activa precio mayorista de la presentación exactamente en el mínimo', () => {
    expect(calcularPrecioItem(producto, 5, undefined, pres)).toBe(20.00);
  });

  it('mantiene precio mayorista de la presentación por encima del mínimo', () => {
    expect(calcularPrecioItem(producto, 20, undefined, pres)).toBe(20.00);
  });

  it('no usa el mayorista del producto base cuando hay presentación con su propia config', () => {
    // cantidad=200 activa mayorista de producto base (≥100), pero hay presentación → se ignora
    expect(calcularPrecioItem(producto, 200, undefined, pres)).toBe(20.00);
  });
});

// ── Incrementar y reducir cantidad (cambiarCantidad / confirmarCantidad) ──────

describe('calcularPrecioItem — transiciones de cantidad con presentación', () => {
  const producto = makeProducto(0.30);
  const pres = makePresentacion(24.00, 20.00, 5);

  it('incrementar hasta el mínimo activa precio mayorista', () => {
    expect(calcularPrecioItem(producto, 4, undefined, pres)).toBe(24.00);
    expect(calcularPrecioItem(producto, 5, undefined, pres)).toBe(20.00);
  });

  it('reducir por debajo del mínimo desactiva precio mayorista', () => {
    expect(calcularPrecioItem(producto, 5, undefined, pres)).toBe(20.00);
    expect(calcularPrecioItem(producto, 4, undefined, pres)).toBe(24.00);
  });

  it('editar directamente la cantidad a un valor alto activa mayorista', () => {
    expect(calcularPrecioItem(producto, 50, undefined, pres)).toBe(20.00);
  });

  it('editar directamente a 1 unidad vuelve al precio minorista', () => {
    expect(calcularPrecioItem(producto, 1, undefined, pres)).toBe(24.00);
  });
});

// ── Escaneo repetido de la misma presentación ─────────────────────────────────

describe('calcularPrecioItem — escaneo repetido acumulando cantidad', () => {
  const producto = makeProducto(0.30);
  const pres = makePresentacion(24.00, 20.00, 3);

  it('1 escaneo: precio minorista', () => {
    expect(calcularPrecioItem(producto, 1, undefined, pres)).toBe(24.00);
  });

  it('2 escaneos: precio minorista', () => {
    expect(calcularPrecioItem(producto, 2, undefined, pres)).toBe(24.00);
  });

  it('3 escaneos (mínimo exacto): activa mayorista', () => {
    expect(calcularPrecioItem(producto, 3, undefined, pres)).toBe(20.00);
  });

  it('5 escaneos: precio mayorista sostenido', () => {
    expect(calcularPrecioItem(producto, 5, undefined, pres)).toBe(20.00);
  });
});

// ── Dos presentaciones distintas del mismo producto ───────────────────────────

describe('calcularPrecioItem — dos presentaciones del mismo producto', () => {
  const producto = makeProducto(0.30);
  // Presentación A: caja de 24 → mayor. ≥5 cajas S/20
  const presA = makePresentacion(24.00, 20.00, 5);
  // Presentación B: blíster de 10 → sin mayorista
  const presB = makePresentacion(8.50);

  it('presentación A por debajo del mínimo: usa precioVenta de A', () => {
    expect(calcularPrecioItem(producto, 4, undefined, presA)).toBe(24.00);
  });

  it('presentación A en el mínimo: usa mayorista de A', () => {
    expect(calcularPrecioItem(producto, 5, undefined, presA)).toBe(20.00);
  });

  it('presentación B nunca activa mayorista (no tiene config)', () => {
    expect(calcularPrecioItem(producto, 100, undefined, presB)).toBe(8.50);
  });

  it('cada presentación es independiente — A no afecta a B', () => {
    expect(calcularPrecioItem(producto, 5, undefined, presA)).toBe(20.00);
    expect(calcularPrecioItem(producto, 5, undefined, presB)).toBe(8.50);
  });
});

// ── Presentación con mayorista distinto al del producto base ──────────────────

describe('calcularPrecioItem — mayorista de presentación vs mayorista de producto base', () => {
  // Producto: tableta S/0.30, mayor. base ≥100 → S/0.20
  // Presentación caja: S/24, mayor. presentación ≥5 → S/20
  const producto = makeProducto(0.30, 0.20, 100);
  const pres = makePresentacion(24.00, 20.00, 5);

  it('con presentación: usa la config de la presentación, ignora la del producto', () => {
    // cantidad=200 activaría el mayorista del producto base, pero hay presentación
    expect(calcularPrecioItem(producto, 200, undefined, pres)).toBe(20.00);
  });

  it('sin presentación (null): usa la config del producto base', () => {
    expect(calcularPrecioItem(producto, 100, undefined, null)).toBe(0.20);
  });

  it('sin presentación (undefined): usa la config del producto base', () => {
    expect(calcularPrecioItem(producto, 100, undefined, undefined)).toBe(0.20);
  });
});

// ── precioOverride: edición manual autorizada (variantes ropa / ADMIN-GERENTE) ─

describe('calcularPrecioItem — precioOverride gana sobre todo', () => {
  const producto = makeProducto(5.00, 3.00, 2);
  // cantidadMinima=3 para que con cantidad=1 no se active el mayorista de la presentación
  const pres = makePresentacion(24.00, 20.00, 3);

  it('override positivo ignora precio mayorista del producto', () => {
    // Con cantidad≥2 se activaría el mayorista del producto (3.00), pero override=7.50 gana
    expect(calcularPrecioItem(producto, 10, 7.50, undefined)).toBe(7.50);
  });

  it('override positivo ignora precio mayorista de la presentación', () => {
    // Con cantidad≥3 la presentación activaría 20.00, pero override=18.00 gana
    expect(calcularPrecioItem(producto, 5, 18.00, pres)).toBe(18.00);
  });

  it('override=0 no tiene efecto: cae al siguiente nivel de prioridad (precioVenta pres)', () => {
    // 0 no es un precio válido (precioOverride > 0 es la condición); cantidad=1 < cantidadMinima=3
    expect(calcularPrecioItem(producto, 1, 0, pres)).toBe(24.00);
  });

  it('override negativo no tiene efecto: cae al siguiente nivel de prioridad (precioVenta pres)', () => {
    // cantidad=1 < cantidadMinima=3 → no activa mayorista → precioVenta=24.00
    expect(calcularPrecioItem(producto, 1, -5, pres)).toBe(24.00);
  });

  it('override null no tiene efecto: cae al siguiente nivel de prioridad', () => {
    expect(calcularPrecioItem(producto, 10, undefined, undefined)).toBe(3.00);
  });
});

// ── Badge mayorista: condición de visualización ───────────────────────────────

/**
 * La condición del badge MAYOR en el carrito es:
 *   con presentación: pres.precioMayorista != null && pres.cantidadMinima != null && cantidad >= pres.cantidadMinima
 *   sin presentación: producto.precioMayorista != null && producto.cantidadMinimaMayorista != null && cantidad >= cantidadMinimaMayorista
 *
 * Es equivalente a: calcularPrecioItem devuelve el precio mayorista (no el de venta).
 */

function esMayorista(
  producto: ProductoBase,
  cantidad: number,
  presentacion?: PresentacionPrecio | null,
): boolean {
  if (presentacion) {
    if (presentacion.precioMayorista != null && presentacion.cantidadMinima != null) {
      return cantidad >= presentacion.cantidadMinima;
    }
    // Sin config propia: fallback a config base del producto con unidades equivalentes
    const factor = presentacion.factor ?? 1;
    return (
      producto.precioMayorista != null &&
      producto.cantidadMinimaMayorista != null &&
      (cantidad * factor) >= producto.cantidadMinimaMayorista
    );
  }
  return (
    producto.precioMayorista != null &&
    producto.cantidadMinimaMayorista != null &&
    cantidad >= (producto.cantidadMinimaMayorista ?? Infinity)
  );
}

describe('Badge MAYOR — visualización correcta', () => {
  const producto = makeProducto(5.00, 3.00, 10);
  const pres = makePresentacion(24.00, 20.00, 5);

  it('no muestra badge cuando cantidad < mínimo mayorista del producto', () => {
    expect(esMayorista(producto, 9)).toBe(false);
  });

  it('muestra badge cuando cantidad >= mínimo mayorista del producto', () => {
    expect(esMayorista(producto, 10)).toBe(true);
  });

  it('no muestra badge cuando cantidad < mínimo mayorista de la presentación', () => {
    expect(esMayorista(producto, 4, pres)).toBe(false);
  });

  it('muestra badge cuando cantidad >= mínimo mayorista de la presentación', () => {
    expect(esMayorista(producto, 5, pres)).toBe(true);
  });

  it('no muestra badge si el producto no tiene config mayorista', () => {
    const sinMayor = makeProducto(5.00);
    expect(esMayorista(sinMayor, 100)).toBe(false);
  });

  it('muestra badge cuando la presentación sin config propia alcanza el mínimo del producto base (factor=1)', () => {
    // factor=1 → cantidadBase = 100 * 1 = 100 >= cantidadMinimaMayorista=10 → badge
    const presSimple = makePresentacion(24.00); // factor=1 por defecto
    expect(esMayorista(producto, 100, presSimple)).toBe(true);
  });

  it('no muestra badge si la presentación sin config y el producto tampoco tiene config', () => {
    const sinMayorBase = makeProducto(5.00);
    const presSimple = makePresentacion(24.00);
    expect(esMayorista(sinMayorBase, 1000, presSimple)).toBe(false);
  });

  it('badge y precio son coherentes: badge ↔ se aplicó precio mayorista', () => {
    // Con presentación
    const badge5 = esMayorista(producto, 5, pres);
    const precio5 = calcularPrecioItem(producto, 5, undefined, pres);
    expect(badge5).toBe(true);
    expect(precio5).toBe(pres.precioMayorista);

    const badge4 = esMayorista(producto, 4, pres);
    const precio4 = calcularPrecioItem(producto, 4, undefined, pres);
    expect(badge4).toBe(false);
    expect(precio4).toBe(pres.precioVenta);

    // Sin presentación
    const badge10 = esMayorista(producto, 10);
    const precio10 = calcularPrecioItem(producto, 10);
    expect(badge10).toBe(true);
    expect(precio10).toBe(producto.precioMayorista);
  });
});
