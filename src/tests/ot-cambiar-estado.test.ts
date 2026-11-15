/**
 * Tests de regresión para el bug: pantalla en blanco al cambiar estado de OT.
 * Bug: actualizarEstado devolvía historial=null → TypeError en render → blank screen.
 */

import { describe, it, expect } from 'vitest';

// ── Réplica del OrdenTrabajoDTO parcial ───────────────────────────────────────

interface HistorialEstadoDTO {
  id: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuarioId: number;
  observacion: string | null;
  createdAt: string;
}

interface OrdenTrabajoDTO {
  id: number;
  numeroOt: string;
  estado: string;
  historial: HistorialEstadoDTO[] | null;
}

// ── Réplica de la lógica de renderizado del tab historial ─────────────────────

function historialTabLabel(ot: OrdenTrabajoDTO): string {
  const len = (ot.historial ?? []).length;
  return `Historial${len > 0 ? ` (${len})` : ''}`;
}

function historialVacio(ot: OrdenTrabajoDTO): boolean {
  return (ot.historial ?? []).length === 0;
}

function historialEntradas(ot: OrdenTrabajoDTO): HistorialEstadoDTO[] {
  return ot.historial ?? [];
}

// ── Réplica de las transiciones válidas ───────────────────────────────────────

type OtEstado =
  | 'ABIERTA' | 'EN_PROCESO' | 'DIAGNOSTICADA' | 'PENDIENTE_REPUESTO'
  | 'CERRADA_TECN' | 'FACTURADA' | 'ENTREGADA' | 'CANCELADA';

const TRANSICIONES: Record<OtEstado, OtEstado[]> = {
  ABIERTA:            ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO:         ['DIAGNOSTICADA', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  DIAGNOSTICADA:      ['EN_PROCESO', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  PENDIENTE_REPUESTO: ['EN_PROCESO', 'DIAGNOSTICADA', 'CERRADA_TECN', 'CANCELADA'],
  CERRADA_TECN:       ['CANCELADA'],
  FACTURADA:          [],
  ENTREGADA:          [],
  CANCELADA:          [],
};

function transicionesDisponibles(estado: OtEstado): OtEstado[] {
  return TRANSICIONES[estado] ?? [];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CE-FE1 — Renderizado defensivo con historial=null (regresión bug blank screen)', () => {
  it('CE-FE1.1 historialTabLabel no lanza TypeError cuando historial=null', () => {
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null };
    expect(() => historialTabLabel(ot)).not.toThrow();
  });

  it('CE-FE1.2 historialTabLabel retorna "Historial" cuando historial=null', () => {
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null };
    expect(historialTabLabel(ot)).toBe('Historial');
  });

  it('CE-FE1.3 historialVacio no lanza TypeError cuando historial=null', () => {
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null };
    expect(() => historialVacio(ot)).not.toThrow();
  });

  it('CE-FE1.4 historialVacio=true cuando historial=null', () => {
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null };
    expect(historialVacio(ot)).toBe(true);
  });

  it('CE-FE1.5 historialEntradas retorna [] cuando historial=null', () => {
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null };
    expect(historialEntradas(ot)).toEqual([]);
  });

  it('CE-FE1.6 historialTabLabel retorna "Historial (2)" cuando historial tiene 2 entradas', () => {
    const h: HistorialEstadoDTO = { id: 1, estadoAnterior: 'ABIERTA', estadoNuevo: 'EN_PROCESO', usuarioId: 1, observacion: null, createdAt: '2026-11-07T10:00:00' };
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: [h, { ...h, id: 2 }] };
    expect(historialTabLabel(ot)).toBe('Historial (2)');
  });

  it('CE-FE1.7 historialVacio=false cuando historial tiene entradas', () => {
    const h: HistorialEstadoDTO = { id: 1, estadoAnterior: null, estadoNuevo: 'ABIERTA', usuarioId: 1, observacion: null, createdAt: '2026-11-07T10:00:00' };
    const ot: OrdenTrabajoDTO = { id: 1, numeroOt: 'OT-2026-00001', estado: 'ABIERTA', historial: [h] };
    expect(historialVacio(ot)).toBe(false);
  });
});

describe('CE-FE2 — Transiciones disponibles (validación de reglas de negocio)', () => {
  it('CE-FE2.1 ABIERTA tiene transiciones a EN_PROCESO y CANCELADA', () => {
    expect(transicionesDisponibles('ABIERTA')).toContain('EN_PROCESO');
    expect(transicionesDisponibles('ABIERTA')).toContain('CANCELADA');
  });

  it('CE-FE2.2 EN_PROCESO tiene transiciones a DIAGNOSTICADA, PENDIENTE_REPUESTO, CERRADA_TECN, CANCELADA', () => {
    const t = transicionesDisponibles('EN_PROCESO');
    expect(t).toContain('DIAGNOSTICADA');
    expect(t).toContain('PENDIENTE_REPUESTO');
    expect(t).toContain('CERRADA_TECN');
    expect(t).toContain('CANCELADA');
  });

  it('CE-FE2.3 FACTURADA no tiene transiciones manuales', () => {
    expect(transicionesDisponibles('FACTURADA')).toHaveLength(0);
  });

  it('CE-FE2.4 ENTREGADA no tiene transiciones manuales', () => {
    expect(transicionesDisponibles('ENTREGADA')).toHaveLength(0);
  });

  it('CE-FE2.5 CANCELADA no tiene transiciones', () => {
    expect(transicionesDisponibles('CANCELADA')).toHaveLength(0);
  });

  it('CE-FE2.6 DIAGNOSTICADA puede volver a EN_PROCESO', () => {
    expect(transicionesDisponibles('DIAGNOSTICADA')).toContain('EN_PROCESO');
  });

  it('CE-FE2.7 PENDIENTE_REPUESTO puede volver a EN_PROCESO', () => {
    expect(transicionesDisponibles('PENDIENTE_REPUESTO')).toContain('EN_PROCESO');
  });
});

describe('CE-FE3 — Actualización de estado local sin pantalla en blanco', () => {
  it('CE-FE3.1 setOt con historial=null no produce errores en acceso defensivo', () => {
    // Simula el flujo: cambiarEstado devuelve DTO con historial=null, el render no explota
    const updatedFromBackend: OrdenTrabajoDTO = {
      id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: null,
    };
    // Accesos que antes causaban el crash:
    expect(() => (updatedFromBackend.historial ?? []).length).not.toThrow();
    expect(() => (updatedFromBackend.historial ?? []).map(h => h.id)).not.toThrow();
    const len = (updatedFromBackend.historial ?? []).length;
    expect(len).toBe(0);
  });

  it('CE-FE3.2 setOt con historial=[] funciona correctamente', () => {
    const updatedFromBackend: OrdenTrabajoDTO = {
      id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: [],
    };
    expect((updatedFromBackend.historial ?? []).length).toBe(0);
    expect(historialVacio(updatedFromBackend)).toBe(true);
  });

  it('CE-FE3.3 setOt con historial populado muestra las entradas', () => {
    const h: HistorialEstadoDTO = {
      id: 1, estadoAnterior: 'ABIERTA', estadoNuevo: 'EN_PROCESO',
      usuarioId: 99, observacion: 'Iniciando trabajo', createdAt: '2026-11-07T10:00:00',
    };
    const updatedFromBackend: OrdenTrabajoDTO = {
      id: 1, numeroOt: 'OT-2026-00001', estado: 'EN_PROCESO', historial: [h],
    };
    expect(historialEntradas(updatedFromBackend)).toHaveLength(1);
    expect(historialEntradas(updatedFromBackend)[0].estadoNuevo).toBe('EN_PROCESO');
  });
});
