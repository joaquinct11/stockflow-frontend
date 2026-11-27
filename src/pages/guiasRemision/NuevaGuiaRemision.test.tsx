import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { NuevaGuiaRemision } from './NuevaGuiaRemision';

// ---- Mocks de módulos ----

vi.mock('../../services/sucursal.service', () => ({
  sucursalService: { listar: vi.fn() },
}));

vi.mock('../../services/venta.service', () => ({
  ventaService: {
    buscar: vi.fn(),
    getDetalleParaGRE: vi.fn(),
  },
}));

vi.mock('../../services/guiaRemision.service', () => ({
  guiaRemisionService: { crear: vi.fn(), actualizar: vi.fn() },
}));

vi.mock('../../services/producto.service', () => ({
  productoService: { searchGre: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../services/productoPresentacion.service', () => ({
  productoPresentacionService: { listar: vi.fn().mockResolvedValue([]) },
}));

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.error = vi.fn();
  toastFn.success = vi.fn();
  return { default: toastFn };
});

vi.mock('../../store/tenantConfigStore', () => ({
  useTenantConfigStore: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({ planId: 'PRO', isBasico: false, isPro: true, limites: { sucursales: 5, usuarios: 15, productos: 5000 }, loading: false, error: false, segmento: null })),
}));

vi.mock('../../components/gre/UbigeoSelector', () => ({
  UbigeoSelector: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label>{label}</label>
      <input data-testid="ubigeo-input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  ),
}));

// ---- Imports de los mocks ----
import { sucursalService } from '../../services/sucursal.service';
import { ventaService } from '../../services/venta.service';
import { guiaRemisionService } from '../../services/guiaRemision.service';
import { productoService } from '../../services/producto.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import toast from 'react-hot-toast';
import type { VentaResumenDTO } from '../../services/venta.service';
import type { VentaDetalleGREDTO } from '../../services/venta.service';

// ---- Helpers ----

const sucursalEjemplo = { id: 10, nombre: 'Tienda Lima', activo: true, ubigeo: '150101', direccion: 'Av. Lima 123', direccionCompleta: 'Av. Lima 123' };

function greEjemplo(overrides?: Partial<{ fechaTraslado: string }>) {
  return {
    id: 1,
    tenantId: 'test',
    serie: 'T001',
    correlativo: 1,
    numeroCompleto: 'T001-00000001',
    tipoTraslado: 'DELIVERY' as const,
    motivoTrasladoCodigo: '01',
    modalidadTransporte: 'PRIVADO' as const,
    fechaTraslado: overrides?.fechaTraslado ?? '2026-11-25',
    estadoTributario: 'BORRADOR' as const,
    estadoLogistico: 'PENDIENTE' as const,
    createdAt: '2026-11-25T10:00:00Z',
    updatedAt: '2026-11-25T10:00:00Z',
    items: [],
  };
}

function configConDespacho() {
  return { ubigeoDespacho: '150101', direccionDespacho: 'Almacén Central 456', rubro: 'OTRO' };
}
function configSinDespacho() {
  return { ubigeoDespacho: null, direccionDespacho: null, rubro: 'OTRO' };
}

function renderModal(props?: Partial<React.ComponentProps<typeof NuevaGuiaRemision>>) {
  return render(
    <NuevaGuiaRemision onClose={vi.fn()} onCreate={vi.fn()} {...props} />
  );
}

/** Avanza al paso 1 (Destinatario) */
async function irAlPaso1() {
  await userEvent.click(screen.getByText('Siguiente'));
}

/** Tipea en el input de búsqueda de ventas (paso 0) y espera resultados */
async function buscarVenta(query: string) {
  const input = screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i);
  await userEvent.click(input);
  await userEvent.type(input, query);
}

const ventaEjemplo: VentaResumenDTO = {
  id: 42,
  createdAt: '2026-11-24T10:00:00Z',
  clienteNombre: 'María García',
  clienteDocumento: '12345678',
  total: 150.00,
  estado: 'COMPLETADA',
};

const detalleEjemplo: VentaDetalleGREDTO = {
  ventaId: 42,
  estado: 'COMPLETADA',
  clienteNombre: 'María García',
  clienteTipoDoc: '1',
  clienteNumDoc: '12345678',
  clienteDireccion: 'Av. Lima 100',
  items: [
    { productoId: 1, productoNombre: 'Paracetamol 500mg', cantidad: 5, factor: 1, presentacionId: null, unidadMedida: 'NIU' },
    { productoId: 2, productoNombre: 'Ibuprofeno 400mg', cantidad: 10, factor: 20, presentacionId: 3, unidadMedida: 'BX' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([]);
  (ventaService.buscar as Mock).mockResolvedValue([]);
  (ventaService.getDetalleParaGRE as Mock).mockResolvedValue(detalleEjemplo);
});

// ============================================================
// F-15 Regla 1: selector aparece solo en DELIVERY + motivo 01
// ============================================================

describe('F-15 Regla 1 — Visibilidad del selector de ventas', () => {
  it('T-F15-FE-01: DELIVERY + motivo 01 muestra el selector de ventas en paso Traslado', () => {
    renderModal();
    // Por defecto el form tiene DELIVERY + motivo 01
    expect(screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).toBeInTheDocument();
  });

  it('T-F15-FE-02: DELIVERY siempre muestra el selector de ventas (motivo 01 auto-asignado)', () => {
    // F-18: el motivo es auto-asignado; DELIVERY siempre expone el buscador de ventas
    renderModal();
    expect(screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).toBeInTheDocument();
  });

  it('T-F15-FE-03: ENTRE SUCURSALES no muestra el selector de ventas', async () => {
    renderModal();
    // Tarjeta nueva: botón "Trasladar entre sucursales"
    const btnSucursales = screen.getByText(/Trasladar entre sucursales/i);
    await userEvent.click(btnSucursales);
    expect(screen.queryByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-15 Regla 2: búsqueda reactiva (debounce, backend)
// ============================================================

describe('F-15 Regla 2 — Búsqueda reactiva de ventas', () => {
  it('T-F15-FE-04: buscar por número de venta llama a ventaService.buscar con el query', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => {
      expect(ventaService.buscar).toHaveBeenCalledWith('42');
    });
  });

  it('T-F15-FE-05: buscar por nombre de cliente muestra resultados correctos', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('María');
    await waitFor(() => {
      expect(screen.getByText(/María García/i)).toBeInTheDocument();
    });
  });

  it('T-F15-FE-06: buscar por DNI/RUC muestra el documento del cliente', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('12345678');
    await waitFor(() => {
      expect(ventaService.buscar).toHaveBeenCalledWith('12345678');
      expect(screen.getByText(/12345678/i)).toBeInTheDocument();
    });
  });

  it('T-F15-FE-07: sin query muestra mensaje "Escribe para buscar ventas"', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i);
    await userEvent.click(input);
    expect(screen.getByText(/Escribe para buscar ventas/i)).toBeInTheDocument();
    expect(ventaService.buscar).not.toHaveBeenCalled();
  });
});

// ============================================================
// F-15 Regla 3: selección y precarga
// ============================================================

describe('F-15 Regla 3 — Selección y precarga automática', () => {
  it('T-F15-FE-08: al seleccionar venta, precarga destinatario en paso 1', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(ventaService.getDetalleParaGRE).toHaveBeenCalledWith(42));
    // Avanzar al paso destinatario
    await irAlPaso1();
    const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
    expect(inputDest.value).toBe('María García');
  });

  it('T-F15-FE-09: precarga todos los productos con cantidades correctas', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(ventaService.getDetalleParaGRE).toHaveBeenCalledWith(42));
    // Verificar que el segundo setForm (destinatario + items) se aplicó
    await irAlPaso1();
    await waitFor(() => {
      const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
      expect(inputDest.value).toBe('María García');
    });
    await userEvent.click(screen.getByText('Siguiente'));
    // Verificar que paso 2 (Items) se renderizó con los items precargados
    await waitFor(() => {
      const productInputs = screen.getAllByPlaceholderText(/Buscar producto/i);
      expect(productInputs).toHaveLength(2);
      expect((productInputs[0] as HTMLInputElement).value).toBe('Paracetamol 500mg');
      expect((productInputs[1] as HTMLInputElement).value).toBe('Ibuprofeno 400mg');
    });
  });

  it('T-F15-FE-10: conserva el factor de conversión cuando es mayor que 1', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    (ventaService.getDetalleParaGRE as Mock).mockResolvedValue({
      ...detalleEjemplo,
      items: [{ productoId: 1, productoNombre: 'Caja Producto', cantidad: 2, factor: 20, presentacionId: 3, unidadMedida: 'BX' }],
    });
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(ventaService.getDetalleParaGRE).toHaveBeenCalled());
    // El form debe haber recibido factorConversion: 20
    // Avanzar al paso items para verificar
    await irAlPaso1();
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument());
  });

  it('T-F15-FE-11: cambiar de venta reemplaza datos anteriores completamente', async () => {
    const venta2: VentaResumenDTO = { id: 99, createdAt: '2026-11-24T12:00:00Z', clienteNombre: 'Carlos López', clienteDocumento: '87654321', total: 200, estado: 'COMPLETADA' };
    const detalle2: VentaDetalleGREDTO = {
      ventaId: 99,
      estado: 'COMPLETADA',
      clienteNombre: 'Carlos López',
      clienteTipoDoc: '1',
      clienteNumDoc: '87654321',
      clienteDireccion: 'Av. Peru 200',
      items: [{ productoId: 5, productoNombre: 'Producto Carlos', cantidad: 3, factor: 1, presentacionId: null, unidadMedida: 'NIU' }],
    };
    (ventaService.buscar as Mock)
      .mockResolvedValueOnce([ventaEjemplo])
      .mockResolvedValueOnce([venta2]);
    (ventaService.getDetalleParaGRE as Mock)
      .mockResolvedValueOnce(detalleEjemplo)
      .mockResolvedValueOnce(detalle2);

    renderModal();
    // Seleccionar primera venta
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    // Cambiar venta
    await userEvent.click(screen.getByRole('button', { name: /Cambiar/i }));
    await buscarVenta('99');
    await waitFor(() => screen.getByText(/Carlos López/i));
    fireEvent.mouseDown(screen.getByText(/Carlos López/i));
    await waitFor(() => expect(screen.getByText(/Venta #99/i)).toBeInTheDocument());

    // Verificar destinatario en paso 1
    await irAlPaso1();
    const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
    expect(inputDest.value).toBe('Carlos López');
    expect(screen.queryByText(/María García/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-15 Regla 4: limpieza al cambiar motivo o tipo
// ============================================================

describe('F-15 Regla 4 — Limpieza al cambiar tipo de traslado', () => {
  it('T-F15-FE-12: cambiar a SUCURSALES (tarjeta) limpia la venta y oculta el selector', async () => {
    // F-18: el motivo ya no tiene selector manual; cambiar a SUCURSALES (tarjeta) limpia la venta
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    // Cambiar a SUCURSALES — tarjeta F-18
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));

    expect(screen.queryByText(/Venta #42/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Buscar por n° de venta/i)).not.toBeInTheDocument();
  });

  it('T-F15-FE-13: cambiar a ENTRE SUCURSALES limpia la venta seleccionada', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    // Cambiar a SUCURSALES — tarjeta nueva
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));

    expect(screen.queryByText(/Venta #42/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-15 Regla 5: persistencia — ventaId enviado al crear borrador
// ============================================================

describe('F-15 Regla 5 — Persistencia del ventaId', () => {
  it('T-F15-FE-14: borrador envía ventaId correcto al backend', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    (guiaRemisionService.crear as Mock).mockResolvedValue({ id: 1 });
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    renderModal();

    // Paso 0: seleccionar venta
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    // Paso 0 → Paso 1
    await irAlPaso1();
    // Paso 1 → Paso 2 (rellenar destinatario precargado)
    await waitFor(() => screen.getByPlaceholderText(/Nombre del destinatario/i));
    await userEvent.click(screen.getByText('Siguiente'));
    // Paso 2 → Paso 3 (items ya precargados)
    await waitFor(() => screen.getAllByText(/Item 1/i));
    await userEvent.click(screen.getByText('Siguiente'));
    // Paso 3: rellenar transporte y crear
    await waitFor(() => screen.getByPlaceholderText(/Almacén.*origen/i));
    await userEvent.type(screen.getByPlaceholderText(/Almacén.*origen/i), 'Almacén Central');
    await userEvent.type(screen.getByPlaceholderText(/Dirección de destino/i), 'Av. Cliente 100');
    await userEvent.type(screen.getByPlaceholderText(/ABC-123/i), 'ABC-123');
    await userEvent.click(screen.getByText('Crear Borrador'));

    await waitFor(() => {
      expect(guiaRemisionService.crear).toHaveBeenCalledWith(
        expect.objectContaining({ ventaId: 42 })
      );
    });
  });
});

// ============================================================
// F-10: tests existentes actualizados (selector ahora en paso 0)
// ============================================================

describe('F-10 Caso A — Tenant con sucursales, DELIVERY sin venta', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursalEjemplo]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
  });

  it('T-F10-FE-01: muestra selector de sucursal en paso 1 cuando no hay venta', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => {
      expect(screen.getByText(/Sucursal de origen \(obligatorio\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Tienda Lima/i)).toBeInTheDocument();
    });
  });

  it('T-F10-FE-02: valida que se seleccione sucursal de origen en Caso A-fallido', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => screen.getByText(/Sucursal de origen \(obligatorio\)/i));
    await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Juan');
    // Usar tipoDoc '-' para que la validación de doc no interfiera con la de sucursal (F-17)
    const selects = screen.getAllByRole('combobox');
    const selectTipoDoc = selects.find(s => {
      const opts = Array.from((s as HTMLSelectElement).options).map(o => o.value);
      return opts.includes('1') && opts.includes('6') && opts.includes('-');
    }) as HTMLSelectElement;
    if (selectTipoDoc) fireEvent.change(selectTipoDoc, { target: { value: '-' } });
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/sucursal de origen/i)
      );
    });
  });
});

describe('F-10 Caso B — Tenant sin sucursales, con punto de despacho', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
  });

  it('T-F10-FE-03: muestra panel informativo azul con dirección del tenant', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => {
      expect(screen.getByText(/Punto de despacho configurado/i)).toBeInTheDocument();
      expect(screen.getByText(/Almacén Central 456/i)).toBeInTheDocument();
    });
  });

  it('T-F10-FE-04: NO muestra selector de sucursal en Caso B', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => screen.getByText(/Punto de despacho configurado/i));
    expect(screen.queryByText(/Sucursal de origen \(obligatorio\)/i)).not.toBeInTheDocument();
  });

  it('T-F10-FE-05: validación pasa en Caso B sin sucursalOrigenId', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => screen.getByText(/Punto de despacho configurado/i));
    await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Cliente Test');
    // Usar tipoDoc '-' para que no haya error de documento (F-17)
    const selects = screen.getAllByRole('combobox');
    const selectTipoDoc = selects.find(s => {
      const opts = Array.from((s as HTMLSelectElement).options).map(o => o.value);
      return opts.includes('1') && opts.includes('6') && opts.includes('-');
    }) as HTMLSelectElement;
    if (selectTipoDoc) fireEvent.change(selectTipoDoc, { target: { value: '-' } });
    await userEvent.click(screen.getByText('Siguiente'));
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/sucursal de origen/i));
  });
});

describe('F-10 Caso C — Tenant sin sucursales, sin punto de despacho', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
  });

  it('T-F10-FE-06: muestra bloqueo rojo cuando no hay sucursales ni punto de despacho', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => {
      expect(screen.getByText(/Punto de despacho no configurado/i)).toBeInTheDocument();
    });
  });

  it('T-F10-FE-07: validación falla con mensaje de Configuración en Caso C', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => screen.getByText(/Punto de despacho no configurado/i));
    await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Cliente Test');
    // Usar tipoDoc '-' para que el error de despacho (Caso C) llegue primero (F-17)
    const selects = screen.getAllByRole('combobox');
    const selectTipoDoc = selects.find(s => {
      const opts = Array.from((s as HTMLSelectElement).options).map(o => o.value);
      return opts.includes('1') && opts.includes('6') && opts.includes('-');
    }) as HTMLSelectElement;
    if (selectTipoDoc) fireEvent.change(selectTipoDoc, { target: { value: '-' } });
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Configuración → Negocio/i)
      );
    });
  });
});

describe('F-10 Caso D — DELIVERY + motivo 01 con venta asociada', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
  });

  it('T-F10-FE-08: Caso D pasa validación con venta aunque no haya sucursales ni despacho', async () => {
    renderModal();

    // Buscar y seleccionar venta en paso 0
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i);
    await userEvent.click(inputVenta);
    await userEvent.type(inputVenta, 'María');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    await irAlPaso1();
    // Con venta seleccionada y destinatario precargado, la validación debe pasar
    await waitFor(() => screen.getByPlaceholderText(/Nombre del destinatario/i));
    await userEvent.click(screen.getByText('Siguiente'));
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/sucursal|despacho/i)
    );
  });
});

describe('F-10 Selector de ventas (actualizado — búsqueda reactiva en paso 0)', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
  });

  it('T-F10-FE-09: NO llama buscar si el input está vacío', async () => {
    renderModal();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i);
    await userEvent.click(inputVenta);
    expect(ventaService.buscar).not.toHaveBeenCalled();
  });

  it('T-F10-FE-10: llama buscar con el id de venta escrito', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([]);
    renderModal();
    await buscarVenta('10');
    await waitFor(() => expect(ventaService.buscar).toHaveBeenCalledWith('10'));
  });

  it('T-F10-FE-11: llama buscar con nombre parcial de cliente', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([]);
    renderModal();
    await buscarVenta('carmen');
    await waitFor(() => expect(ventaService.buscar).toHaveBeenCalledWith('carmen'));
  });

  it('T-F10-FE-12: al seleccionar venta, precarga destinatario en paso 1', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(ventaService.getDetalleParaGRE).toHaveBeenCalledWith(42));
    await irAlPaso1();
    const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
    expect(inputDest.value).toBe('María García');
  });

  it('T-F10-FE-13: al quitar la venta con "Cambiar", reaparece el input de búsqueda', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => screen.getByText(/Venta #42/i));

    await userEvent.click(screen.getByRole('button', { name: /Cambiar/i }));

    expect(screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-15 error handling
// ============================================================

describe('F-15 Manejo de errores', () => {
  it('T-F15-FE-15: si getDetalleParaGRE falla, precarga solo el nombre del cliente de la búsqueda', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    (ventaService.getDetalleParaGRE as Mock).mockRejectedValue(new Error('Network error'));
    renderModal();
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // Avanzar al destinatario — el nombre debería estar precargado desde el resumen
    await irAlPaso1();
    const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
    expect(inputDest.value).toBe('María García');
  });
});

// ============================================================
// F-16: Validación de stock en paso Items (GRE independiente)
// ============================================================

/** Avanza desde paso 0 → paso 1 → paso 2 (Items) para GRE independiente con configConDespacho.
 *  Usa tipoDoc='-' para no necesitar llenar el N° de documento (F-17). */
async function irAlPaso2() {
  await irAlPaso1(); // paso 0 → paso 1
  await waitFor(() => screen.getByPlaceholderText(/Nombre del destinatario/i));
  await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Cliente Test');
  // Seleccionar 'Sin documento' para evitar validación de numDoc (F-17)
  const selects = screen.getAllByRole('combobox');
  const selectTipoDoc = selects.find(s => {
    const opts = Array.from((s as HTMLSelectElement).options).map(o => o.value);
    return opts.includes('1') && opts.includes('6') && opts.includes('-');
  }) as HTMLSelectElement;
  if (selectTipoDoc) fireEvent.change(selectTipoDoc, { target: { value: '-' } });
  await userEvent.click(screen.getByText('Siguiente')); // paso 1 → paso 2
  await waitFor(() => screen.getByPlaceholderText(/Buscar producto/i));
}

/** Selecciona un producto en el primer item del paso 2.
 * Usa fireEvent.change en lugar de userEvent.type para disparar
 * una sola llamada a searchGre y no consumir varios mockResolvedValueOnce. */
async function seleccionarProductoGRE(nombre: string) {
  const input = screen.getAllByPlaceholderText(/Buscar producto/i)[0];
  await userEvent.click(input); // sets activeItemIdx=0
  fireEvent.change(input, { target: { value: nombre.substring(0, 3) } });
  await waitFor(() => screen.getByText(new RegExp(nombre, 'i')));
  await userEvent.click(screen.getByText(new RegExp(nombre, 'i')));
}

describe('F-16 Validación de stock en items', () => {
  beforeEach(() => {
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    (sucursalService.listar as Mock).mockResolvedValue([]);
  });

  it('T-F16-FE-01: Caso A — stock cero deshabilita el botón Siguiente', async () => {
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 101, nombre: 'Paracetamol', stockActual: 0, activo: true },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Paracetamol');

    await waitFor(() => {
      const btn = screen.getByText('Siguiente').closest('button')!;
      expect(btn).toBeDisabled();
    });
  });

  it('T-F16-FE-02: Caso B — cantidad superior al stock se auto-ajusta y avanza a Transporte', async () => {
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 102, nombre: 'Ibuprofeno', stockActual: 5, activo: true },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Ibuprofeno');

    const cantInput = screen.getByRole('spinbutton');
    await userEvent.clear(cantInput);
    await userEvent.type(cantInput, '8');

    await userEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.stringMatching(/ajustada/i));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Almacén.*origen/i)).toBeInTheDocument();
    });
  });

  it('T-F16-FE-03: Caso C — cantidad igual al stock exactamente permite avanzar', async () => {
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 103, nombre: 'Amoxicilina', stockActual: 3, activo: true },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Amoxicilina');

    const cantInput = screen.getByRole('spinbutton');
    await userEvent.clear(cantInput);
    await userEvent.type(cantInput, '3');

    await userEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Almacén.*origen/i)).toBeInTheDocument();
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('T-F16-FE-04: Caso D — cantidad inferior al stock permite avanzar sin ajuste', async () => {
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 104, nombre: 'Metformina', stockActual: 10, activo: true },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Metformina');

    const cantInput = screen.getByRole('spinbutton');
    await userEvent.clear(cantInput);
    await userEvent.type(cantInput, '4');

    await userEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Almacén.*origen/i)).toBeInTheDocument();
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('T-F16-FE-05: cambiar producto de stock=0 a stock>0 rehabilita el botón Siguiente', async () => {
    (productoService.searchGre as Mock)
      .mockResolvedValueOnce([{ id: 105, nombre: 'SinStockA', stockActual: 0, activo: true }])
      .mockResolvedValueOnce([{ id: 106, nombre: 'ConStockB', stockActual: 7, activo: true }]);

    renderModal();
    await irAlPaso2();

    // Seleccionar producto sin stock → botón deshabilitado
    await seleccionarProductoGRE('SinStockA');
    await waitFor(() => {
      expect(screen.getByText('Siguiente').closest('button')!).toBeDisabled();
    });

    // Cambiar al producto con stock usando fireEvent.change para disparar 1 sola búsqueda
    const input = screen.getAllByPlaceholderText(/Buscar producto/i)[0];
    await userEvent.click(input);
    fireEvent.change(input, { target: { value: 'Con' } });
    await waitFor(() => screen.getByText(/ConStockB/i));
    await userEvent.click(screen.getByText(/ConStockB/i));

    await waitFor(() => {
      expect(screen.getByText('Siguiente').closest('button')!).not.toBeDisabled();
    });
  });

  it('T-F16-FE-06: auto-ajuste no muestra toast neutral cuando ya es exactamente el máximo', async () => {
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 107, nombre: 'Vitamina C', stockActual: 6, activo: true },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Vitamina C');

    const cantInput = screen.getByRole('spinbutton');
    await userEvent.clear(cantInput);
    await userEvent.type(cantInput, '6');

    await userEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => screen.getByPlaceholderText(/Almacén.*origen/i));
    // cantidad == stock → no hay ajuste, toast neutro no llamado
    expect(toast).not.toHaveBeenCalledWith(expect.stringMatching(/ajustada/i));
  });

  it('T-F16-FE-07: factor de conversión — auto-ajusta en unidad comercial según presentación (FARMACIA)', async () => {
    (useTenantConfigStore as Mock).mockReturnValue({ config: { ...configConDespacho(), rubro: 'FARMACIA' } });
    (productoService.searchGre as Mock).mockResolvedValue([
      { id: 108, nombre: 'Aspirina', stockActual: 20, activo: true },
    ]);
    // DTO de presentación: usa 'factor' (no factorConversion) y 'unidadMedidaNombre'/'unidadMedidaAbreviatura'
    (productoPresentacionService.listar as Mock).mockResolvedValue([
      { id: 5, factor: 10, unidadMedidaNombre: null, unidadMedidaAbreviatura: 'BX' },
    ]);
    renderModal();
    await irAlPaso2();
    await seleccionarProductoGRE('Aspirina');

    // Esperar que aparezca la opción de presentación y seleccionar por fireEvent.change
    // La opción renderiza como "{abreviatura} ×{factor}" → "BX ×10"
    await waitFor(() => expect(screen.getByText('BX ×10')).toBeInTheDocument());
    const presSelect = screen.getByText('BX ×10').closest('select')!;
    fireEvent.change(presSelect, { target: { value: '5' } });

    // maxCant = floor(20 / 10) = 2 blísteres; pedir 3 → auto-ajusta a 2
    const cantInput = screen.getByRole('spinbutton');
    await userEvent.clear(cantInput);
    await userEvent.type(cantInput, '3');

    await userEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.stringMatching(/ajustada/i));
    });
    await waitFor(() => screen.getByPlaceholderText(/Almacén.*origen/i));
  });

  it('T-F16-FE-08: GRE vinculada a venta omite validación de stock — avanza directamente', async () => {
    (ventaService.buscar as Mock).mockResolvedValue([ventaEjemplo]);
    (ventaService.getDetalleParaGRE as Mock).mockResolvedValue(detalleEjemplo);
    renderModal();

    // Seleccionar venta en paso 0
    await buscarVenta('42');
    await waitFor(() => screen.getByText(/María García/i));
    fireEvent.mouseDown(screen.getByText(/María García/i));
    await waitFor(() => expect(screen.getByText(/Venta #42/i)).toBeInTheDocument());

    // paso 0 → paso 1
    await irAlPaso1();
    // paso 1 → paso 2 (destinatario precargado)
    await waitFor(() => screen.getByPlaceholderText(/Nombre del destinatario/i));
    await userEvent.click(screen.getByText('Siguiente'));
    // paso 2: items precargados desde la venta, ventaId = 42 → no aplica F-16
    await waitFor(() => screen.getAllByPlaceholderText(/Buscar producto/i));

    // Avanzar sin interactuar con stock
    await userEvent.click(screen.getByText('Siguiente'));

    // Debe avanzar a paso 3 sin errores de stock
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Almacén.*origen/i)).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/stock/i));
  });
});

// ============================================================
// F-17: Validación de tipo y número de documento del destinatario
// ============================================================

/** Avanza al paso 1 con config de despacho (sin sucursales) */
async function irAlPaso1F17() {
  (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([]);
  renderModal();
  await irAlPaso1();
  await waitFor(() => screen.getByPlaceholderText(/Nombre del destinatario/i));
  await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Cliente Test');
}

/** Selecciona un tipo de documento en el select del destinatario */
async function seleccionarTipoDoc(valor: string) {
  const selects = screen.getAllByRole('combobox');
  const selectTipoDoc = selects.find(s => {
    const opts = Array.from((s as HTMLSelectElement).options).map(o => o.value);
    return opts.includes('1') && opts.includes('6') && opts.includes('-');
  }) as HTMLSelectElement;
  fireEvent.change(selectTipoDoc, { target: { value: valor } });
}

describe('F-17 Validación de documento del destinatario — DNI', () => {
  it('T-F17-FE-01: DNI vacío bloquea avanzar con mensaje de error', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    // numDoc vacío
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/número de documento/i)
      );
    });
  });

  it('T-F17-FE-02: DNI con 7 dígitos muestra error de longitud', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '1234567');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/8 dígitos/i)
      );
    });
  });

  it('T-F17-FE-03: DNI con 9 dígitos — el 9no queda bloqueado, el input conserva 8', async () => {
    // Con F-17.1 el input trunca a 8 dígitos, el 9no nunca llega al estado
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    fireEvent.change(numDocInput, { target: { value: '123456789' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678');
    });
  });

  it('T-F17-FE-04: DNI con 8 dígitos válidos permite avanzar', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '12345678');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });
});

describe('F-17 Validación de documento del destinatario — RUC', () => {
  it('T-F17-FE-05: RUC con 10 dígitos muestra error de longitud', async () => {
    await irAlPaso1F17();
    // tipoDoc por defecto es '6' (RUC)
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '2046753402');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/11 dígitos/i)
      );
    });
  });

  it('T-F17-FE-06: RUC con 11 dígitos y DV incorrecto ahora se acepta (F-18.1)', async () => {
    // F-18.1: eliminada la verificación de dígito verificador; cualquier RUC de 11 dígitos es válido.
    await irAlPaso1F17();
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '20467534025');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });

  it('T-F17-FE-07: RUC válido (20467534026) permite avanzar', async () => {
    await irAlPaso1F17();
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '20467534026');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });
});

describe('F-17 Validación de documento del destinatario — otros tipos', () => {
  it('T-F17-FE-08: Carnet ext. vacío bloquea avanzar', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('4');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/número de documento/i)
      );
    });
  });

  it('T-F17-FE-09: Carnet ext. con valor alfanumérico permite avanzar', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('4');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, 'C01234567');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });

  it('T-F17-FE-10: Sin documento (tipoDoc "-") con numDoc vacío permite avanzar', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('-');
    // numDoc vacío — no debe validar
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });

  it('T-F17-FE-11: Pasaporte con valor permite avanzar', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('7');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, 'AB123456');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });

  it('T-F17-FE-12: Error en tiempo real aparece al escribir DNI inválido (antes de Siguiente)', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const numDocInput = screen.getByPlaceholderText('20100000000');
    await userEvent.type(numDocInput, '1234567');
    // El error debe mostrarse inline sin necesidad de hacer click en Siguiente
    await waitFor(() => {
      expect(screen.getByText(/8 dígitos/i)).toBeInTheDocument();
    });
  });
});

// ============================================================
// F-17.1: Límites físicos en el input de N° documento
// ============================================================

describe('F-17.1 Límites del input — DNI', () => {
  it('T-F17.1-FE-01: DNI acepta exactamente 8 dígitos', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '12345678' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678');
    });
  });

  it('T-F17.1-FE-02: DNI bloquea el noveno dígito — el input queda con 8', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '123456789' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678');
    });
  });

  it('T-F17.1-FE-03: DNI rechaza letras — solo queda la parte numérica', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '123abc' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('123');
    });
  });

  it('T-F17.1-FE-04: DNI al pegar conserva máximo 8 dígitos', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.paste(input, {
      clipboardData: { getData: vi.fn().mockReturnValue('12345678901234') },
    });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678');
    });
  });
});

describe('F-17.1 Límites del input — RUC', () => {
  it('T-F17.1-FE-05: RUC acepta exactamente 11 dígitos', async () => {
    await irAlPaso1F17();
    // tipoDoc por defecto es '6' (RUC)
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '20467534026' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20467534026');
    });
  });

  it('T-F17.1-FE-06: RUC bloquea el dígito número 12 — el input queda con 11', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '204675340261' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20467534026');
    });
  });

  it('T-F17.1-FE-07: RUC rechaza letras — solo quedan los dígitos', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '20abc534026' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20534026');
    });
  });

  it('T-F17.1-FE-08: RUC al pegar conserva máximo 11 dígitos', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.paste(input, {
      clipboardData: { getData: vi.fn().mockReturnValue('204675340261234') },
    });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20467534026');
    });
  });
});

describe('F-17.1 Cambio de tipo de documento', () => {
  it('T-F17.1-FE-09: cambiar de RUC a DNI trunca a 8 dígitos', async () => {
    await irAlPaso1F17();
    // Escribir 11 dígitos como RUC
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '20467534026' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20467534026');
    });
    // Cambiar a DNI → debe truncar a 8
    await seleccionarTipoDoc('1');
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('20467534');
    });
  });

  it('T-F17.1-FE-10: cambiar de DNI a RUC permite escribir hasta 11 dígitos', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '12345678' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678');
    });
    // Cambiar a RUC — el valor de 8 dígitos se conserva, ahora se puede escribir hasta 11
    await seleccionarTipoDoc('6');
    fireEvent.change(input, { target: { value: '12345678901' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678901');
    });
  });

  it('T-F17.1-FE-11: Pasaporte acepta alfanumérico sin truncar a 8 ni a 11', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('7');
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: 'AB123456789' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('AB123456789');
    });
  });

  it('T-F17.1-FE-12: Validaciones F-17 siguen funcionando con inputs limitados — RUC válido avanza', async () => {
    await irAlPaso1F17();
    // Pegar RUC válido mediante onPaste
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.paste(input, {
      clipboardData: { getData: vi.fn().mockReturnValue('20467534026') },
    });
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument();
    });
  });
});

// ============================================================
// F-18 — Motivos de traslado simplificados y tarjetas de tipo
// ============================================================

describe('F-18 — Motivos automáticos y tarjetas de tipo traslado', () => {
  beforeEach(() => {
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    (sucursalService.listar as Mock).mockResolvedValue([]);
  });

  it('T-F18-FE-01: DELIVERY asigna motivo 01 automáticamente (badge visible)', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(/01 — Venta/i)).toBeInTheDocument());
  });

  it('T-F18-FE-02: SUCURSALES asigna motivo 04 automáticamente (badge visible)', async () => {
    renderModal();
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
    expect(screen.getByText(/04 — Traslado entre establecimientos/i)).toBeInTheDocument();
  });

  it('T-F18-FE-03: los motivos 02, 08, 09 y 13 no aparecen en el paso Traslado', async () => {
    renderModal();
    await waitFor(() => expect(screen.queryByText(/02 - Compra/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/08 - Importación/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/09 - Exportación/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/13 - Otros/i)).not.toBeInTheDocument();
  });

  it('T-F18-FE-04: tarjeta Delivery seleccionada muestra el buscador de ventas', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).toBeInTheDocument()
    );
  });

  it('T-F18-FE-05: tarjeta Entre sucursales no muestra el buscador de ventas', async () => {
    renderModal();
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
    expect(screen.queryByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).not.toBeInTheDocument();
  });

  it('T-F18-FE-06: volver a Delivery tras SUCURSALES restaura el buscador de ventas', async () => {
    renderModal();
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
    await userEvent.click(screen.getByText(/Enviar a un cliente/i));
    expect(screen.getByPlaceholderText(/Buscar por n° de venta, cliente o DNI\/RUC/i)).toBeInTheDocument();
  });

  it('T-F18-FE-07: volver a Delivery tras SUCURSALES reasigna motivo 01', async () => {
    renderModal();
    await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
    await userEvent.click(screen.getByText(/Enviar a un cliente/i));
    expect(screen.getByText(/01 — Venta/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-18.1 — Fecha timezone + validación RUC simplificada
// ============================================================

describe('F-18.1 — Fecha local Lima', () => {
  beforeEach(() => {
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    (sucursalService.listar as Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T-F18.1-FE-01: fecha predeterminada es el día local de Lima, no UTC', () => {
    // Simula 00:30 UTC del 26 → Lima aún es 19:30 del 25.
    // Solo mockea Date para no bloquear setTimeout/waitFor.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T00:30:00Z'));
    renderModal();
    expect(screen.getByDisplayValue('2026-11-25')).toBeInTheDocument();
  });

  it('T-F18.1-FE-02: fecha NO se desplaza al día siguiente por UTC', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T00:30:00Z'));
    renderModal();
    expect(screen.queryByDisplayValue('2026-11-26')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-11-25')).toBeInTheDocument();
  });

  it('T-F18.1-FE-03: fecha seleccionada manualmente se conserva', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));
    renderModal();
    const dateInput = screen.getByDisplayValue('2026-11-25');
    fireEvent.change(dateInput, { target: { value: '2026-12-01' } });
    await waitFor(() => expect(screen.getByDisplayValue('2026-12-01')).toBeInTheDocument());
  });

  it('T-F18.1-FE-04: borrador existente conserva su fecha original', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T00:30:00Z'));
    // editData simula un borrador ya creado con fecha fija
    const greExistente = greEjemplo({ fechaTraslado: '2026-11-20' });
    renderModal({ editData: greExistente });
    expect(screen.getByDisplayValue('2026-11-20')).toBeInTheDocument();
  });
});

describe('F-18.1 — Validación RUC simplificada (solo formato)', () => {
  beforeEach(() => {
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    (sucursalService.listar as Mock).mockResolvedValue([]);
  });

  it('T-F18.1-FE-05: RUC de 11 dígitos cualquiera pasa aunque no tenga DV correcto', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    await userEvent.type(input, '12345678901');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument());
  });

  it('T-F18.1-FE-06: RUC de 10 dígitos se rechaza', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    await userEvent.type(input, '1234567890');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/11 dígitos/i)));
  });

  it('T-F18.1-FE-07: RUC de 12 dígitos — el input bloquea el 12vo; con 11 avanza', async () => {
    // F-17.1 ya limita el input a maxLength=11; los 11 chars que quedan son válidos
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '123456789012' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('12345678901');
    });
  });

  it('T-F18.1-FE-08: RUC con letras no llega al estado (bloqueado por F-17.1)', async () => {
    await irAlPaso1F17();
    const input = screen.getByPlaceholderText('20100000000');
    fireEvent.change(input, { target: { value: '1234567890A' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('20100000000') as HTMLInputElement).value).toBe('1234567890');
    });
  });

  it('T-F18.1-FE-09: RUC vacío se rechaza', async () => {
    await irAlPaso1F17();
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/número de documento/i)));
  });

  it('T-F18.1-FE-10: DNI de 8 dígitos sigue siendo válido', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    await userEvent.type(input, '12345678');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByPlaceholderText(/Buscar producto/i)).toBeInTheDocument());
  });

  it('T-F18.1-FE-11: DNI de 7 dígitos se rechaza', async () => {
    await irAlPaso1F17();
    await seleccionarTipoDoc('1');
    const input = screen.getByPlaceholderText('20100000000');
    await userEvent.type(input, '1234567');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/8 dígitos/i)));
  });
});
