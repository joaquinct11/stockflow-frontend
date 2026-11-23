/**
 * Tests para la lógica de auto-selección de clientes en el POS (panel "Cobrar").
 *
 * Extrae como funciones puras la lógica implementada en POSPage.tsx para poder
 * testearla de forma aislada, siguiendo el patrón de pos-precio-mayorista.test.ts.
 *
 * Cobertura de los 10 escenarios requeridos:
 *   1.  DNI completo + coincidencia exacta  → auto-seleccionar
 *   2.  DNI parcial                          → no auto-seleccionar
 *   3.  DNI inexistente (sin resultados)     → no auto-seleccionar
 *   4.  Varios resultados sin exacta única   → no auto-seleccionar
 *   5.  Cambiar DNI con cliente seleccionado → guardia previene búsqueda
 *   6.  Limpiar mediante X                  → clienteId queda undefined
 *   7.  Venta post auto-selección            → request incluye clienteId correcto
 *   8.  Respuesta tardía (race condition)    → versión obsoleta descartada
 *   9.  Venta sin cliente                    → funciona correctamente
 *  10.  Cambio de negocio (tenant isolation) → búsqueda reiniciada sin reutilizar
 */

import { describe, it, expect } from 'vitest';

// ── Tipos mínimos replicados de POSPage / cliente.service ────────────────────

interface ClienteDTO {
  id?: number;
  nombre: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

// ── Réplica exacta de la lógica de auto-selección (POSPage.tsx:useEffect búsqueda) ──
// Criterios:
//   • query es puramente numérico
//   • longitud exacta de documento completo: DNI=8 dígitos, RUC=11 dígitos
//   • exactamente un resultado
//   • el único resultado tiene numeroDocumento === query

interface EvaluarAutoSeleccionResult {
  debeAutoSeleccionar: boolean;
  cliente?: ClienteDTO;
}

function evaluarAutoSeleccion(
  query: string,
  resultados: ClienteDTO[],
): EvaluarAutoSeleccionResult {
  const isNumeric = /^\d+$/.test(query);
  const esCompleto = query.length === 8 || query.length === 11;

  if (
    isNumeric &&
    esCompleto &&
    resultados.length === 1 &&
    resultados[0].numeroDocumento === query
  ) {
    return { debeAutoSeleccionar: true, cliente: resultados[0] };
  }
  return { debeAutoSeleccionar: false };
}

// ── Réplica de la guardia "si ya hay cliente seleccionado, no buscar" ────────

function debeEjecutarBusqueda(clienteSeleccionado: ClienteDTO | null): boolean {
  return clienteSeleccionado === null;
}

// ── Réplica de resolverClienteId (lógica del 'cobrar' en POSPage.tsx:748) ──

function resolverClienteIdParaVenta(
  clienteSeleccionado: ClienteDTO | null,
): number | undefined {
  return clienteSeleccionado?.id;
}

// ── Réplica de la protección de versión para race conditions ─────────────────

class BusquedaSession {
  private version = 0;

  iniciarBusqueda(): number {
    return ++this.version;
  }

  esVersionActual(capturedVersion: number): boolean {
    return capturedVersion === this.version;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POS — auto-selección de clientes por documento', () => {

  // 1. DNI completo con coincidencia exacta → cliente seleccionado automáticamente
  it('ACS-1: DNI completo (8 dígitos) con coincidencia exacta única → auto-seleccionar', () => {
    const query = '76910956';
    const resultados: ClienteDTO[] = [
      { id: 101, nombre: 'Joaquín Castillo', tipoDocumento: 'DNI', numeroDocumento: '76910956' },
    ];
    const { debeAutoSeleccionar, cliente } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(true);
    expect(cliente?.id).toBe(101);
    expect(cliente?.nombre).toBe('Joaquín Castillo');
  });

  // RUC completo también debe auto-seleccionar
  it('ACS-1b: RUC completo (11 dígitos) con coincidencia exacta única → auto-seleccionar', () => {
    const query = '20100070604';
    const resultados: ClienteDTO[] = [
      { id: 202, nombre: 'Empresa SAC', tipoDocumento: 'RUC', numeroDocumento: '20100070604' },
    ];
    const { debeAutoSeleccionar, cliente } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(true);
    expect(cliente?.id).toBe(202);
  });

  // 2. DNI parcial → no seleccionar
  it('ACS-2: DNI parcial (menos de 8 dígitos) → no auto-seleccionar aunque haya resultados', () => {
    const query = '769109';          // 6 dígitos: incompleto
    const resultados: ClienteDTO[] = [
      { id: 101, nombre: 'Joaquín Castillo', tipoDocumento: 'DNI', numeroDocumento: '76910956' },
    ];
    const { debeAutoSeleccionar } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(false);
  });

  it('ACS-2b: DNI de 7 dígitos no selecciona (falta un dígito)', () => {
    const query = '7691095';         // 7 dígitos: todavía incompleto
    const resultados: ClienteDTO[] = [
      { id: 101, nombre: 'Joaquín Castillo', tipoDocumento: 'DNI', numeroDocumento: '76910956' },
    ];
    expect(evaluarAutoSeleccion(query, resultados).debeAutoSeleccionar).toBe(false);
  });

  // 3. DNI inexistente → no seleccionar, permitir venta sin cliente
  it('ACS-3: DNI completo sin resultados → no auto-seleccionar (venta continúa sin cliente)', () => {
    const query = '99999999';
    const resultados: ClienteDTO[] = [];
    const { debeAutoSeleccionar } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(false);
    // El clienteId debe quedar undefined para la venta
    expect(resolverClienteIdParaVenta(null)).toBeUndefined();
  });

  // 4. Varios resultados sin coincidencia exacta única → no seleccionar arbitrariamente
  it('ACS-4: varios resultados → no auto-seleccionar (requiere clic manual)', () => {
    const query = '12345678';
    const resultados: ClienteDTO[] = [
      { id: 1, nombre: 'Ana García', tipoDocumento: 'DNI', numeroDocumento: '12345678' },
      { id: 2, nombre: 'Ana Gómez',  tipoDocumento: 'DNI', numeroDocumento: '12345679' },
    ];
    // Hay 2 resultados, aunque el primero sea exacto, la condición requiere length===1
    const { debeAutoSeleccionar } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(false);
  });

  it('ACS-4b: documento no exacto (numeroDocumento distinto del query) → no auto-seleccionar', () => {
    const query = '12345678';
    const resultados: ClienteDTO[] = [
      // El resultado tiene un doc diferente (búsqueda parcial del backend)
      { id: 3, nombre: 'Carlos López', tipoDocumento: 'DNI', numeroDocumento: '12345670' },
    ];
    const { debeAutoSeleccionar } = evaluarAutoSeleccion(query, resultados);
    expect(debeAutoSeleccionar).toBe(false);
  });

  // 5. Cliente ya seleccionado → guardia previene nueva búsqueda
  it('ACS-5: si ya hay cliente seleccionado, debeEjecutarBusqueda retorna false', () => {
    const clienteExistente: ClienteDTO = { id: 50, nombre: 'Cliente Anterior' };
    expect(debeEjecutarBusqueda(clienteExistente)).toBe(false);
    // Al quitar el cliente (X), la guardia vuelve a permitir búsqueda
    expect(debeEjecutarBusqueda(null)).toBe(true);
  });

  // 6. Limpiar mediante X → clienteId queda undefined en el request
  it('ACS-6: tras limpiar cliente (X), resolverClienteIdParaVenta retorna undefined', () => {
    expect(resolverClienteIdParaVenta(null)).toBeUndefined();
  });

  // 7. Confirmar venta tras auto-selección → request incluye clienteId correcto
  it('ACS-7: clienteSeleccionado con id → resolverClienteIdParaVenta devuelve ese id', () => {
    const cliente: ClienteDTO = { id: 101, nombre: 'Joaquín Castillo', numeroDocumento: '76910956' };
    const clienteId = resolverClienteIdParaVenta(cliente);
    expect(clienteId).toBe(101);
    // El request de venta nunca debe usar el nombre como sustituto del id
    expect(typeof clienteId).toBe('number');
  });

  it('ACS-7b: cliente sin id (no persisted) → clienteId es undefined (no se envía nombre)', () => {
    const clienteSinId: ClienteDTO = { nombre: 'Sin ID', numeroDocumento: '11111111' };
    expect(resolverClienteIdParaVenta(clienteSinId)).toBeUndefined();
  });

  // 8. Respuesta tardía (race condition) → versión obsoleta descartada
  it('ACS-8: una búsqueda posterior invalida la versión de búsquedas anteriores', () => {
    const session = new BusquedaSession();

    // Primera búsqueda (parcial "7691")
    const v1 = session.iniciarBusqueda();      // version = 1
    expect(session.esVersionActual(v1)).toBe(true);

    // Usuario escribe más: "76910956" → se inicia segunda búsqueda
    const v2 = session.iniciarBusqueda();      // version = 2
    expect(session.esVersionActual(v2)).toBe(true);

    // La respuesta de v1 llega tardía → es obsoleta
    expect(session.esVersionActual(v1)).toBe(false);

    // Solo la respuesta de v2 debe aplicarse
    expect(session.esVersionActual(v2)).toBe(true);
  });

  it('ACS-8b: múltiples búsquedas rápidas → solo la última versión es válida', () => {
    const session = new BusquedaSession();
    const v1 = session.iniciarBusqueda();
    const v2 = session.iniciarBusqueda();
    const v3 = session.iniciarBusqueda();

    expect(session.esVersionActual(v1)).toBe(false);
    expect(session.esVersionActual(v2)).toBe(false);
    expect(session.esVersionActual(v3)).toBe(true);
  });

  // 9. Venta sin cliente → funciona correctamente (clienteId undefined es válido)
  it('ACS-9: venta sin cliente asociado → clienteId undefined es un valor válido para el request', () => {
    // La venta se puede confirmar sin clienteId (campo opcional)
    const clienteId = resolverClienteIdParaVenta(null);
    expect(clienteId).toBeUndefined();
    // undefined !== null: el DTO de venta acepta clienteId?: number
    expect(clienteId == null).toBe(true);
  });

  // 10. Cambio de negocio (tenant isolation)
  it('ACS-10: al cambiar de negocio, la versión se reinicia sin reutilizar datos del tenant anterior', () => {
    // La sesión de búsqueda se recrea con cada montaje del componente.
    // Simulamos el reinicio creando una nueva sesión (como ocurre al cambiar de tenant
    // y re-montar el componente).
    const sessionTenantA = new BusquedaSession();
    sessionTenantA.iniciarBusqueda(); // busca en tenant A
    const vA = sessionTenantA.iniciarBusqueda();

    // Cambio de tenant → nueva sesión (nuevo ref en nuevo render)
    const sessionTenantB = new BusquedaSession();
    const vB = sessionTenantB.iniciarBusqueda();

    // La versión de tenant A no tiene validez en la sesión de tenant B
    expect(sessionTenantB.esVersionActual(vA)).toBe(false);
    expect(sessionTenantB.esVersionActual(vB)).toBe(true);
  });

  // Regresión: input no numérico (nombre) no dispara auto-selección aunque tenga longitud 8+
  it('ACS-REG: query no numérico nunca auto-selecciona aunque tenga 8+ caracteres', () => {
    const query = 'García C';    // 8 caracteres pero no numérico
    const resultados: ClienteDTO[] = [
      { id: 99, nombre: 'García Carlos', tipoDocumento: 'DNI', numeroDocumento: '12345678' },
    ];
    expect(evaluarAutoSeleccion(query, resultados).debeAutoSeleccionar).toBe(false);
  });
});
