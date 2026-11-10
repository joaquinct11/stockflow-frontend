/**
 * Pruebas de lógica pura del módulo Equipos de clientes.
 * No monta el componente — valida funciones de filtrado y normalización.
 */

// ── Normalización del número de serie ────────────────────────────────────────
// Replica de normalizeSerial en EquiposPage

function normalizeSerial(s: string | undefined | null): string | null {
  if (!s || s.trim() === '') return null;
  return s.trim();
}

describe('normalizeSerial', () => {
  it('string vacío → null (no genera UNIQUE constraint innecesario)', () => {
    expect(normalizeSerial('')).toBeNull();
  });

  it('solo espacios → null', () => {
    expect(normalizeSerial('   ')).toBeNull();
  });

  it('null → null', () => {
    expect(normalizeSerial(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(normalizeSerial(undefined)).toBeNull();
  });

  it('string con espacios al inicio/fin → trimmed', () => {
    expect(normalizeSerial('  SN-ABC123  ')).toBe('SN-ABC123');
  });

  it('string normal → idéntico (sin modificar)', () => {
    expect(normalizeSerial('SN-ABC123')).toBe('SN-ABC123');
  });
});

// ── Filtro de estado en listado ───────────────────────────────────────────────
// Replica la lógica que el backend aplica según el parámetro `estado`

type EstadoFiltro = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';

interface EquipoStub { activo: boolean }

function filtrarPorEstado(equipos: EquipoStub[], estado: EstadoFiltro): EquipoStub[] {
  if (estado === 'ACTIVOS')   return equipos.filter(e => e.activo);
  if (estado === 'INACTIVOS') return equipos.filter(e => !e.activo);
  return equipos;
}

describe('filtrarPorEstado', () => {
  const lista: EquipoStub[] = [
    { activo: true },
    { activo: true },
    { activo: false },
  ];

  it('ACTIVOS → solo activos', () => {
    expect(filtrarPorEstado(lista, 'ACTIVOS')).toHaveLength(2);
    expect(filtrarPorEstado(lista, 'ACTIVOS').every(e => e.activo)).toBe(true);
  });

  it('INACTIVOS → solo inactivos', () => {
    expect(filtrarPorEstado(lista, 'INACTIVOS')).toHaveLength(1);
    expect(filtrarPorEstado(lista, 'INACTIVOS')[0].activo).toBe(false);
  });

  it('TODOS → devuelve todos sin filtrar', () => {
    expect(filtrarPorEstado(lista, 'TODOS')).toHaveLength(3);
  });
});

// ── Validación de formulario ──────────────────────────────────────────────────
// Replica las condiciones de bloqueo de handleGuardar

interface FormStub {
  nombre: string;
  clienteId: number | '';
}

function formEsValido(form: FormStub, esEdicion: boolean): boolean {
  if (!form.nombre.trim()) return false;
  if (!esEdicion && !form.clienteId) return false;
  return true;
}

describe('formEsValido', () => {
  it('crear: nombre vacío → inválido', () => {
    expect(formEsValido({ nombre: '', clienteId: 1 }, false)).toBe(false);
  });

  it('crear: nombre solo espacios → inválido', () => {
    expect(formEsValido({ nombre: '   ', clienteId: 1 }, false)).toBe(false);
  });

  it('crear: sin cliente → inválido', () => {
    expect(formEsValido({ nombre: 'Impresora', clienteId: '' }, false)).toBe(false);
  });

  it('crear: nombre y cliente → válido', () => {
    expect(formEsValido({ nombre: 'Impresora', clienteId: 42 }, false)).toBe(true);
  });

  it('editar: no requiere clienteId', () => {
    expect(formEsValido({ nombre: 'Impresora', clienteId: '' }, true)).toBe(true);
  });

  it('editar: nombre vacío sigue siendo inválido', () => {
    expect(formEsValido({ nombre: '', clienteId: '' }, true)).toBe(false);
  });
});

// ── Permisos de Equipos son exclusivos de EMPRESA_SERVICIOS ──────────────────
// Confirmación de que el conjunto de códigos es correcto

const EQUIPOS_PERMS = ['VER_EQUIPOS', 'CREAR_EQUIPO', 'EDITAR_EQUIPO', 'CAMBIAR_ESTADO_EQUIPO'];

describe('códigos de permisos de Equipos', () => {
  it('son 4 permisos en total', () => {
    expect(EQUIPOS_PERMS).toHaveLength(4);
  });

  it('VER usa plural (VER_EQUIPOS), CRUD usa singular', () => {
    expect(EQUIPOS_PERMS[0]).toBe('VER_EQUIPOS');
    expect(EQUIPOS_PERMS.slice(1).every(p => !p.includes('EQUIPOS'))).toBe(true);
  });

  it('no incluye permisos de eliminación (equipos no se eliminan físicamente)', () => {
    expect(EQUIPOS_PERMS.some(p => p.startsWith('ELIMINAR'))).toBe(false);
  });
});

// ── Paginación: cálculo del rango de páginas visible ─────────────────────────
// Replica la función pageRange en EquiposPage (delta = 2)

function calcPageRange(page: number, totalPages: number): number[] {
  const delta = 2;
  const start = Math.max(0, page - delta);
  const end   = Math.min(totalPages - 1, page + delta);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

describe('calcPageRange', () => {
  it('página 0 con 10 páginas → [0,1,2]', () => {
    expect(calcPageRange(0, 10)).toEqual([0, 1, 2]);
  });

  it('página 5 con 10 páginas → [3,4,5,6,7]', () => {
    expect(calcPageRange(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });

  it('página 9 (última) con 10 páginas → [7,8,9]', () => {
    expect(calcPageRange(9, 10)).toEqual([7, 8, 9]);
  });

  it('1 sola página → [0]', () => {
    expect(calcPageRange(0, 1)).toEqual([0]);
  });
});
