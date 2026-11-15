/**
 * Tests de lógica pura para Fase 2E: Entrega del equipo en Órdenes de Trabajo.
 * Verifican visibilidad del botón, validación de formulario y datos de entrega.
 */

import { describe, it, expect } from 'vitest';

// ── Réplica de la lógica de visibilidad ──────────────────────────────────────

type OtEstado =
  | 'ABIERTA' | 'EN_PROCESO' | 'DIAGNOSTICADA' | 'PENDIENTE_REPUESTO'
  | 'CERRADA_TECN' | 'FACTURADA' | 'ENTREGADA' | 'CANCELADA';

function botonEntregaVisible(estado: OtEstado, isAdmin: boolean, puedeEntrega: boolean): boolean {
  return estado === 'FACTURADA' && (isAdmin || puedeEntrega);
}

function seccionEntregaVisible(estado: OtEstado, fechaEntrega: string | null): boolean {
  return estado === 'ENTREGADA' && fechaEntrega !== null;
}

// ── Réplica de la validación de EntregarOtRequestDTO ─────────────────────────

interface EntregarOtFormErrors {
  recibidoPor?: string;
}

function validateEntregaForm(recibidoPor: string): EntregarOtFormErrors {
  const errors: EntregarOtFormErrors = {};
  if (!recibidoPor.trim()) {
    errors.recibidoPor = 'El nombre de quien recibe es obligatorio';
  }
  return errors;
}

function formValido(recibidoPor: string): boolean {
  return Object.keys(validateEntregaForm(recibidoPor)).length === 0;
}

// ── Réplica de buildEntregaDto ────────────────────────────────────────────────

interface EntregarOtRequestDTO {
  recibidoPor: string;
  documentoReceptor?: string;
  conformidadCliente: boolean;
  observaciones?: string;
}

function buildEntregaDto(
  recibidoPor: string,
  documentoReceptor: string,
  conformidadCliente: boolean,
  observaciones: string,
): EntregarOtRequestDTO {
  return {
    recibidoPor: recibidoPor.trim(),
    documentoReceptor: documentoReceptor.trim() || undefined,
    conformidadCliente,
    observaciones: observaciones.trim() || undefined,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EN1 — Botón "Registrar entrega": visibilidad', () => {
  it('EN1.1 visible cuando estado=FACTURADA y usuario es admin', () => {
    expect(botonEntregaVisible('FACTURADA', true, false)).toBe(true);
  });

  it('EN1.2 visible cuando estado=FACTURADA y usuario tiene permiso', () => {
    expect(botonEntregaVisible('FACTURADA', false, true)).toBe(true);
  });

  it('EN1.3 NO visible cuando estado=ENTREGADA', () => {
    expect(botonEntregaVisible('ENTREGADA', true, true)).toBe(false);
  });

  it('EN1.4 NO visible cuando estado=CERRADA_TECN', () => {
    expect(botonEntregaVisible('CERRADA_TECN', true, true)).toBe(false);
  });

  it('EN1.5 NO visible cuando estado=ABIERTA', () => {
    expect(botonEntregaVisible('ABIERTA', true, true)).toBe(false);
  });

  it('EN1.6 NO visible cuando estado=FACTURADA pero sin permiso y no admin', () => {
    expect(botonEntregaVisible('FACTURADA', false, false)).toBe(false);
  });

  it('EN1.7 NO visible cuando estado=CANCELADA', () => {
    expect(botonEntregaVisible('CANCELADA', true, true)).toBe(false);
  });
});

describe('EN2 — Sección "Datos de entrega": visibilidad', () => {
  it('EN2.1 visible cuando estado=ENTREGADA con fechaEntrega', () => {
    expect(seccionEntregaVisible('ENTREGADA', '2026-11-07T10:00:00')).toBe(true);
  });

  it('EN2.2 NO visible cuando estado=FACTURADA', () => {
    expect(seccionEntregaVisible('FACTURADA', null)).toBe(false);
  });

  it('EN2.3 NO visible cuando estado=ENTREGADA pero sin fechaEntrega', () => {
    expect(seccionEntregaVisible('ENTREGADA', null)).toBe(false);
  });

  it('EN2.4 NO visible cuando estado=ABIERTA', () => {
    expect(seccionEntregaVisible('ABIERTA', '2026-11-07T10:00:00')).toBe(false);
  });
});

describe('EN3 — Validación del formulario de entrega', () => {
  it('EN3.1 formulario válido con nombre no vacío', () => {
    expect(formValido('Juan Pérez')).toBe(true);
  });

  it('EN3.2 inválido cuando recibidoPor está vacío', () => {
    expect(formValido('')).toBe(false);
  });

  it('EN3.3 inválido cuando recibidoPor tiene solo espacios', () => {
    expect(formValido('   ')).toBe(false);
  });

  it('EN3.4 error message describe el campo requerido', () => {
    const errors = validateEntregaForm('');
    expect(errors.recibidoPor).toContain('obligatorio');
  });

  it('EN3.5 no hay errores con nombre válido', () => {
    const errors = validateEntregaForm('María García');
    expect(errors.recibidoPor).toBeUndefined();
  });
});

describe('EN4 — Construcción del DTO de entrega', () => {
  it('EN4.1 incluye recibidoPor trimmed', () => {
    const dto = buildEntregaDto('  Juan  ', '', true, '');
    expect(dto.recibidoPor).toBe('Juan');
  });

  it('EN4.2 documentoReceptor vacío se omite (undefined)', () => {
    const dto = buildEntregaDto('Juan', '', true, '');
    expect(dto.documentoReceptor).toBeUndefined();
  });

  it('EN4.3 documentoReceptor no vacío se incluye', () => {
    const dto = buildEntregaDto('Juan', '12345678', true, '');
    expect(dto.documentoReceptor).toBe('12345678');
  });

  it('EN4.4 conformidadCliente=true se incluye correctamente', () => {
    const dto = buildEntregaDto('Juan', '', true, '');
    expect(dto.conformidadCliente).toBe(true);
  });

  it('EN4.5 conformidadCliente=false se incluye correctamente', () => {
    const dto = buildEntregaDto('Juan', '', false, '');
    expect(dto.conformidadCliente).toBe(false);
  });

  it('EN4.6 observaciones vacías se omiten (undefined)', () => {
    const dto = buildEntregaDto('Juan', '', true, '');
    expect(dto.observaciones).toBeUndefined();
  });

  it('EN4.7 observaciones no vacías se incluyen', () => {
    const dto = buildEntregaDto('Juan', '', true, 'Se notó golpe leve');
    expect(dto.observaciones).toBe('Se notó golpe leve');
  });
});
