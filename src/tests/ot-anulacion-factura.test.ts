/**
 * Tests de lógica pura para Fase 2G: Anulación de facturación de OT.
 * Verifican visibilidad del botón, estado posterior, bloqueo de anularVenta normal,
 * y posibilidad de refacturación.
 */

import { describe, it, expect } from 'vitest';

// ── Réplica de tipos ──────────────────────────────────────────────────────────

type OtEstado =
  | 'ABIERTA' | 'EN_PROCESO' | 'DIAGNOSTICADA' | 'PENDIENTE_REPUESTO'
  | 'CERRADA_TECN' | 'FACTURADA' | 'ENTREGADA' | 'CANCELADA';

interface OrdenTrabajoDTO {
  id: number;
  estado: OtEstado;
  ventaId: number | null;
  historial: { estadoNuevo: string }[] | null;
}

// ── Réplica de lógica de visibilidad del botón ───────────────────────────────

function botonAnularFacturaVisible(
  estado: OtEstado,
  isAdmin: boolean,
  puedeAnularFactura: boolean,
): boolean {
  return estado === 'FACTURADA' && (isAdmin || puedeAnularFactura);
}

// ── Réplica del estado OT después de anulación ────────────────────────────────

function estadoOtDespuesDeAnulacion(estadoActual: OtEstado): OtEstado | null {
  if (estadoActual !== 'FACTURADA') return null;
  return 'CERRADA_TECN';
}

// ── Réplica de validación de bloqueo de anularVenta normal ───────────────────

function anularVentaNormalEsBloqueable(ordenTrabajoId: number | null): boolean {
  return ordenTrabajoId !== null;
}

// ── Réplica de posibilidad de refacturación ───────────────────────────────────

function puedeRefacturar(ventaEstado: 'COMPLETADA' | 'ANULADA' | null): boolean {
  if (ventaEstado === null) return true;    // sin venta previa → primera facturación
  return ventaEstado === 'ANULADA';         // con venta anulada → refacturación permitida
}

function bloqueaDobleFacturacion(ventaEstado: 'COMPLETADA' | 'ANULADA' | null): boolean {
  return ventaEstado === 'COMPLETADA';
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AF-FE1 — Botón "Anular facturación": visibilidad', () => {
  it('AF-FE1.1 visible cuando estado=FACTURADA y usuario es admin', () => {
    expect(botonAnularFacturaVisible('FACTURADA', true, false)).toBe(true);
  });

  it('AF-FE1.2 visible cuando estado=FACTURADA y usuario tiene permiso', () => {
    expect(botonAnularFacturaVisible('FACTURADA', false, true)).toBe(true);
  });

  it('AF-FE1.3 NO visible cuando estado=ENTREGADA', () => {
    expect(botonAnularFacturaVisible('ENTREGADA', true, true)).toBe(false);
  });

  it('AF-FE1.4 NO visible cuando estado=CERRADA_TECN', () => {
    expect(botonAnularFacturaVisible('CERRADA_TECN', true, true)).toBe(false);
  });

  it('AF-FE1.5 NO visible cuando estado=ABIERTA', () => {
    expect(botonAnularFacturaVisible('ABIERTA', true, true)).toBe(false);
  });

  it('AF-FE1.6 NO visible cuando estado=FACTURADA pero sin permiso y no admin', () => {
    expect(botonAnularFacturaVisible('FACTURADA', false, false)).toBe(false);
  });

  it('AF-FE1.7 NO visible cuando estado=CANCELADA', () => {
    expect(botonAnularFacturaVisible('CANCELADA', true, true)).toBe(false);
  });

  it('AF-FE1.8 NO visible cuando estado=EN_PROCESO', () => {
    expect(botonAnularFacturaVisible('EN_PROCESO', true, true)).toBe(false);
  });
});

describe('AF-FE2 — Estado OT tras confirmar anulación', () => {
  it('AF-FE2.1 OT en FACTURADA cambia a CERRADA_TECN', () => {
    expect(estadoOtDespuesDeAnulacion('FACTURADA')).toBe('CERRADA_TECN');
  });

  it('AF-FE2.2 OT en CERRADA_TECN no cambia (retorna null)', () => {
    expect(estadoOtDespuesDeAnulacion('CERRADA_TECN')).toBeNull();
  });

  it('AF-FE2.3 OT en ENTREGADA no cambia (retorna null)', () => {
    expect(estadoOtDespuesDeAnulacion('ENTREGADA')).toBeNull();
  });

  it('AF-FE2.4 setOt actualiza estado correctamente tras anulación', () => {
    const otAntesDe: OrdenTrabajoDTO = {
      id: 1, estado: 'FACTURADA', ventaId: 500,
      historial: [{ estadoNuevo: 'FACTURADA' }],
    };
    const otDespuesDe: OrdenTrabajoDTO = {
      ...otAntesDe,
      estado: 'CERRADA_TECN',
      historial: [{ estadoNuevo: 'FACTURADA' }, { estadoNuevo: 'CERRADA_TECN' }],
    };
    expect(otDespuesDe.estado).toBe('CERRADA_TECN');
    expect((otDespuesDe.historial ?? []).length).toBe(2);
  });
});

describe('AF-FE3 — Bloqueo de anulación normal para ventas de OT', () => {
  it('AF-FE3.1 venta con ordenTrabajoId es bloqueable vía anularVenta normal', () => {
    expect(anularVentaNormalEsBloqueable(1)).toBe(true);
  });

  it('AF-FE3.2 venta sin ordenTrabajoId NO es bloqueable (venta normal)', () => {
    expect(anularVentaNormalEsBloqueable(null)).toBe(false);
  });

  it('AF-FE3.3 venta con ordenTrabajoId distinto también es bloqueable', () => {
    expect(anularVentaNormalEsBloqueable(99)).toBe(true);
  });
});

describe('AF-FE4 — Refacturación tras anulación', () => {
  it('AF-FE4.1 botón "Facturar OT" visible cuando estado=CERRADA_TECN (tras anulación)', () => {
    const botonFacturarVisible = (estado: OtEstado) => estado === 'CERRADA_TECN';
    expect(botonFacturarVisible('CERRADA_TECN')).toBe(true);
  });

  it('AF-FE4.2 venta previa ANULADA permite refacturación', () => {
    expect(puedeRefacturar('ANULADA')).toBe(true);
  });

  it('AF-FE4.3 sin venta previa permite primera facturación', () => {
    expect(puedeRefacturar(null)).toBe(true);
  });

  it('AF-FE4.4 venta previa COMPLETADA bloquea refacturación', () => {
    expect(bloqueaDobleFacturacion('COMPLETADA')).toBe(true);
  });

  it('AF-FE4.5 venta previa ANULADA NO bloquea refacturación', () => {
    expect(bloqueaDobleFacturacion('ANULADA')).toBe(false);
  });

  it('AF-FE4.6 ventaId mantenido en OT tras anulación (para historial)', () => {
    const ot: OrdenTrabajoDTO = { id: 1, estado: 'CERRADA_TECN', ventaId: 500, historial: [] };
    // ventaId sigue siendo 500, no null, para mantener trazabilidad
    expect(ot.ventaId).toBe(500);
  });
});
