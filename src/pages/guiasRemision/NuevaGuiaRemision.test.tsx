import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NuevaGuiaRemision } from './NuevaGuiaRemision';
import type { VentaDTO } from '../../types';

// ---- Mocks de módulos ----

vi.mock('../../services/sucursal.service', () => ({
  sucursalService: { listar: vi.fn() },
}));

vi.mock('../../services/venta.service', () => ({
  ventaService: { getAll: vi.fn() },
}));

vi.mock('../../services/guiaRemision.service', () => ({
  guiaRemisionService: { crear: vi.fn(), actualizar: vi.fn() },
}));

vi.mock('../../services/producto.service', () => ({
  productoService: { search: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../services/productoPresentacion.service', () => ({
  productoPresentacionService: { listar: vi.fn().mockResolvedValue([]) },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../../store/tenantConfigStore', () => ({
  useTenantConfigStore: vi.fn(),
}));

vi.mock('../../components/gre/UbigeoSelector', () => ({
  UbigeoSelector: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label>{label}</label>
      <input data-testid="ubigeo-input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  ),
}));

// ---- Imports de los mocks (para acceder a los vi.fn()) ----
import { sucursalService } from '../../services/sucursal.service';
import { ventaService } from '../../services/venta.service';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import toast from 'react-hot-toast';

// ---- Helpers ----

const sucursalEjemplo = { id: 10, nombre: 'Tienda Lima', activo: true, ubigeo: '150101', direccion: 'Av. Lima 123', direccionCompleta: 'Av. Lima 123' };

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

async function irAlPaso1() {
  await userEvent.click(screen.getByText('Siguiente'));
}

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([]);
  (ventaService.getAll as Mock).mockResolvedValue([]);
});

// ========================================
// F-10 Objetivo 1 — Compatibilidad tenants
// ========================================

describe('F-10 Caso A — Tenant con sucursales, DELIVERY sin venta', () => {
  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursalEjemplo]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
  });

  it('T-F10-FE-01: muestra selector de sucursal cuando hay sucursales y no hay venta', async () => {
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
    // Sin destinatario no llega al siguiente paso, así que primero completamos el destinatario
    // Para este test validamos el mensaje de error directo en siguiente paso
    // Escribir destinatario para pasar a la siguiente validación de sucursal
    await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Juan');
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
    await userEvent.click(screen.getByText('Siguiente'));
    // Si no hubo toast.error con mensaje de sucursal, la validación pasó
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
      expect(screen.getByText(/Configuración → Negocio/i)).toBeInTheDocument();
    });
  });

  it('T-F10-FE-07: validación falla con mensaje de Configuración en Caso C', async () => {
    renderModal();
    await irAlPaso1();
    await waitFor(() => screen.getByText(/Punto de despacho no configurado/i));
    await userEvent.type(screen.getByPlaceholderText(/Nombre del destinatario/i), 'Cliente Test');
    await userEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Configuración → Negocio/i)
      );
    });
  });
});

describe('F-10 Caso D — DELIVERY con venta asociada', () => {
  const ventaEjemplo: VentaDTO = {
    id: 42, vendedorId: 1, total: 150.00, metodoPago: 'EFECTIVO',
    estado: 'COMPLETADA', tenantId: 'test', clienteNombre: 'María García',
    detalles: [],
  };

  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
    (ventaService.getAll as Mock).mockResolvedValue([ventaEjemplo]);
  });

  it('T-F10-FE-08: Caso D pasa validación con venta aunque no haya sucursales ni despacho', async () => {
    renderModal();
    await irAlPaso1();

    // Abrir selector de ventas y seleccionar (precarga también el destinatario)
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => screen.getByText(/María García/i));
    // Usar mouseDown para evitar que el blur del input cierre el dropdown antes del click
    fireEvent.mouseDown(screen.getByText(/María García/i));

    // Con venta seleccionada y destinatario precargado, la validación debe pasar
    await waitFor(() => expect(screen.queryByPlaceholderText(/Buscar por n° venta o cliente/i)).not.toBeInTheDocument());
    await userEvent.click(screen.getByText('Siguiente'));
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/sucursal|despacho/i)
    );
  });
});

// ========================================
// F-10 Objetivo 2 — Selector de ventas
// ========================================

describe('Selector de ventas', () => {
  const ventas: VentaDTO[] = [
    { id: 10, vendedorId: 1, total: 50.00, metodoPago: 'EFECTIVO', estado: 'COMPLETADA', tenantId: 'test', clienteNombre: 'Ana Torres', detalles: [] },
    { id: 20, vendedorId: 1, total: 200.00, metodoPago: 'TARJETA', estado: 'COMPLETADA', tenantId: 'test', clienteNombre: 'Pedro Ruiz', detalles: [] },
    { id: 30, vendedorId: 1, total: 75.00, metodoPago: 'EFECTIVO', estado: 'COMPLETADA', tenantId: 'test', clienteNombre: 'Carmen López', detalles: [] },
  ];

  beforeEach(() => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });
    (ventaService.getAll as Mock).mockResolvedValue(ventas);
  });

  it('T-F10-FE-09: NO carga ventas hasta que el usuario hace focus en el input', async () => {
    renderModal();
    await irAlPaso1();
    expect(ventaService.getAll).not.toHaveBeenCalled();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => expect(ventaService.getAll).toHaveBeenCalledOnce());
  });

  it('T-F10-FE-10: filtra ventas por número de venta', async () => {
    renderModal();
    await irAlPaso1();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => screen.getByText(/Ana Torres/i));

    await userEvent.type(inputVenta, '20');
    expect(screen.getByText(/Pedro Ruiz/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ana Torres/i)).not.toBeInTheDocument();
  });

  it('T-F10-FE-11: filtra ventas por nombre de cliente', async () => {
    renderModal();
    await irAlPaso1();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => screen.getByText(/Carmen López/i));

    await userEvent.type(inputVenta, 'carmen');
    expect(screen.getByText(/Carmen López/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ana Torres/i)).not.toBeInTheDocument();
  });

  it('T-F10-FE-12: al seleccionar venta, precarga destinatario cuando el campo está vacío', async () => {
    renderModal();
    await irAlPaso1();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => screen.getByText(/Ana Torres/i));
    await userEvent.click(screen.getByText(/Ana Torres/i));

    // El campo razón social debería tener el nombre del cliente
    const inputDest = screen.getByPlaceholderText(/Nombre del destinatario/i) as HTMLInputElement;
    expect(inputDest.value).toBe('Ana Torres');
  });

  it('T-F10-FE-13: al quitar la venta, se restaura la vista de despacho independiente', async () => {
    renderModal();
    await irAlPaso1();
    const inputVenta = screen.getByPlaceholderText(/Buscar por n° venta o cliente/i);
    await userEvent.click(inputVenta);
    await waitFor(() => screen.getByText(/Pedro Ruiz/i));
    await userEvent.click(screen.getByText(/Pedro Ruiz/i));

    // Verificar que la venta está seleccionada
    await waitFor(() => screen.getByText(/#20/));

    // Quitar la venta
    await userEvent.click(screen.getByLabelText(/Quitar venta/i));

    // Debe volver a mostrar el input de búsqueda
    expect(screen.getByPlaceholderText(/Buscar por n° venta o cliente/i)).toBeInTheDocument();
    // Y para Caso B (tenant sin sucursales, con despacho) debe mostrar el aviso informativo
    expect(screen.getByText(/Punto de despacho configurado/i)).toBeInTheDocument();
  });
});
