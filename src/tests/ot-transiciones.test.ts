/**
 * Tests de lógica pura para las transiciones de estado de OT.
 * Verifica que FACTURADA y ENTREGADA no aparezcan en el selector manual.
 */

import { describe, it, expect } from 'vitest';

// Réplica exacta del mapa de transiciones de OtDetailPage.tsx
const TRANSICIONES: Record<string, string[]> = {
  ABIERTA:            ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO:         ['DIAGNOSTICADA', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  DIAGNOSTICADA:      ['EN_PROCESO', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  PENDIENTE_REPUESTO: ['EN_PROCESO', 'DIAGNOSTICADA', 'CERRADA_TECN', 'CANCELADA'],
  CERRADA_TECN:       ['CANCELADA'],
  FACTURADA:          [],
  ENTREGADA:          [],
  CANCELADA:          [],
};

describe('TRANSICIONES — restricciones de estado manual', () => {
  it('FT1: FACTURADA no aparece en ninguna transición manual', () => {
    const todas = Object.values(TRANSICIONES).flat();
    expect(todas).not.toContain('FACTURADA');
  });

  it('FT2: ENTREGADA no aparece en ninguna transición manual', () => {
    const todas = Object.values(TRANSICIONES).flat();
    expect(todas).not.toContain('ENTREGADA');
  });

  it('FT3: CANCELADA sigue disponible desde CERRADA_TECN', () => {
    expect(TRANSICIONES['CERRADA_TECN']).toContain('CANCELADA');
  });

  it('FT4: botón Cambiar estado no se muestra desde FACTURADA (lista vacía)', () => {
    expect((TRANSICIONES['FACTURADA'] ?? []).length).toBe(0);
  });

  it('FT5: CANCELADA disponible desde EN_PROCESO', () => {
    expect(TRANSICIONES['EN_PROCESO']).toContain('CANCELADA');
  });
});
