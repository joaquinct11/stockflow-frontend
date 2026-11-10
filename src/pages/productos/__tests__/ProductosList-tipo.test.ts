/**
 * Pruebas de lógica pura para el manejo de tipos en ProductosList.
 * No montan el componente React — validan las funciones de cálculo directamente.
 */

// ── Helpers extraídos del componente ────────────────────────────────────────

/** Determina el tipo inicial del formulario dado tipoParam y si es empresa de servicios */
function getTipoInicial(tipoParam: string | null, esServicios: boolean): string {
  return tipoParam === 'PRODUCTO' ? 'PRODUCTO' : (esServicios ? 'SERVICIO' : 'PRODUCTO');
}

type ProductoStub = { tipo?: string; activo?: boolean };

/** Filtra productos según tipoParam (lógica de filteredProductos) */
function filterByTipo(productos: ProductoStub[], tipoParam: string | null): ProductoStub[] {
  return productos.filter(p => {
    if (tipoParam === 'SERVICIO') return p.tipo === 'SERVICIO';
    if (tipoParam === 'PRODUCTO') return p.tipo === 'PRODUCTO' || !p.tipo;
    return true;
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getTipoInicial', () => {
  it('es SERVICIO cuando tipoParam=SERVICIO (en el componente real, tipoParam=SERVICIO implica esServicios=true)', () => {
    // ProductosList.tsx línea 86: esServicios = tipoParam === 'SERVICIO' || (rubro === EMPRESA_SERVICIOS && ...)
    // Cuando tipoParam='SERVICIO', esServicios siempre es true → la combinación (SERVICIO, false) no ocurre.
    expect(getTipoInicial('SERVICIO', true)).toBe('SERVICIO');
  });

  it('es PRODUCTO cuando tipoParam=PRODUCTO, aunque esServicios=true', () => {
    expect(getTipoInicial('PRODUCTO', true)).toBe('PRODUCTO');
  });

  it('es SERVICIO cuando tipoParam=null y esServicios=true (EMPRESA_SERVICIOS sin ?tipo=)', () => {
    expect(getTipoInicial(null, true)).toBe('SERVICIO');
  });

  it('es PRODUCTO cuando tipoParam=null y esServicios=false', () => {
    expect(getTipoInicial(null, false)).toBe('PRODUCTO');
  });
});

describe('filterByTipo', () => {
  const productos: ProductoStub[] = [
    { tipo: 'SERVICIO' },
    { tipo: 'PRODUCTO' },
    { tipo: undefined },
  ];

  it('con tipoParam=SERVICIO solo devuelve tipo=SERVICIO', () => {
    const result = filterByTipo(productos, 'SERVICIO');
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('SERVICIO');
  });

  it('con tipoParam=PRODUCTO devuelve tipo=PRODUCTO y los que no tienen tipo', () => {
    const result = filterByTipo(productos, 'PRODUCTO');
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.tipo === 'PRODUCTO' || p.tipo === undefined).toBe(true));
  });

  it('con tipoParam=null devuelve todos', () => {
    expect(filterByTipo(productos, null)).toHaveLength(3);
  });

  it('un SERVICIO no aparece en tipoParam=PRODUCTO', () => {
    const result = filterByTipo(productos, 'PRODUCTO');
    expect(result.find(p => p.tipo === 'SERVICIO')).toBeUndefined();
  });

  it('un PRODUCTO no aparece en tipoParam=SERVICIO', () => {
    const result = filterByTipo(productos, 'SERVICIO');
    expect(result.find(p => p.tipo === 'PRODUCTO')).toBeUndefined();
  });
});
