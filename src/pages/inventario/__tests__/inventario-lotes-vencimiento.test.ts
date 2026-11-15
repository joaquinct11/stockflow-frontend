/**
 * Tests para la lógica de clasificación de vencimiento en InventarioList.tsx.
 * Replica la lógica inline de la tabla de lotes.
 */

import { describe, it, expect } from 'vitest';

type LoteVencimiento = { diasRestantes: number | null };

function clasificarLote(l: LoteVencimiento) {
  const sinFecha = l.diasRestantes == null;
  const vencido = !sinFecha && l.diasRestantes! < 0;
  const critico = !sinFecha && !vencido && l.diasRestantes! <= 7;
  const proximo = !sinFecha && !vencido && l.diasRestantes! <= 90;

  const estadoLabel = sinFecha
    ? 'Sin vencimiento'
    : vencido
    ? 'Vencido'
    : critico
    ? 'Crítico'
    : proximo
    ? `${l.diasRestantes}d`
    : 'Vigente';

  const textoRestantes = sinFecha
    ? ''
    : vencido
    ? `Venció hace ${Math.abs(l.diasRestantes!)}d`
    : `${l.diasRestantes}d restantes`;

  return { sinFecha, vencido, critico, proximo, estadoLabel, textoRestantes };
}

function pasaFiltro(l: LoteVencimiento, filtro: string): boolean {
  if (filtro === 'vencidos' && (l.diasRestantes == null || l.diasRestantes >= 0)) return false;
  if (filtro === 'proximos30' && (l.diasRestantes == null || l.diasRestantes < 0 || l.diasRestantes > 30)) return false;
  if (filtro === 'proximos90' && (l.diasRestantes == null || l.diasRestantes < 0 || l.diasRestantes > 90)) return false;
  return true;
}

describe('Lotes sin fecha de vencimiento', () => {
  it('IL-1: muestra "Sin vencimiento" cuando diasRestantes es null', () => {
    const { estadoLabel } = clasificarLote({ diasRestantes: null });
    expect(estadoLabel).toBe('Sin vencimiento');
  });

  it('IL-2: no muestra "null restantes" cuando diasRestantes es null', () => {
    const { textoRestantes } = clasificarLote({ diasRestantes: null });
    expect(textoRestantes).not.toContain('null');
    expect(textoRestantes).toBe('');
  });

  it('IL-3: no clasifica como "Crítico" cuando diasRestantes es null', () => {
    const { critico, estadoLabel } = clasificarLote({ diasRestantes: null });
    expect(critico).toBe(false);
    expect(estadoLabel).not.toBe('Crítico');
  });

  it('IL-3b: lote sin fecha no aparece en filtros de vencidos/próximos', () => {
    const lote: LoteVencimiento = { diasRestantes: null };
    expect(pasaFiltro(lote, 'vencidos')).toBe(false);
    expect(pasaFiltro(lote, 'proximos30')).toBe(false);
    expect(pasaFiltro(lote, 'proximos90')).toBe(false);
    expect(pasaFiltro(lote, 'todos')).toBe(true);
  });
});

describe('Lotes con fecha de vencimiento (comportamiento conservado)', () => {
  it('IL-4: lote con fecha próxima (5 días) se clasifica como "Crítico"', () => {
    const { critico, estadoLabel } = clasificarLote({ diasRestantes: 5 });
    expect(critico).toBe(true);
    expect(estadoLabel).toBe('Crítico');
  });

  it('IL-4b: lote con fecha en 30 días se clasifica con días restantes', () => {
    const { proximo, estadoLabel } = clasificarLote({ diasRestantes: 30 });
    expect(proximo).toBe(true);
    expect(estadoLabel).toBe('30d');
  });

  it('IL-4c: lote con fecha en 30 días aparece en filtro proximos30', () => {
    expect(pasaFiltro({ diasRestantes: 30 }, 'proximos30')).toBe(true);
  });

  it('IL-5: lote vencido (diasRestantes negativo) se clasifica como "Vencido"', () => {
    const { vencido, estadoLabel, textoRestantes } = clasificarLote({ diasRestantes: -3 });
    expect(vencido).toBe(true);
    expect(estadoLabel).toBe('Vencido');
    expect(textoRestantes).toBe('Venció hace 3d');
  });

  it('IL-5b: lote vencido aparece en filtro vencidos pero no en proximos30', () => {
    const lote: LoteVencimiento = { diasRestantes: -3 };
    expect(pasaFiltro(lote, 'vencidos')).toBe(true);
    expect(pasaFiltro(lote, 'proximos30')).toBe(false);
  });

  it('IL-4d: lote vigente (200 días) se clasifica como "Vigente"', () => {
    const { estadoLabel } = clasificarLote({ diasRestantes: 200 });
    expect(estadoLabel).toBe('Vigente');
  });
});
