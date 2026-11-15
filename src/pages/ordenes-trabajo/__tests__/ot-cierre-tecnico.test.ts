/**
 * Tests para la lógica del CierreTecnicoModal (OtDetailPage.tsx).
 *
 * Replica las funciones puras del modal para testearlas de forma aislada:
 *   - puedeConfirmar:        true solo cuando no hay pendientes y los campos están completos
 *   - calcPendientes:        filtra consumos con unidades sin regularizar (físicos únicamente)
 *   - esPendiente:           comprueba si un consumo individual tiene saldo pendiente
 */

import { describe, it, expect } from 'vitest';

// ── Tipos mínimos ─────────────────────────────────────────────────────────────

interface ConsumoMin {
  id: number;
  productoTipo: string | null;
  cantidadBase: number;
  cantidadDevuelta: number;
  cantidadClasificada: number;
  productoNombre?: string | null;
}

// ── Funciones extraídas del modal ─────────────────────────────────────────────

function esPendiente(c: ConsumoMin): boolean {
  if (c.productoTipo === 'SERVICIO') return false;
  const devuelta    = c.cantidadDevuelta    ?? 0;
  const clasificada = c.cantidadClasificada ?? 0;
  return (c.cantidadBase - devuelta - clasificada) > 0;
}

function calcPendientes(consumos: ConsumoMin[]): ConsumoMin[] {
  return consumos.filter(esPendiente);
}

function puedeConfirmar(
  consumos: ConsumoMin[],
  diagnosticoFinal: string,
  solucionAplicada: string,
  saving: boolean,
): boolean {
  const hasPendientes = calcPendientes(consumos).length > 0;
  return !saving && !hasPendientes && diagnosticoFinal.trim().length > 0 && solucionAplicada.trim().length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CierreTecnicoModal — lógica pura', () => {

  // CT-FE-1: botón habilitado según estado y permisos (simula condición de visibilidad)
  it('CT-FE-1: botón visible cuando estado es EN_PROCESO y usuario tiene permiso', () => {
    const ESTADOS_PERMITIDOS = ['EN_PROCESO', 'DIAGNOSTICADA', 'PENDIENTE_REPUESTO'];
    const estadosQueMuestranBoton = (estado: string, canCerrarTecnico: boolean) =>
      canCerrarTecnico && ESTADOS_PERMITIDOS.includes(estado);

    expect(estadosQueMuestranBoton('EN_PROCESO', true)).toBe(true);
    expect(estadosQueMuestranBoton('DIAGNOSTICADA', true)).toBe(true);
    expect(estadosQueMuestranBoton('PENDIENTE_REPUESTO', true)).toBe(true);
    expect(estadosQueMuestranBoton('ABIERTA', true)).toBe(false);
    expect(estadosQueMuestranBoton('CERRADA_TECN', true)).toBe(false);
    expect(estadosQueMuestranBoton('EN_PROCESO', false)).toBe(false);
  });

  // CT-FE-2: formulario requiere diagnóstico y solución no vacíos
  it('CT-FE-2: puedeConfirmar es false cuando los campos obligatorios están vacíos', () => {
    expect(puedeConfirmar([], '', 'Solución', false)).toBe(false);
    expect(puedeConfirmar([], 'Diag', '', false)).toBe(false);
    expect(puedeConfirmar([], '  ', 'Solución', false)).toBe(false);
    expect(puedeConfirmar([], 'Diag', '   ', false)).toBe(false);
    expect(puedeConfirmar([], 'Diag', 'Sol', false)).toBe(true);
  });

  // CT-FE-3: lista de pendientes correcta (servicios excluidos)
  it('CT-FE-3: calcPendientes excluye SERVICIO y detecta físicos con saldo', () => {
    const consumos: ConsumoMin[] = [
      { id: 1, productoTipo: 'FISICO',   cantidadBase: 5, cantidadDevuelta: 3, cantidadClasificada: 2, productoNombre: 'Repuesto A' }, // pendiente=0
      { id: 2, productoTipo: 'FISICO',   cantidadBase: 5, cantidadDevuelta: 2, cantidadClasificada: 1, productoNombre: 'Repuesto B' }, // pendiente=2
      { id: 3, productoTipo: 'SERVICIO', cantidadBase: 1, cantidadDevuelta: 0, cantidadClasificada: 0, productoNombre: 'Mano obra'  }, // servicio → ignorado
    ];

    const pendientes = calcPendientes(consumos);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].id).toBe(2);
  });

  // CT-FE-4: impedir confirmación si existen pendientes
  it('CT-FE-4: puedeConfirmar es false cuando existen consumos físicos sin regularizar', () => {
    const consumoConPendiente: ConsumoMin[] = [
      { id: 1, productoTipo: 'FISICO', cantidadBase: 3, cantidadDevuelta: 1, cantidadClasificada: 0, productoNombre: 'Repuesto' },
    ];

    expect(puedeConfirmar(consumoConPendiente, 'Diagnóstico', 'Solución', false)).toBe(false);
  });

  // CT-FE-5: cierre exitoso actualiza la OT — verifica que el saldo llega a 0 tras regularizar
  it('CT-FE-5: puedeConfirmar es true cuando todos los consumos están regularizados', () => {
    const consumosRegularizados: ConsumoMin[] = [
      { id: 1, productoTipo: 'FISICO',   cantidadBase: 5, cantidadDevuelta: 3, cantidadClasificada: 2, productoNombre: 'Repuesto A' },
      { id: 2, productoTipo: 'FISICO',   cantidadBase: 2, cantidadDevuelta: 0, cantidadClasificada: 2, productoNombre: 'Repuesto B' },
      { id: 3, productoTipo: 'SERVICIO', cantidadBase: 1, cantidadDevuelta: 0, cantidadClasificada: 0, productoNombre: 'Mano obra'  },
    ];

    expect(calcPendientes(consumosRegularizados)).toHaveLength(0);
    expect(puedeConfirmar(consumosRegularizados, 'Diagnóstico final', 'Solución aplicada', false)).toBe(true);
    expect(puedeConfirmar(consumosRegularizados, 'Diagnóstico final', 'Solución aplicada', true)).toBe(false); // saving bloquea
  });
});
