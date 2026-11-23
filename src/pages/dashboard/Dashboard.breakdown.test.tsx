import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Dashboard } from './Dashboard';
import { productoService } from '../../services/producto.service';
import type { DashboardSummaryDTO } from '../../services/producto.service';

// ── Mocks de módulos ──────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      rol: 'ADMIN',
      suscripcion: {
        estado: 'ACTIVA',
        planId: 'PRO',
        trialEndDate: null,
        preapprovalId: null,
        currentPeriodEnd: null,
      },
    },
    suscripcionEstado: 'ACTIVA',
  }),
}));

vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ userId: 1 }),
}));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    puede: (p: string) =>
      ['VER_PRODUCTOS', 'VER_VENTAS', 'VER_INVENTARIO', 'VER_CLIENTES'].includes(p),
  }),
}));

vi.mock('../../store/tenantConfigStore', () => ({
  useTenantConfigStore: () => ({
    config: { rubro: 'FERRETERIA' },
    rubro: 'FERRETERIA',
  }),
}));

vi.mock('../../store/sucursalStore', () => ({
  useSucursalStore: () => ({
    sucursalActual: null,
    loaded: true,
  }),
}));

vi.mock('../../hooks/useOseConfigured', () => ({
  useOseConfigured: () => false,
}));

vi.mock('../../services/producto.service', () => ({
  productoService: { getDashboardSummary: vi.fn() },
}));

vi.mock('../../services/venta.service', () => ({
  ventaService: {
    getByPeriod: vi.fn().mockResolvedValue([]),
    getByVendorAndPeriod: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/dashboard.service', () => ({
  dashboardService: {
    getActividadReciente: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/mascota.service', () => ({
  mascotaService: { getStats: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../services/cliente.service', () => ({
  clienteService: { getStats: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../services/gasto.service', () => ({
  gastoService: { getTotal: vi.fn().mockResolvedValue(0) },
}));

vi.mock('../../services/comision.service', () => ({
  comisionService: { listar: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../services/ordenTrabajo.service', () => ({
  ordenTrabajoService: {
    listar: vi.fn().mockResolvedValue({ resumen: null }),
  },
}));

vi.mock('../../lib/notify', () => ({
  notify: { fromError: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../components/shared/OseBanner', () => ({
  OseBanner: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSummary(override: Partial<DashboardSummaryDTO> = {}): DashboardSummaryDTO {
  return {
    totalProductos: 25,
    bajoStockCount: 18,
    sinStockCount: 16,
    stockBajoMinimoCount: 2,
    bajoStockItems: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      nombre: `Producto-${i + 1}`,
      codigoBarras: `COD-${i + 1}`,
      stockActual: 0,
      stockMinimo: 5,
    })),
    productosProximosAVencer: [],
    ...override,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Dashboard — desglose stock bajo (F-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DBD-1: muestra "16 sin stock · 2 por debajo del mínimo" cuando el backend devuelve sinStockCount=16 y stockBajoMinimoCount=2', async () => {
    (productoService.getDashboardSummary as Mock).mockResolvedValue(buildSummary());

    render(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByText('16 sin stock · 2 por debajo del mínimo'),
      ).toBeInTheDocument();
    });
  });

  it('DBD-2: el desglose muestra los valores server-side aunque bajoStockItems solo tenga 5 registros', async () => {
    // Si el frontend derivara el desglose filtrando bajoStockItems (5 ítems, todos stockActual=0):
    //   sinStockCount derivado = 5 (no 16)
    //   stockBajoMinimoCount derivado = 0 (no 2)
    // Con el fix server-side se muestran los valores reales: 16 y 2.
    const summary = buildSummary({
      sinStockCount: 16,
      stockBajoMinimoCount: 2,
      bajoStockItems: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        nombre: `Prod-${i + 1}`,
        stockActual: 0,
        stockMinimo: 5,
      })),
    });
    (productoService.getDashboardSummary as Mock).mockResolvedValue(summary);

    render(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByText('16 sin stock · 2 por debajo del mínimo'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/5 sin stock/)).not.toBeInTheDocument();
  });

  it('DBD-3: el total bajoStockCount (18) aparece como número principal del KPI y el desglose suma 16+2=18', async () => {
    (productoService.getDashboardSummary as Mock).mockResolvedValue(buildSummary());

    render(<Dashboard />);

    await waitFor(() => {
      // "18" aparece en el KPI grande y también en badges; ambas instancias son correctas.
      expect(screen.getAllByText('18').length).toBeGreaterThan(0);
    });
    expect(
      screen.getByText('16 sin stock · 2 por debajo del mínimo'),
    ).toBeInTheDocument();
  });

  it('DBD-4: mientras el servicio no resuelve, se muestra el spinner de carga', () => {
    (productoService.getDashboardSummary as Mock).mockReturnValue(
      new Promise(() => {}),
    );

    render(<Dashboard />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('DBD-5: sin crash cuando getDashboardSummary falla; tarjeta de bajo stock se oculta', async () => {
    (productoService.getDashboardSummary as Mock).mockRejectedValue(
      new Error('Network error'),
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
    });

    // productosError=true → la tarjeta se oculta con !productosError, sin crash
    expect(
      screen.queryByText(/sin stock · .* por debajo del mínimo/),
    ).not.toBeInTheDocument();
  });
});
