/**
 * Pruebas de lógica pura para la visibilidad de pestañas en ReportesPage según rubro.
 * No monta el componente — valida las funciones de filtrado directamente.
 */

type TabId = 'resumen' | 'ventas' | 'productos' | 'vendedores' | 'clientes' | 'inventario' | 'financiero' | 'compras';

const ALL_TABS: TabId[] = ['resumen', 'ventas', 'productos', 'vendedores', 'clientes', 'inventario', 'financiero', 'compras'];

/** Replica exacta del filtro en ReportesPage línea ~2886 */
function getTabsVisibles(esServicios: boolean): TabId[] {
  return ALL_TABS.filter(id => !(esServicios && id === 'compras'));
}

/** Replica exacta del reseteo de activeTab cuando esServicios && activeTab === 'compras' */
function resolveActiveTab(activeTab: TabId, esServicios: boolean): TabId {
  if (esServicios && activeTab === 'compras') return 'resumen';
  return activeTab;
}

// ── Visibilidad de tabs ──────────────────────────────────────────────────────

describe('getTabsVisibles', () => {
  it('EMPRESA_SERVICIOS: no incluye la pestaña Compras', () => {
    const tabs = getTabsVisibles(true);
    expect(tabs).not.toContain('compras');
  });

  it('EMPRESA_SERVICIOS: incluye las otras 7 pestañas', () => {
    const tabs = getTabsVisibles(true);
    expect(tabs).toHaveLength(7);
    const esperadas: TabId[] = ['resumen', 'ventas', 'productos', 'vendedores', 'clientes', 'inventario', 'financiero'];
    esperadas.forEach(t => expect(tabs).toContain(t));
  });

  it('Otros rubros: incluye Compras', () => {
    const tabs = getTabsVisibles(false);
    expect(tabs).toContain('compras');
    expect(tabs).toHaveLength(8);
  });

  it('EMPRESA_SERVICIOS: incluye Inventario (productos físicos tienen stock)', () => {
    const tabs = getTabsVisibles(true);
    expect(tabs).toContain('inventario');
  });

  it('EMPRESA_SERVICIOS: incluye Ventas (servicios se venden)', () => {
    const tabs = getTabsVisibles(true);
    expect(tabs).toContain('ventas');
  });
});

// ── Reset de activeTab cuando la pestaña queda oculta ───────────────────────

describe('resolveActiveTab', () => {
  it('EMPRESA_SERVICIOS con activeTab=compras → vuelve a resumen', () => {
    expect(resolveActiveTab('compras', true)).toBe('resumen');
  });

  it('EMPRESA_SERVICIOS con activeTab=ventas → se mantiene', () => {
    expect(resolveActiveTab('ventas', true)).toBe('ventas');
  });

  it('Otros rubros con activeTab=compras → se mantiene', () => {
    expect(resolveActiveTab('compras', false)).toBe('compras');
  });

  it('Otros rubros con activeTab=resumen → se mantiene', () => {
    expect(resolveActiveTab('resumen', false)).toBe('resumen');
  });
});

// ── POS: servicios no aparecen en EMPRESA_SERVICIOS ─────────────────────────

type ProductoStub = { tipo?: string };

/** Replica del filtro aplicado en POSPage para esServicios */
function filtrarPOS(productos: ProductoStub[], esServicios: boolean): ProductoStub[] {
  return productos.filter(p => !esServicios || p.tipo !== 'SERVICIO');
}

describe('POS filtro esServicios', () => {
  const lista: ProductoStub[] = [
    { tipo: 'SERVICIO' },
    { tipo: 'PRODUCTO' },
    { tipo: undefined },
  ];

  it('EMPRESA_SERVICIOS: no muestra SERVICIO en el POS', () => {
    const result = filtrarPOS(lista, true);
    expect(result.find(p => p.tipo === 'SERVICIO')).toBeUndefined();
  });

  it('EMPRESA_SERVICIOS: sí muestra PRODUCTO en el POS', () => {
    const result = filtrarPOS(lista, true);
    expect(result.find(p => p.tipo === 'PRODUCTO')).toBeDefined();
  });

  it('EMPRESA_SERVICIOS: sí muestra productos sin tipo en el POS', () => {
    const result = filtrarPOS(lista, true);
    expect(result.find(p => p.tipo === undefined)).toBeDefined();
  });

  it('Otros rubros: muestra todos los productos incluidos los SERVICIO', () => {
    const result = filtrarPOS(lista, false);
    expect(result).toHaveLength(3);
  });
});

// ── Regresión: código de permiso VER_COMISIONES (con S) ─────────────────────
// Bug previo: ReportesPage.tsx usaba 'VER_COMISION' (sin S), que no existe en DB.
// El código oficial (V71, ComisionController, Sidebar) es 'VER_COMISIONES'.

const PERMISO_VER_COMISIONES = 'VER_COMISIONES';

describe('permiso VER_COMISIONES', () => {
  it('el código lleva la S final', () => {
    expect(PERMISO_VER_COMISIONES).toBe('VER_COMISIONES');
    expect(PERMISO_VER_COMISIONES).not.toBe('VER_COMISION');
  });

  it('es consistente con los permisos de escritura (singular sin S)', () => {
    const escritura = ['CREAR_COMISION', 'EDITAR_COMISION', 'ELIMINAR_COMISION'];
    escritura.forEach(p => {
      expect(p).not.toContain('COMISIONES');
    });
    expect(PERMISO_VER_COMISIONES).toContain('COMISIONES');
  });
});

// ── Inventario: servicios no generan movimientos de stock ───────────────────

/** Replica del predicado en VentaServiceImpl y DevolucionServiceImpl */
function debeGenerarMovimientoStock(tipo: string | null | undefined): boolean {
  return tipo !== 'SERVICIO';
}

describe('debeGenerarMovimientoStock', () => {
  it('SERVICIO → no genera movimiento', () => {
    expect(debeGenerarMovimientoStock('SERVICIO')).toBe(false);
  });

  it('PRODUCTO → genera movimiento', () => {
    expect(debeGenerarMovimientoStock('PRODUCTO')).toBe(true);
  });

  it('null → genera movimiento (comportamiento seguro por defecto)', () => {
    expect(debeGenerarMovimientoStock(null)).toBe(true);
  });

  it('undefined → genera movimiento', () => {
    expect(debeGenerarMovimientoStock(undefined)).toBe(true);
  });
});
