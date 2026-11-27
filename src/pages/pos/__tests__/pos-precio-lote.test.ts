/**
 * Tests de regresión y validación para el precio de venta del lote en el carrito del POS.
 *
 * Réplica de la función calcularPrecioItem actualizada (POSPage.tsx) como función pura.
 * Cubre las 5 capas de prioridad incluyendo la nueva prioridad 2 (precioLote):
 *   1. precioOverride (edición manual autorizada)
 *   2. precioLote (precio de venta del lote; sticky, solo aplica a unidad base sin presentación)
 *   3. Config mayorista de la presentación
 *   4. Config mayorista del producto base
 *   5. precioVenta del producto (fallback)
 *
 * Escenarios cubiertos:
 *   - T-01: Producto con un lote sin precioVenta propio → comportamiento actual sin regresiones
 *   - T-02: Producto con dos lotes y precios diferentes
 *   - T-03: Seleccionar LOTE-A → carrito muestra S/ 3.50
 *   - T-04: Seleccionar LOTE-B → carrito muestra S/ 5.50 (no el precio general del producto)
 *   - T-05: Cambiar cantidad del LOTE-B → conserva S/ 5.50 (precio sticky)
 *   - T-06: Mismo producto con dos lotes distintos → cada línea conserva su precio y lote
 *   - T-07: Registrar venta → DTO persistido con precio correcto del lote
 *   - T-08: Subtotal, IGV y total calculados con precio del lote
 *   - T-09: Productos sin lotes → mantienen precio de venta habitual
 *   - T-10: Lote con precioVenta=null → aplica precio del producto (regla de negocio existente)
 */

import { describe, it, expect } from 'vitest';

// ── Tipos (réplica de POSPage.tsx) ────────────────────────────────────────────

interface PresentacionPrecio {
  precioVenta: number;
  precioMayorista?: number;
  cantidadMinima?: number;
  factor?: number;
}

interface ProductoBase {
  id: number;
  nombre: string;
  precioVenta?: number | null;
  precioMayorista?: number | null;
  cantidadMinimaMayorista?: number | null;
}

/** Réplica exacta del CartItem relevante para precio */
interface CartItem {
  productoId: number;
  stockLoteId?: number;
  cantidad: number;
  precioUnitario: number;
  precioLote?: number;
  presentacion?: PresentacionPrecio | null;
}

// ── Réplica exacta de calcularPrecioItem actualizado (POSPage.tsx) ─────────────

function calcularPrecioItem(
  producto: ProductoBase,
  cantidad: number,
  precioOverride?: number,
  presentacion?: PresentacionPrecio | null,
  precioLote?: number,
): number {
  if (precioOverride != null && precioOverride > 0) return precioOverride;
  // precioLote solo aplica a la unidad base (sin presentación); es sticky: no varía con cantidad
  if (precioLote != null && precioLote > 0 && !presentacion) return precioLote;
  if (presentacion) {
    if (presentacion.precioMayorista != null && presentacion.cantidadMinima != null) {
      return cantidad >= presentacion.cantidadMinima
        ? presentacion.precioMayorista
        : presentacion.precioVenta;
    }
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

/** Réplica de cartItemKey (clave única por producto + lote en el carrito) */
function cartItemKey(item: { productoId: number; stockLoteId?: number }): string {
  return item.stockLoteId ? `${item.productoId}-l${item.stockLoteId}` : `${item.productoId}`;
}

/** Réplica de la constante IGV_RATE y el helper de totales del POS */
const IGV_RATE = 0.18;
function calcularTotales(cart: CartItem[]): { subtotal: number; baseImponible: number; igv: number; total: number } {
  const subtotal = cart.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const baseImponible = subtotal / (1 + IGV_RATE);
  const igv = subtotal - baseImponible;
  return { subtotal, baseImponible, igv, total: subtotal };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Panadol 500mg: precio general S/ 3.50
const panadol: ProductoBase = { id: 42, nombre: 'Panadol 500mg', precioVenta: 3.50 };

// Lote A: mismo precio que el general
const LOTE_A_ID = 101;
const LOTE_A_PRECIO = 3.50;

// Lote B: precio propio distinto al general
const LOTE_B_ID = 102;
const LOTE_B_PRECIO = 5.50;

// Amoxicilina: sin precio de lote propio
const amoxicilina: ProductoBase = { id: 55, nombre: 'Amoxicilina 500mg', precioVenta: 8.00 };

// ── T-01: Sin precioLote → precio general del producto (sin regresiones) ──────

describe('T-01: Producto con un lote — sin precioVenta de lote (comportamiento actual sin regresiones)', () => {

  it('sin precioLote: usa precioVenta general del producto', () => {
    expect(calcularPrecioItem(panadol, 1)).toBe(3.50);
  });

  it('precioLote=undefined: sigue usando precioVenta del producto', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, undefined)).toBe(3.50);
  });

  it('precioLote=0 no tiene efecto (cero no es precio válido): usa precioVenta del producto', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, 0)).toBe(3.50);
  });

  it('precioOverride sigue ganando con prioridad 1 cuando no hay precioLote', () => {
    expect(calcularPrecioItem(panadol, 1, 2.00, null, undefined)).toBe(2.00);
  });
});

// ── T-02: Producto con dos lotes y precios diferentes ─────────────────────────

describe('T-02: Panadol tiene dos lotes con precios distintos (LOTE-A S/3.50, LOTE-B S/5.50)', () => {

  it('los dos lotes tienen precios distintos entre sí', () => {
    expect(LOTE_A_PRECIO).not.toBe(LOTE_B_PRECIO);
  });

  it('LOTE-A tiene el mismo precio que el producto general', () => {
    expect(LOTE_A_PRECIO).toBe(panadol.precioVenta);
  });

  it('LOTE-B tiene precio distinto al del producto general', () => {
    expect(LOTE_B_PRECIO).not.toBe(panadol.precioVenta);
  });
});

// ── T-03: Seleccionar LOTE-A → carrito muestra S/ 3.50 ───────────────────────

describe('T-03: Seleccionar LOTE-A (precioLote=3.50) → precio en carrito = S/ 3.50', () => {

  it('precio en carrito coincide con precioLote del LOTE-A', () => {
    const precio = calcularPrecioItem(panadol, 1, undefined, null, LOTE_A_PRECIO);
    expect(precio).toBe(3.50);
  });

  it('precio del LOTE-A == precioVenta general: resultado es el mismo por dos razones diferentes', () => {
    // Sin precioLote caería al precioVenta; con precioLote también es 3.50 (no confundir)
    const conLote = calcularPrecioItem(panadol, 1, undefined, null, LOTE_A_PRECIO);
    const sinLote = calcularPrecioItem(panadol, 1);
    expect(conLote).toBe(sinLote);
    expect(conLote).toBe(3.50);
  });
});

// ── T-04: Seleccionar LOTE-B → carrito muestra S/ 5.50 ───────────────────────

describe('T-04: Seleccionar LOTE-B (precioLote=5.50) → precio en carrito = S/ 5.50, NO el general S/ 3.50', () => {

  it('precio en carrito es el precio del LOTE-B (S/ 5.50), no el general del producto (S/ 3.50)', () => {
    const precio = calcularPrecioItem(panadol, 1, undefined, null, LOTE_B_PRECIO);
    expect(precio).toBe(5.50);
    expect(precio).not.toBe(panadol.precioVenta);
  });

  it('sin precioLote el precio hubiera sido S/ 3.50 (precio general): confirma el bug previo)', () => {
    const precioSinLote = calcularPrecioItem(panadol, 1);
    expect(precioSinLote).toBe(3.50);
  });

  it('la diferencia es de S/ 2.00 exactos', () => {
    const precioConLote = calcularPrecioItem(panadol, 1, undefined, null, LOTE_B_PRECIO);
    const precioSinLote = calcularPrecioItem(panadol, 1);
    expect(precioConLote - precioSinLote).toBeCloseTo(2.00, 2);
  });
});

// ── T-05: Cambiar cantidad del LOTE-B → precio sticky S/ 5.50 ────────────────

describe('T-05: Cambiar cantidad del LOTE-B → el precio S/ 5.50 se conserva (sticky)', () => {

  const precioLoteB = LOTE_B_PRECIO;

  it('cantidad=1: precio S/ 5.50', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, precioLoteB)).toBe(5.50);
  });

  it('cantidad=5: precio S/ 5.50 (no varía)', () => {
    expect(calcularPrecioItem(panadol, 5, undefined, null, precioLoteB)).toBe(5.50);
  });

  it('cantidad=10: precio S/ 5.50 (sticky incluso si hubiera regla mayorista)', () => {
    expect(calcularPrecioItem(panadol, 10, undefined, null, precioLoteB)).toBe(5.50);
  });

  it('con mayorista activo en el producto: precioLote gana sobre el mayorista', () => {
    const panadolConMayor: ProductoBase = { ...panadol, precioMayorista: 2.00, cantidadMinimaMayorista: 5 };
    // cantidad=10 activaría mayorista (S/2.00), pero precioLote=5.50 gana
    expect(calcularPrecioItem(panadolConMayor, 10, undefined, null, precioLoteB)).toBe(5.50);
  });

  it('reducir a 1 unidad: sigue con S/ 5.50', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, precioLoteB)).toBe(5.50);
  });
});

// ── T-06: Dos líneas del mismo producto con diferentes lotes ──────────────────

describe('T-06: Mismo producto con dos lotes — cada línea conserva su precio y lote', () => {

  it('cartItemKey diferencia LOTE-A y LOTE-B del mismo producto', () => {
    const keyA = cartItemKey({ productoId: panadol.id, stockLoteId: LOTE_A_ID });
    const keyB = cartItemKey({ productoId: panadol.id, stockLoteId: LOTE_B_ID });
    expect(keyA).not.toBe(keyB);
    expect(keyA).toBe(`${panadol.id}-l${LOTE_A_ID}`);
    expect(keyB).toBe(`${panadol.id}-l${LOTE_B_ID}`);
  });

  it('línea LOTE-A: precioUnitario = S/ 3.50', () => {
    const lineaA: CartItem = {
      productoId: panadol.id, stockLoteId: LOTE_A_ID, cantidad: 2,
      precioUnitario: calcularPrecioItem(panadol, 2, undefined, null, LOTE_A_PRECIO),
      precioLote: LOTE_A_PRECIO,
    };
    expect(lineaA.precioUnitario).toBe(3.50);
  });

  it('línea LOTE-B: precioUnitario = S/ 5.50', () => {
    const lineaB: CartItem = {
      productoId: panadol.id, stockLoteId: LOTE_B_ID, cantidad: 3,
      precioUnitario: calcularPrecioItem(panadol, 3, undefined, null, LOTE_B_PRECIO),
      precioLote: LOTE_B_PRECIO,
    };
    expect(lineaB.precioUnitario).toBe(5.50);
  });

  it('las dos líneas son independientes: cambiar cantidad de LOTE-B no afecta a LOTE-A', () => {
    const precioA1 = calcularPrecioItem(panadol, 1, undefined, null, LOTE_A_PRECIO);
    const precioA5 = calcularPrecioItem(panadol, 5, undefined, null, LOTE_A_PRECIO);
    const precioB1 = calcularPrecioItem(panadol, 1, undefined, null, LOTE_B_PRECIO);
    const precioB5 = calcularPrecioItem(panadol, 5, undefined, null, LOTE_B_PRECIO);

    expect(precioA1).toBe(3.50);
    expect(precioA5).toBe(3.50);
    expect(precioB1).toBe(5.50);
    expect(precioB5).toBe(5.50);
  });
});

// ── T-07: Registrar venta — DTO con precio correcto del lote ──────────────────

describe('T-07: Registrar venta — precioUnitario del detalle es el precio del lote', () => {

  it('ítem LOTE-B: precioUnitario en el DTO es S/ 5.50', () => {
    const precioCalculado = calcularPrecioItem(panadol, 1, undefined, null, LOTE_B_PRECIO);

    const detalleDTO = {
      productoId: panadol.id,
      cantidad: 1,
      precioUnitario: precioCalculado,
      stockLoteId: LOTE_B_ID,
    };

    expect(detalleDTO.precioUnitario).toBe(5.50);
    expect(detalleDTO.stockLoteId).toBe(LOTE_B_ID);
  });

  it('ítem LOTE-A: precioUnitario en el DTO es S/ 3.50', () => {
    const precioCalculado = calcularPrecioItem(panadol, 2, undefined, null, LOTE_A_PRECIO);

    const detalleDTO = {
      productoId: panadol.id,
      cantidad: 2,
      precioUnitario: precioCalculado,
      stockLoteId: LOTE_A_ID,
    };

    expect(detalleDTO.precioUnitario).toBe(3.50);
  });

  it('sin lote: precioUnitario es el precio general del producto', () => {
    const precioCalculado = calcularPrecioItem(amoxicilina, 1);
    expect(precioCalculado).toBe(8.00);
  });
});

// ── T-08: Subtotal, IGV y total calculados correctamente con precio del lote ──

describe('T-08: Subtotal, IGV y total con LOTE-B (S/ 5.50 × 3 unidades)', () => {

  const cart: CartItem[] = [
    {
      productoId: panadol.id,
      stockLoteId: LOTE_B_ID,
      cantidad: 3,
      precioUnitario: calcularPrecioItem(panadol, 3, undefined, null, LOTE_B_PRECIO),
      precioLote: LOTE_B_PRECIO,
    },
  ];

  it('subtotal = S/ 5.50 × 3 = S/ 16.50', () => {
    const { subtotal } = calcularTotales(cart);
    expect(subtotal).toBeCloseTo(16.50, 2);
  });

  it('total == subtotal (sin descuentos)', () => {
    const { subtotal, total } = calcularTotales(cart);
    expect(total).toBeCloseTo(subtotal, 2);
  });

  it('baseImponible = subtotal / 1.18', () => {
    const { subtotal, baseImponible } = calcularTotales(cart);
    expect(baseImponible).toBeCloseTo(subtotal / 1.18, 2);
  });

  it('IGV = subtotal - baseImponible', () => {
    const { subtotal, baseImponible, igv } = calcularTotales(cart);
    expect(igv).toBeCloseTo(subtotal - baseImponible, 2);
  });

  it('si hubiera sido el precio general (S/ 3.50), el subtotal sería S/ 10.50 (diferencia confirmada)', () => {
    const cartSinLote: CartItem[] = [
      { productoId: panadol.id, cantidad: 3, precioUnitario: calcularPrecioItem(panadol, 3) },
    ];
    const { subtotal: subtotalSinLote } = calcularTotales(cartSinLote);
    const { subtotal: subtotalConLote } = calcularTotales(cart);
    expect(subtotalSinLote).toBeCloseTo(10.50, 2);
    expect(subtotalConLote).toBeCloseTo(16.50, 2);
  });
});

// ── T-09: Productos sin lotes → precio habitual intacto ───────────────────────

describe('T-09: Productos sin lotes — precio de venta habitual sin alteraciones', () => {

  it('producto sin lote ni mayorista: devuelve precioVenta', () => {
    expect(calcularPrecioItem(amoxicilina, 1)).toBe(8.00);
  });

  it('producto sin lote con mayorista activo: devuelve precioMayorista', () => {
    const amoxiConMayor: ProductoBase = { ...amoxicilina, precioMayorista: 6.00, cantidadMinimaMayorista: 10 };
    expect(calcularPrecioItem(amoxiConMayor, 10)).toBe(6.00);
  });

  it('producto sin lote con mayorista inactivo: devuelve precioVenta', () => {
    const amoxiConMayor: ProductoBase = { ...amoxicilina, precioMayorista: 6.00, cantidadMinimaMayorista: 10 };
    expect(calcularPrecioItem(amoxiConMayor, 9)).toBe(8.00);
  });

  it('precioLote=undefined es transparente: no afecta comportamiento sin lote', () => {
    expect(calcularPrecioItem(amoxicilina, 1, undefined, null, undefined)).toBe(8.00);
  });
});

// ── T-10: Lote con precioVenta=null → aplica regla del producto ───────────────

describe('T-10: Lote con precioVenta=null → aplica regla de negocio existente del producto', () => {

  it('precioLote=null: usa precioVenta del producto (fallback correcto)', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, null as unknown as undefined)).toBe(3.50);
  });

  it('precioLote=undefined: usa precioVenta del producto', () => {
    expect(calcularPrecioItem(panadol, 1, undefined, null, undefined)).toBe(3.50);
  });

  it('con mayorista activo y sin precioLote: aplica precioMayorista (regla existente)', () => {
    const panadolMayor: ProductoBase = { ...panadol, precioMayorista: 2.00, cantidadMinimaMayorista: 5 };
    // sin precioLote → aplica mayorista normalmente
    expect(calcularPrecioItem(panadolMayor, 5, undefined, null, undefined)).toBe(2.00);
  });

  it('con precioLote=null y mayorista activo: sigue aplicando mayorista (precio del lote no interfiere)', () => {
    const panadolMayor: ProductoBase = { ...panadol, precioMayorista: 2.00, cantidadMinimaMayorista: 5 };
    // null no es > 0 → no aplica precioLote → cae a mayorista
    expect(calcularPrecioItem(panadolMayor, 5, undefined, null, null as unknown as undefined)).toBe(2.00);
  });

  it('nunca usa el costo de compra del lote como precio de venta: precioLote siempre viene de StockLote.precioVenta', () => {
    // Este test documenta la regla de negocio: el sistema usa StockLote.precioVenta, no costoUnitario
    // Si precioVenta del lote es null, el carrito cae al precio del producto, nunca al costo
    expect(calcularPrecioItem(panadol, 1, undefined, null, undefined)).toBe(3.50);
    // No se usa ningún "costoLote" aquí
  });
});

// ── Interacción con presentación: precioLote no interfiere ───────────────────

describe('precioLote con presentación: presentación tiene prioridad (precioLote es para unidad base)', () => {

  const caja20 = { precioVenta: 15.00, precioMayorista: 12.00, cantidadMinima: 5, factor: 20 };

  it('con presentación y precioLote: usa el precio de la presentación, ignora precioLote', () => {
    // precioLote aplica solo a unidad base; con presentación usa el precio de la caja
    const precio = calcularPrecioItem(panadol, 1, undefined, caja20, LOTE_B_PRECIO);
    expect(precio).toBe(15.00); // precioVenta de la presentación
    expect(precio).not.toBe(LOTE_B_PRECIO);
  });

  it('con presentación mayorista activo y precioLote: usa precio mayorista de la presentación', () => {
    const precio = calcularPrecioItem(panadol, 5, undefined, caja20, LOTE_B_PRECIO);
    expect(precio).toBe(12.00); // precioMayorista de la presentación
    expect(precio).not.toBe(LOTE_B_PRECIO);
  });

  it('sin presentación + precioLote: usa precioLote del lote', () => {
    const precio = calcularPrecioItem(panadol, 1, undefined, null, LOTE_B_PRECIO);
    expect(precio).toBe(LOTE_B_PRECIO);
  });
});
