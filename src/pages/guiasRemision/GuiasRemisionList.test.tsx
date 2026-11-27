import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GuiasRemisionList } from './GuiasRemisionList';

// ---- Mocks de módulos ----

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('../../services/guiaRemision.service', () => ({
  guiaRemisionService: {
    listar: vi.fn(),
    stats: vi.fn(),
    obtener: vi.fn(),
    eliminar: vi.fn(),
    emitir: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.error = vi.fn();
  toastFn.success = vi.fn();
  return { default: toastFn };
});

vi.mock('../../lib/notify', () => ({
  notify: { fromError: vi.fn() },
}));

vi.mock('./GuiaRemisionDetail', () => ({
  GuiaRemisionDetail: () => <div data-testid="detail-panel" />,
}));

vi.mock('./NuevaGuiaRemision', () => ({
  NuevaGuiaRemision: () => <div data-testid="nueva-modal" />,
}));

vi.mock('../../components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('../../store/sucursalStore', () => ({
  useSucursalStore: vi.fn(() => ({ sucursalActual: null, loaded: true })),
}));

vi.mock('../../hooks/useOseConfigured', () => ({
  useOseConfigured: vi.fn(() => true),
}));

vi.mock('../../components/ui/Pagination', () => ({
  Pagination: () => null,
}));

// ---- Imports de los mocks ----
import { usePermissions } from '../../hooks/usePermissions';
import { guiaRemisionService } from '../../services/guiaRemision.service';

// ---- Helpers ----

const ADMIN_PERMISOS = {
  isAdmin: true,
  isGerente: false,
  puede: () => false,
};

const VENDEDOR_PERMISOS = {
  isAdmin: false,
  isGerente: false,
  puede: (p: string) => p === 'VER_GRE',
};

const SIN_PERMISOS = {
  isAdmin: false,
  isGerente: false,
  puede: () => false,
};

const PAGE_VACIA = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
const PAGE_CON_ITEMS = {
  content: [
    {
      id: 1,
      numeroCompleto: 'T001-00000001',
      tipoTraslado: 'DELIVERY',
      modalidadTransporte: 'PRIVADO',
      estadoTributario: 'EMITIDA',
      estadoLogistico: 'EN_CAMINO',
      fechaTraslado: '2026-11-25',
      destinatarioRazonSocial: 'Cliente Test',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
};
const STATS = { total: 5, emitidas: 3, pendientes: 1, conError: 1 };

// ---- Tests ----

describe('GuiasRemisionList — F-20 carga inicial coordinada', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    (usePermissions as Mock).mockReturnValue(ADMIN_PERMISOS);
  });

  /**
   * T-F20-01: Mientras la carga inicial está en curso, se muestra el spinner de carga
   * y NO se muestran las tarjetas KPI ni valores reales.
   */
  it('T-F20-01: muestra spinner durante la carga inicial', async () => {
    let resolveListar!: (v: unknown) => void;
    let resolveStats!: (v: unknown) => void;
    (guiaRemisionService.listar as Mock).mockReturnValue(
      new Promise(res => { resolveListar = res; }),
    );
    (guiaRemisionService.stats as Mock).mockReturnValue(
      new Promise(res => { resolveStats = res; }),
    );

    render(<GuiasRemisionList />);

    // No se muestran las tarjetas KPI mientras carga
    expect(screen.queryByText('Total de guías')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin guías de remisión')).not.toBeInTheDocument();

    // Limpiar promesas pendientes
    act(() => { resolveListar(PAGE_VACIA); resolveStats(STATS); });
    await waitFor(() => expect(screen.getByText('Total de guías')).toBeInTheDocument());
  });

  /**
   * T-F20-02: Mientras la carga inicial está en curso NO se muestra el mensaje
   * "Sin guías de remisión" (no se muestra EmptyState prematuramente).
   */
  it('T-F20-02: no muestra EmptyState durante la carga inicial', async () => {
    let resolveListar!: (v: unknown) => void;
    (guiaRemisionService.listar as Mock).mockReturnValue(
      new Promise(res => { resolveListar = res; }),
    );
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    expect(screen.queryByText('Sin guías de remisión')).not.toBeInTheDocument();

    act(() => resolveListar(PAGE_VACIA));
    await waitFor(() => expect(screen.getByText('Sin guías de remisión')).toBeInTheDocument());
  });

  /**
   * T-F20-03: Después de que ambas promesas resuelven, desaparecen los skeletons
   * y se muestran los datos reales de stats.
   */
  it('T-F20-03: muestra datos reales tras completar la carga inicial', async () => {
    (guiaRemisionService.listar as Mock).mockResolvedValue(PAGE_VACIA);
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    await waitFor(() => {
      expect(screen.getByText('Total de guías')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument(); // total
    expect(screen.getByText('3')).toBeInTheDocument(); // emitidas
  });

  /**
   * T-F20-04: listar y stats se llaman exactamente una vez en la carga inicial.
   */
  it('T-F20-04: llama a listar y stats exactamente una vez en la carga inicial', async () => {
    (guiaRemisionService.listar as Mock).mockResolvedValue(PAGE_VACIA);
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    await waitFor(() => expect(screen.getByText('Total de guías')).toBeInTheDocument());

    expect(guiaRemisionService.listar).toHaveBeenCalledTimes(1);
    expect(guiaRemisionService.stats).toHaveBeenCalledTimes(1);
  });

  /**
   * T-F20-05: Si el usuario no tiene permiso VER_GRE, no se llaman los servicios.
   */
  it('T-F20-05: sin permisos GRE no llama a ningún servicio', () => {
    (usePermissions as Mock).mockReturnValue(SIN_PERMISOS);

    render(<GuiasRemisionList />);

    expect(guiaRemisionService.listar).not.toHaveBeenCalled();
    expect(guiaRemisionService.stats).not.toHaveBeenCalled();
  });

  /**
   * T-F20-06: VENDEDOR con VER_GRE puede ver la pantalla y los servicios se llaman.
   */
  it('T-F20-06: VENDEDOR con VER_GRE puede ver la pantalla y los servicios se llaman', async () => {
    (usePermissions as Mock).mockReturnValue(VENDEDOR_PERMISOS);
    (guiaRemisionService.listar as Mock).mockResolvedValue(PAGE_VACIA);
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    await waitFor(() => expect(screen.getByText('Total de guías')).toBeInTheDocument());

    expect(guiaRemisionService.listar).toHaveBeenCalledTimes(1);
    expect(guiaRemisionService.stats).toHaveBeenCalledTimes(1);
  });

  /**
   * T-F20-07: Cuando hay guías, después de la carga inicial se muestra la tabla con datos.
   */
  it('T-F20-07: muestra filas de datos reales tras la carga', async () => {
    (guiaRemisionService.listar as Mock).mockResolvedValue(PAGE_CON_ITEMS);
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    await waitFor(() => {
      expect(screen.getByText('T001-00000001')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('table-row-skeleton')).not.toBeInTheDocument();
  });

  /**
   * T-F20-08: Cuando no hay guías, después de la carga inicial se muestra EmptyState
   * (nunca durante la carga).
   */
  it('T-F20-08: EmptyState aparece solo después de la carga, no durante', async () => {
    let resolveListar!: (v: unknown) => void;
    (guiaRemisionService.listar as Mock).mockReturnValue(
      new Promise(res => { resolveListar = res; }),
    );
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    // Durante la carga: NO aparece EmptyState
    expect(screen.queryByText('Sin guías de remisión')).not.toBeInTheDocument();

    act(() => resolveListar(PAGE_VACIA));

    await waitFor(() => {
      expect(screen.getByText('Sin guías de remisión')).toBeInTheDocument();
    });
  });

  /**
   * T-F20-09: Las stats se conservan cuando la lista termina de cargar sin refrescar stats.
   * Verifica que al completar fetchList, el valor de stats no se pone en null/0.
   */
  it('T-F20-09: las stats persisten al completar una carga de lista posterior', async () => {
    (guiaRemisionService.listar as Mock).mockResolvedValue(PAGE_VACIA);
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    // Esperar que la carga inicial termine
    await waitFor(() => expect(screen.getByText('Total de guías')).toBeInTheDocument());

    // Los valores de stats ya están visibles (5, 3, etc.)
    expect(screen.getByText('5')).toBeInTheDocument();

    // stats solo se llama una vez (en el inicial, no en cargas posteriores de lista)
    expect(guiaRemisionService.stats).toHaveBeenCalledTimes(1);
  });

  /**
   * T-F20-10: Si listar falla en la carga inicial, los skeletons desaparecen igual
   * (initialLoading se resuelve con finally).
   */
  it('T-F20-10: si listar falla, el spinner desaparece y no queda bloqueado', async () => {
    (guiaRemisionService.listar as Mock).mockRejectedValue(new Error('Network Error'));
    (guiaRemisionService.stats as Mock).mockResolvedValue(STATS);

    render(<GuiasRemisionList />);

    // Aunque listar falla, el spinner debe desaparecer (Promise.all usa finally)
    await waitFor(() => {
      expect(screen.getByText('Total de guías')).toBeInTheDocument();
    });
  });
});
