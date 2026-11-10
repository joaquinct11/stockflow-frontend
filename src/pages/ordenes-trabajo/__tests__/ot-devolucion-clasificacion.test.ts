/**
 * Tests para funciones puras de Fase 2B:
 * - cantidadPendienteDevolucion
 * - cantidadPendienteClasificacion
 * - validaciones de acciones (servicio bloqueado, supera disponible)
 */

import { describe, it, expect } from 'vitest';

// ── Pure helpers ──────────────────────────────────────────────────────────────

interface ConsumoSnapshot {
  cantidadBase: number;
  cantidadDevuelta: number;
  cantidadClasificada: number;
  productoTipo: string | null;
}

function cantidadPendienteDevolucion(c: ConsumoSnapshot): number {
  return c.cantidadBase - c.cantidadDevuelta;
}

function cantidadPendienteClasificacion(c: ConsumoSnapshot): number {
  return c.cantidadBase - c.cantidadDevuelta - c.cantidadClasificada;
}

function puedeDevolver(c: ConsumoSnapshot): boolean {
  return c.productoTipo !== 'SERVICIO' && cantidadPendienteDevolucion(c) > 0;
}

function puedeClasificar(c: ConsumoSnapshot): boolean {
  return c.productoTipo !== 'SERVICIO' && cantidadPendienteClasificacion(c) > 0;
}

function validarCantidadDevolucion(c: ConsumoSnapshot, solicitada: number): string | null {
  if (solicitada < 1) return 'La cantidad debe ser mayor a cero';
  const disponible = cantidadPendienteDevolucion(c);
  if (solicitada > disponible) return `Supera la disponible (${disponible})`;
  return null;
}

function validarCantidadClasificacion(c: ConsumoSnapshot, solicitada: number): string | null {
  if (solicitada < 1) return 'La cantidad debe ser mayor a cero';
  const disponible = cantidadPendienteClasificacion(c);
  if (solicitada > disponible) return `Supera la disponible (${disponible})`;
  return null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeConsumo(overrides: Partial<ConsumoSnapshot> = {}): ConsumoSnapshot {
  return {
    cantidadBase: 10,
    cantidadDevuelta: 0,
    cantidadClasificada: 0,
    productoTipo: 'PRODUCTO',
    ...overrides,
  };
}

// ── Tests: cantidadPendienteDevolucion ────────────────────────────────────────

describe('cantidadPendienteDevolucion', () => {
  it('sin devoluciones previas retorna cantidadBase', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 0 });
    expect(cantidadPendienteDevolucion(c)).toBe(10);
  });

  it('con devolución parcial retorna el remanente', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 3 });
    expect(cantidadPendienteDevolucion(c)).toBe(7);
  });

  it('con todo devuelto retorna cero', () => {
    const c = makeConsumo({ cantidadBase: 5, cantidadDevuelta: 5 });
    expect(cantidadPendienteDevolucion(c)).toBe(0);
  });
});

// ── Tests: cantidadPendienteClasificacion ─────────────────────────────────────

describe('cantidadPendienteClasificacion', () => {
  it('sin devoluciones ni clasificaciones retorna cantidadBase', () => {
    const c = makeConsumo({ cantidadBase: 8, cantidadDevuelta: 0, cantidadClasificada: 0 });
    expect(cantidadPendienteClasificacion(c)).toBe(8);
  });

  it('con devuelto parcial descuenta del pendiente de clasificación', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 3, cantidadClasificada: 0 });
    expect(cantidadPendienteClasificacion(c)).toBe(7);
  });

  it('con clasificado parcial descuenta del pendiente', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 0, cantidadClasificada: 4 });
    expect(cantidadPendienteClasificacion(c)).toBe(6);
  });

  it('con devuelto + clasificado descuenta ambos', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 3, cantidadClasificada: 4 });
    expect(cantidadPendienteClasificacion(c)).toBe(3);
  });

  it('con todo devuelto y clasificado retorna cero', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 5, cantidadClasificada: 5 });
    expect(cantidadPendienteClasificacion(c)).toBe(0);
  });
});

// ── Tests: puedeDevolver ──────────────────────────────────────────────────────

describe('puedeDevolver', () => {
  it('producto con pendiente > 0 permite devolver', () => {
    expect(puedeDevolver(makeConsumo({ productoTipo: 'PRODUCTO', cantidadBase: 5, cantidadDevuelta: 0 }))).toBe(true);
  });

  it('servicio no permite devolver', () => {
    expect(puedeDevolver(makeConsumo({ productoTipo: 'SERVICIO', cantidadBase: 5, cantidadDevuelta: 0 }))).toBe(false);
  });

  it('producto completamente devuelto no permite nueva devolución', () => {
    expect(puedeDevolver(makeConsumo({ productoTipo: 'PRODUCTO', cantidadBase: 5, cantidadDevuelta: 5 }))).toBe(false);
  });
});

// ── Tests: puedeClasificar ────────────────────────────────────────────────────

describe('puedeClasificar', () => {
  it('producto con pendiente > 0 permite clasificar', () => {
    expect(puedeClasificar(makeConsumo({ productoTipo: 'PRODUCTO', cantidadBase: 5, cantidadDevuelta: 0, cantidadClasificada: 0 }))).toBe(true);
  });

  it('servicio no permite clasificar', () => {
    expect(puedeClasificar(makeConsumo({ productoTipo: 'SERVICIO', cantidadBase: 5, cantidadDevuelta: 0, cantidadClasificada: 0 }))).toBe(false);
  });

  it('producto con todo devuelto y clasificado no permite clasificar', () => {
    expect(puedeClasificar(makeConsumo({ productoTipo: 'PRODUCTO', cantidadBase: 6, cantidadDevuelta: 3, cantidadClasificada: 3 }))).toBe(false);
  });

  it('producto parcialmente devuelto pero sin clasificar permite clasificar', () => {
    expect(puedeClasificar(makeConsumo({ productoTipo: 'PRODUCTO', cantidadBase: 10, cantidadDevuelta: 3, cantidadClasificada: 0 }))).toBe(true);
  });
});

// ── Tests: validarCantidadDevolucion ──────────────────────────────────────────

describe('validarCantidadDevolucion', () => {
  it('cantidad válida retorna null', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 2 });
    expect(validarCantidadDevolucion(c, 5)).toBeNull();
  });

  it('cantidad exactamente disponible retorna null', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 2 });
    expect(validarCantidadDevolucion(c, 8)).toBeNull();
  });

  it('cantidad cero falla', () => {
    expect(validarCantidadDevolucion(makeConsumo(), 0)).not.toBeNull();
  });

  it('cantidad negativa falla', () => {
    expect(validarCantidadDevolucion(makeConsumo(), -1)).not.toBeNull();
  });

  it('supera disponible retorna mensaje de error', () => {
    const c = makeConsumo({ cantidadBase: 5, cantidadDevuelta: 2 });
    const error = validarCantidadDevolucion(c, 4); // disponible = 3
    expect(error).not.toBeNull();
    expect(error).toContain('Supera');
  });
});

// ── Tests: validarCantidadClasificacion ──────────────────────────────────────

describe('validarCantidadClasificacion', () => {
  it('cantidad válida retorna null', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 2, cantidadClasificada: 1 });
    expect(validarCantidadClasificacion(c, 3)).toBeNull(); // disponible = 7
  });

  it('cantidad cero falla', () => {
    expect(validarCantidadClasificacion(makeConsumo(), 0)).not.toBeNull();
  });

  it('supera el pendiente considerando ya devuelto y clasificado', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 3, cantidadClasificada: 4 });
    const error = validarCantidadClasificacion(c, 5); // disponible = 3
    expect(error).not.toBeNull();
    expect(error).toContain('Supera');
  });

  it('cantidad exactamente igual al pendiente es válida', () => {
    const c = makeConsumo({ cantidadBase: 10, cantidadDevuelta: 3, cantidadClasificada: 4 });
    expect(validarCantidadClasificacion(c, 3)).toBeNull();
  });
});
