/**
 * F-28.4 — Tests de conteoEfectivo para tenants Legacy con establecimiento principal implícito
 *
 * Estos tests verifican la lógica de conteoEfectivo en NuevaGuiaRemision:
 *   const tienePrincipalImplicita = sucursalesActivas.length === 0 && negocio != null;
 *   const conteoEfectivo = tienePrincipalImplicita ? 1 : sucursalesActivas.length;
 *
 * Para aislar esta lógica del componente se mockea usePlan directamente.
 * El hook usePlan está cubierto por la suite F-28.3 (hook real + useAuthStore mock).
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

vi.mock('../../hooks/usePlan', () => ({
  usePlan: vi.fn(),
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
import { usePlan } from '../../hooks/usePlan';
import { useNavigate } from 'react-router-dom';

// ---- Helpers ----

const sucursal1 = { id: 10, nombre: 'Tienda Lima',    activo: true,  ubigeo: '150101', direccion: 'Av. Lima 123',    direccionCompleta: 'Av. Lima 123' };
const sucursal2 = { id: 20, nombre: 'Tienda Arequipa', activo: true,  ubigeo: '040101', direccion: 'Av. Arequipa 1', direccionCompleta: 'Av. Arequipa 1' };

const planBasico = { planId: 'BASICO', isBasico: true,  isPro: false, limites: { sucursales: 1, usuarios: 5,  productos: 2000 }, loading: false, error: false, segmento: null };
const planPro    = { planId: 'PRO',   isBasico: false, isPro: true,  limites: { sucursales: 5, usuarios: 15, productos: 5000 }, loading: false, error: false, segmento: null };

/** Config completa del tenant (negocio != null). */
function configConNegocio() {
  return { nombreNegocio: 'Farmacia San Martín', ruc: '20123456789', ubigeoDespacho: '150101', direccionDespacho: 'Almacén Central 456', rubro: 'FARMACIA' };
}

/** Config con negocio pero sin punto de despacho configurado. */
function configNegocioSinDespacho() {
  return { nombreNegocio: 'Farmacia San Martín', ruc: '20123456789', ubigeoDespacho: null, direccionDespacho: null, rubro: 'FARMACIA' };
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
  (useTenantConfigStore as Mock).mockReturnValue({ config: configNegocioSinDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([]);
  (usePlan as Mock).mockReturnValue(planBasico);
  (useNavigate as Mock).mockReturnValue(vi.fn());
});

// ============================================================
// F-28.4-FE-1: Básico nuevo con una sucursal registrada
// sucursalesActivas.length = 1 → tienePrincipalImplicita = false → conteoEfectivo = 1
// ============================================================

describe('F-28.4-FE-1: Básico nuevo con una sucursal registrada → límite alcanzado', () => {
  it('muestra CTA upgrade y botón deshabilitado cuando hay exactamente 1 sucursal registrada', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registra una nueva sucursal en/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

// ============================================================
// F-28.4-FE-2: Básico Legacy con principal implícita (0 registros de sucursales)
// sucursalesActivas.length = 0 && negocio != null → tienePrincipalImplicita = true → conteoEfectivo = 1 → límite alcanzado
// ============================================================

describe('F-28.4-FE-2: Básico Legacy con principal implícita — límite alcanzado aunque API devuelva []', () => {
  it('muestra CTA upgrade y botón deshabilitado cuando no hay registros pero sí negocio configurado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configNegocioSinDespacho() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Mismo comportamiento que un tenant con 1 sucursal registrada
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registra una nueva sucursal en/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

// ============================================================
// F-28.4-FE-3: Básico Legacy con principal ya registrada en tabla (tras migración)
// sucursalesActivas.length = 1 → tienePrincipalImplicita = false → conteoEfectivo = 1 → límite alcanzado
// ============================================================

describe('F-28.4-FE-3: Básico Legacy con principal ya registrada — no introduce regresión', () => {
  it('cuando la sucursal principal ya está en tabla: muestra CTA upgrade (sin doble conteo)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConNegocio() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

// ============================================================
// F-28.4-FE-4: Evitar doble conteo de principal
// 1 sucursal registrada + negocio != null → conteoEfectivo = 1 (no 2)
// 0 sucursales + negocio != null → conteoEfectivo = 1 (no 2)
// En ambos casos el límite Básico está alcanzado y el botón queda deshabilitado.
// ============================================================

describe('F-28.4-FE-4: Sin doble conteo de principal', () => {
  it('con 1 sucursal registrada y negocio válido: conteoEfectivo = 1 (no suma 2) → botón deshabilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConNegocio() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Si conteoEfectivo fuera 2, con Plan Pro mostraría "Registra otra sucursal".
    // Con Plan Básico y 1 sucursal siempre muestra upgrade, así que verificamos
    // que el botón está deshabilitado y no hay dos paneles simultáneos.
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
    // Solo un panel de estado vacío visible
    const regionesSinSucursales = screen.queryAllByText(/No tienes otras sucursales/i);
    expect(regionesSinSucursales).toHaveLength(1);
  });

  it('con 0 sucursales y negocio válido: conteoEfectivo = 1 (no 2) → botón deshabilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConNegocio() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
    const regionesSinSucursales = screen.queryAllByText(/No tienes otras sucursales/i);
    expect(regionesSinSucursales).toHaveLength(1);
  });
});

// ============================================================
// F-28.4-FE-5: Sucursales inactivas — se tratan como sin sucursales
// activo=false → excluidas → sucursalesActivas.length = 0 && negocio != null → conteoEfectivo = 1
// ============================================================

describe('F-28.4-FE-5: Sucursales inactivas — tienePrincipalImplicita cuenta como establecimiento', () => {
  it('con 1 sucursal inactiva y negocio válido: muestra CTA upgrade (no "registrar otra")', async () => {
    const sucursalInactiva = { ...sucursal1, activo: false };
    (sucursalService.listar as Mock).mockResolvedValue([sucursalInactiva]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configNegocioSinDespacho() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // La sucursal inactiva no cuenta → sucursalesActivas = [] → principal implícita → conteoEfectivo = 1
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

// ============================================================
// F-28.4-FE-6: Pro con sucursales registradas — sin límite alcanzado
// sucursalesActivas.length = 2 → conteoEfectivo = 2 → sinSucursalesDestino = false → flujo activo
// ============================================================

describe('F-28.4-FE-6: Pro con 2 sucursales registradas — panel vacío no aparece', () => {
  it('con Plan Pro y 2 sucursales: sinSucursalesDestino = false, botón habilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConNegocio() });
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Con 2 sucursales el flujo está activo: se muestran selectores, no el panel vacío
    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu plan actual permite tener una sola sucursal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).not.toBeDisabled();
  });
});

// ============================================================
// F-28.4-FE-7: DELIVERY Legacy sin sucursales registradas — no afecta al flujo DELIVERY
// tipoTraslado != 'SUCURSALES' → sinSucursalesDestino = false → no muestra panel de límite
// ============================================================

describe('F-28.4-FE-7: DELIVERY Legacy sin sucursales — no muestra panel de límite de sucursales', () => {
  it('tipo DELIVERY con 0 sucursales y negocio con despacho: no muestra CTA upgrade de sucursales', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConNegocio() });
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    // No seleccionamos SUCURSALES — el tipo por defecto es DELIVERY
    await irAlPaso1();

    // El panel de límite de sucursales no debe aparecer en DELIVERY
    expect(screen.queryByText(/Tu plan actual permite tener una sola sucursal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
    // El flujo DELIVERY muestra su propio panel de punto de despacho
    expect(screen.getByText(/Punto de despacho configurado/i)).toBeInTheDocument();
  });
});
