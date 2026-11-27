/**
 * F-28.3 — Tests de integración GRE × usePlan (hook real)
 *
 * Estos tests NO mockean usePlan. Mockean useAuthStore con datos reales del
 * tenant Legacy para verificar que la normalización del plan funciona de
 * extremo a extremo. Si alguno falla, el bug está en usePlan o en la cadena
 * de resolución del plan, no en el componente.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NuevaGuiaRemision } from './NuevaGuiaRemision';

// ---- Mocks de módulos ----

vi.mock('../../services/sucursal.service', () => ({
  sucursalService: { listar: vi.fn() },
}));

vi.mock('../../services/venta.service', () => ({
  ventaService: { buscar: vi.fn(), getDetalleParaGRE: vi.fn() },
}));

vi.mock('../../services/guiaRemision.service', () => ({
  guiaRemisionService: { crear: vi.fn(), actualizar: vi.fn() },
}));

vi.mock('../../services/producto.service', () => ({
  productoService: { searchGre: vi.fn().mockResolvedValue([]), getVariantesConStock: vi.fn().mockResolvedValue([]) },
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

// F-28.3: mock de authService para que usePlan no llame a la API real.
// Para Legacy (planCodigo=null) el useEffect retorna antes de llamar, pero
// se mockea igual por si algún test usa planCodigo.
vi.mock('../../services/auth.service', () => ({
  authService: {
    getPlanPorCodigo: vi.fn(),
    obtenerPerfil: vi.fn(),
  },
}));

// F-28.3: mock de useAuthStore — se varía por test.
// NO se mockea usePlan: el hook real se ejecuta con los datos del store.
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
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
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

// ---- Helpers ----

const sucursal1 = { id: 10, nombre: 'Tienda Lima', activo: true, ubigeo: '150101', direccion: 'Av. Lima 123', direccionCompleta: 'Av. Lima 123' };
const sucursal2 = { id: 20, nombre: 'Tienda Arequipa', activo: true, ubigeo: '040101', direccion: 'Av. Arequipa 1', direccionCompleta: 'Av. Arequipa 1' };

/** Datos JWT mínimos para un tenant Básico Legacy (sin planCodigo) */
function userLegacyBasico() {
  return {
    usuarioId: 1,
    email: 'admin@legacy.com',
    nombre: 'Admin Legacy',
    rol: 'ADMIN',
    tenantId: 'tenant-legacy',
    suscripcion: {
      id: 99,
      usuarioPrincipalId: 1,
      planId: 'BASICO',
      planCodigo: null,
      precioMensual: 50,
      estado: 'ACTIVA',
      tenantId: 'tenant-legacy',
    },
  };
}

/** Datos JWT mínimos para un tenant Básico nuevo (con planCodigo) */
function userNuevoBasico() {
  return {
    usuarioId: 2,
    email: 'admin@nuevo.com',
    nombre: 'Admin Nuevo',
    rol: 'ADMIN',
    tenantId: 'tenant-nuevo',
    suscripcion: {
      id: 100,
      usuarioPrincipalId: 2,
      planId: 'BASICO',
      planCodigo: 'FARMACIA_BOTICA_BASICO',
      precioMensual: 109,
      estado: 'ACTIVA',
      tenantId: 'tenant-nuevo',
    },
  };
}

/** Datos JWT para un tenant Pro */
function userPro() {
  return {
    usuarioId: 3,
    email: 'admin@pro.com',
    nombre: 'Admin Pro',
    rol: 'ADMIN',
    tenantId: 'tenant-pro',
    suscripcion: {
      id: 101,
      usuarioPrincipalId: 3,
      planId: 'PRO',
      planCodigo: 'FARMACIA_BOTICA_PRO',
      precioMensual: 199,
      estado: 'ACTIVA',
      tenantId: 'tenant-pro',
    },
  };
}

function configSinDespacho() {
  return { ubigeoDespacho: null, direccionDespacho: null, rubro: 'OTRO' };
}

function configConDespacho() {
  return { ubigeoDespacho: '150101', direccionDespacho: 'Almacén Central 456', rubro: 'OTRO' };
}

function renderModal() {
  return render(<NuevaGuiaRemision onClose={vi.fn()} onCreate={vi.fn()} />);
}

async function irAlPaso1() {
  await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
}

async function seleccionarSucursales() {
  await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
}

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
  (useNavigate as Mock).mockReturnValue(vi.fn());
  // Por defecto: Legacy Básico
  (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
});

// ============================================================
// F-28.3-FE-1: Legacy Básico (planId=BASICO, planCodigo=null)
// con una sucursal activa → debe mostrar CTA upgrade a Plan Pro
// ============================================================

describe('F-28.3-FE-1: Legacy Básico (planCodigo=null) + 1 sucursal → CTA upgrade', () => {
  it('muestra el panel de upgrade y NO el mensaje de registrar otra sucursal', async () => {
    (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registra una nueva sucursal en/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

// ============================================================
// F-28.3-FE-2: Nuevo Básico (planCodigo=FARMACIA_BOTICA_BASICO)
// con una sucursal activa → misma CTA upgrade que Legacy
// ============================================================

describe('F-28.3-FE-2: Nuevo Básico (planCodigo presente) + 1 sucursal → misma CTA que Legacy', () => {
  it('muestra el mismo panel de upgrade que el tenant Legacy Básico', async () => {
    // Para nuevo con planCodigo, usePlan llama a la API — mockeamos getPlanPorCodigo
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.getPlanPorCodigo).mockResolvedValue({
      codigo: 'FARMACIA_BOTICA_BASICO',
      segmento: 'FARMACIA_BOTICA',
      rubroOperativo: 'FARMACIA_BOTICA',
      nivel: 'BASICO',
      precioMensual: 109,
      maxUsuarios: 5,
      maxSucursales: 1,
      maxProductos: 2000,
    });

    (useAuthStore as Mock).mockReturnValue({ user: userNuevoBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registra una nueva sucursal en/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-28.3-FE-3: DOM idéntico entre Legacy y Nuevo para Básico
// ============================================================

describe('F-28.3-FE-3: Legacy Básico y Nuevo Básico muestran DOM idéntico', () => {
  it('título, descripción y CTA son los mismos en ambos tenants', async () => {
    // Legacy
    (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    const { unmount } = renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    const tituloLegacy = screen.getByText(/No tienes otras sucursales/i).textContent;
    const descLegacy   = screen.getByText(/Tu plan actual permite tener una sola sucursal/i).textContent;
    const ctaLegacy    = screen.getByText(/Actualiza a Plan Pro/i).textContent;

    unmount();
    vi.clearAllMocks();

    // Nuevo
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.getPlanPorCodigo).mockResolvedValue({
      codigo: 'FARMACIA_BOTICA_BASICO', segmento: 'FARMACIA_BOTICA', rubroOperativo: 'FARMACIA_BOTICA',
      nivel: 'BASICO', precioMensual: 109, maxUsuarios: 5, maxSucursales: 1, maxProductos: 2000,
    });
    (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useAuthStore as Mock).mockReturnValue({ user: userNuevoBasico() });
    (useNavigate as Mock).mockReturnValue(vi.fn());

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    const tituloNuevo = screen.getByText(/No tienes otras sucursales/i).textContent;
    const descNuevo   = screen.getByText(/Tu plan actual permite tener una sola sucursal/i).textContent;
    const ctaNuevo    = screen.getByText(/Actualiza a Plan Pro/i).textContent;

    expect(tituloNuevo).toBe(tituloLegacy);
    expect(descNuevo).toBe(descLegacy);
    expect(ctaNuevo).toBe(ctaLegacy);
  });
});

// ============================================================
// F-28.3-FE-4: Legacy Básico con sucursal activo=null
// La regla activo !== false cuenta como activa
// ============================================================

describe('F-28.3-FE-4: Legacy Básico + sucursal con activo=null → se cuenta como activa', () => {
  it('1 sucursal con activo=null → sigue mostrando panel de upgrade (cuenta como activa)', async () => {
    const sucursalActivoNull = { ...sucursal1, activo: null as unknown as boolean };
    (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursalActivoNull]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // activo=null !== false → se cuenta → sucursalesActivas.length=1 → limiteAlcanzado=true
    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-28.3-FE-5: Legacy Básico con sucursal inactiva (activo=false)
// no debe contarla
// ============================================================

describe('F-28.3-FE-5: Legacy Básico + sucursal activo=false → NO se cuenta', () => {
  it('1 activa + 1 inactiva → sucursalesActivas.length=1 → panel de upgrade', async () => {
    const sucursalInactiva = { id: 30, nombre: 'Cerrada', activo: false, ubigeo: '150101', direccion: 'X', direccionCompleta: 'X' };
    (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursalInactiva]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Solo 1 activa (activo !== false) → limiteAlcanzado=true → upgrade
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-28.3-FE-6: Pro con 1 sucursal registrada y capacidad disponible
// → debe mostrar "Registrar en Config" (NO upgrade)
// ============================================================

describe('F-28.3-FE-6: Pro con 1 sucursal y capacidad → mensaje registrar en Config', () => {
  it('Pro + 1 sucursal activa → puede registrar más → NO muestra CTA upgrade', async () => {
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.getPlanPorCodigo).mockResolvedValue({
      codigo: 'FARMACIA_BOTICA_PRO', segmento: 'FARMACIA_BOTICA', rubroOperativo: 'FARMACIA_BOTICA',
      nivel: 'PRO', precioMensual: 199, maxUsuarios: 15, maxSucursales: 5, maxProductos: 5000,
    });
    (useAuthStore as Mock).mockReturnValue({ user: userPro() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Registra una nueva sucursal en/i)).toBeInTheDocument();
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-28.3-FE-7: Pro con 2+ sucursales activas → selectores normales
// ============================================================

describe('F-28.3-FE-7: Pro con 2 sucursales activas → muestra selectores (no panel vacío)', () => {
  it('Pro + 2 sucursales → sinSucursalesDestino=false → selectores de origen y destino visibles', async () => {
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.getPlanPorCodigo).mockResolvedValue({
      codigo: 'FARMACIA_BOTICA_PRO', segmento: 'FARMACIA_BOTICA', rubroOperativo: 'FARMACIA_BOTICA',
      nivel: 'PRO', precioMensual: 199, maxUsuarios: 15, maxSucursales: 5, maxProductos: 5000,
    });
    (useAuthStore as Mock).mockReturnValue({ user: userPro() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/Sucursal de origen/i)).toBeInTheDocument();
    expect(screen.getByText(/Sucursal de destino/i)).toBeInTheDocument();
    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// F-28.3-FE-8: DELIVERY con 1 sucursal (cualquier plan)
// → Siguiente habilitado (sinSucursalesDestino solo aplica a SUCURSALES)
// ============================================================

describe('F-28.3-FE-8: DELIVERY con 1 sucursal → Siguiente habilitado', () => {
  it('Legacy Básico en modo DELIVERY + 1 sucursal → Siguiente no está deshabilitado', async () => {
    (useAuthStore as Mock).mockReturnValue({ user: userLegacyBasico() });
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    // Por defecto está en DELIVERY — no cambiar a SUCURSALES
    await irAlPaso1();

    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).not.toBeDisabled();
  });
});
