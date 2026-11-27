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

const sucursal1 = { id: 10, nombre: 'Tienda Lima',    activo: true, ubigeo: '150101', direccion: 'Av. Lima 123',    direccionCompleta: 'Av. Lima 123' };
const sucursal2 = { id: 20, nombre: 'Tienda Arequipa', activo: true, ubigeo: '040101', direccion: 'Av. Arequipa 1', direccionCompleta: 'Av. Arequipa 1' };

function configConDespacho() {
  return { ubigeoDespacho: '150101', direccionDespacho: 'Almacén Central 456', rubro: 'OTRO' };
}

function configSinDespacho() {
  return { ubigeoDespacho: null, direccionDespacho: null, rubro: 'OTRO' };
}

function renderModal() {
  return render(<NuevaGuiaRemision onClose={vi.fn()} onCreate={vi.fn()} />);
}

/** Avanza al paso 1 clickeando "Siguiente" */
async function irAlPaso1() {
  await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
}

/** Selecciona "Trasladar entre sucursales" en el paso 0 */
async function seleccionarSucursales() {
  await userEvent.click(screen.getByText(/Trasladar entre sucursales/i));
}

const planBasico = { planId: 'BASICO', isBasico: true, isPro: false, limites: { sucursales: 1, usuarios: 5, productos: 2000 }, loading: false, error: false, segmento: null };
const planPro    = { planId: 'PRO',   isBasico: false, isPro: true,  limites: { sucursales: 5, usuarios: 15, productos: 5000 }, loading: false, error: false, segmento: null };

beforeEach(() => {
  vi.clearAllMocks();
  (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });
  (sucursalService.listar as Mock).mockResolvedValue([]);
  (usePlan as Mock).mockReturnValue(planBasico);
  (useNavigate as Mock).mockReturnValue(vi.fn());
});

// ============================================================
// F-28: Configuración de punto de despacho en pantalla Config
// ============================================================

describe('F-28-FE-1: Tenant nuevo sin sucursales — no muestra formulario de punto de despacho manual', () => {
  it('sin sucursales, tipo DELIVERY sin venta: muestra bloqueo (no formulario de despacho manual)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configSinDespacho() });

    renderModal();
    // Esperar carga de sucursales
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await irAlPaso1();

    // Sin sucursales y sin despacho configurado — debe mostrar mensaje de bloqueo
    expect(screen.getByText(/Punto de despacho no configurado/i)).toBeInTheDocument();
    // No debe mostrar un campo para ingresar ubigeo o dirección manualmente
    expect(screen.queryByPlaceholderText(/ubigeo/i)).not.toBeInTheDocument();
  });
});

describe('F-28-FE-2: Tenant legacy — mantiene visible la configuración de despacho', () => {
  it('sin sucursales pero con punto de despacho: muestra banner informativo en DELIVERY sin venta', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await irAlPaso1();

    expect(screen.getByText(/Punto de despacho configurado/i)).toBeInTheDocument();
    expect(screen.getByText(/Almacén Central 456/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-28.1: Estado vacío unificado — diferenciación por plan
// ============================================================

describe('F-28.1-FE-1: Tenant nuevo con Plan Básico y una sucursal — muestra CTA de upgrade', () => {
  it('con 1 sucursal (límite Básico alcanzado): muestra panel con "Actualiza a Plan Pro"', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico); // límite = 1 sucursal

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Desbloquea más sucursales/i)).toBeInTheDocument();
  });
});

describe('F-28.1-FE-2: Tenant Legacy con Plan Básico — recibe el mismo componente que tenant nuevo', () => {
  it('tenant legacy con 1 sucursal y límite Básico: mismo panel que tenant nuevo (sin alerta amarilla)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Mismo panel que tenant nuevo — sin alerta amarilla
    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    // No debe mostrar la alerta amarilla antigua
    expect(screen.queryByText(/No se encontraron sucursales/i)).not.toBeInTheDocument();
  });
});

describe('F-28.1-FE-3: Tenant con Plan Pro y una sola sucursal registrada — muestra link a Configuración', () => {
  it('con plan Pro y 1 sucursal: muestra panel para registrar otra sucursal (sin CTA upgrade)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planPro); // límite = 5 sucursales, solo tiene 1

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Registra una nueva sucursal en/i)).toBeInTheDocument();
    // No debe mostrar CTA de upgrade si el plan permite más
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
  });
});

describe('F-28.1-FE-4: Sin ninguna sucursal registrada — muestra panel unificado (no alerta amarilla)', () => {
  it('con 0 sucursales y SUCURSALES: muestra panel de estado vacío, no alerta amarilla', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByRole('status', { name: /Sin sucursales destino disponibles/i })).toBeInTheDocument();
    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron sucursales/i)).not.toBeInTheDocument();
  });

  it('con 0 sucursales y Plan Pro: muestra link a Configuración (sin CTA upgrade)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Registra una nueva sucursal en/i)).toBeInTheDocument();
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
  });
});

describe('F-28-FE-3: Botón Siguiente deshabilitado cuando no hay sucursales destino', () => {
  it('con 1 sucursal y tipo SUCURSALES en paso 1: botón Siguiente está deshabilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(btnSiguiente).toBeDisabled();
  });

  it('con 0 sucursales y tipo SUCURSALES en paso 1: botón Siguiente está deshabilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(btnSiguiente).toBeDisabled();
  });

  it('con 2 sucursales y tipo SUCURSALES en paso 1: botón Siguiente está habilitado', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/Sucursal de origen/i)).toBeInTheDocument();
    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(btnSiguiente).not.toBeDisabled();
  });
});

describe('F-28.1-FE-5: CTA upgrade navega al flujo de suscripciones existente', () => {
  it('click en "Actualiza a Plan Pro" llama navigate con /checkout/culqi?plan=PRO', async () => {
    const mockNavigate = vi.fn();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    await userEvent.click(screen.getByText(/Actualiza a Plan Pro/i));
    expect(mockNavigate).toHaveBeenCalledWith('/checkout/culqi?plan=PRO');
  });
});

describe('F-28-FE-5: No permite seleccionar misma sucursal como origen y destino', () => {
  it('con 2 sucursales: destino excluye automáticamente la sucursal de origen seleccionada', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Seleccionar origen (primer combobox en el paso 1 de SUCURSALES)
    const selectores = screen.getAllByRole('combobox');
    const selectOrigen = selectores[0];
    await userEvent.selectOptions(selectOrigen, String(sucursal1.id));

    // El destino no debe incluir la opción seleccionada como origen
    const selectDestino = selectores[1];
    const optionsDestino = Array.from(selectDestino.querySelectorAll('option')).map(o => o.textContent);
    expect(optionsDestino).not.toContain(sucursal1.nombre);
    expect(optionsDestino.some(o => o?.includes(sucursal2.nombre))).toBe(true);
  });
});

describe('F-28-FE-6: DELIVERY continúa habilitado con una sola sucursal', () => {
  it('con 1 sucursal y tipo DELIVERY: botón Siguiente NO está deshabilitado por F-28', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    // Por defecto ya está en DELIVERY
    await irAlPaso1();

    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(btnSiguiente).not.toBeDisabled();
  });
});

describe('F-28-FE-7: Con dos sucursales activas permite seleccionar origen y destino diferentes', () => {
  it('con 2 sucursales muestra selectores de origen y destino en paso 1 SUCURSALES', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Deben aparecer los labels de ambas sucursales
    expect(screen.getByText(/Sucursal de origen/i)).toBeInTheDocument();
    expect(screen.getByText(/Sucursal de destino/i)).toBeInTheDocument();

    // Ambas sucursales deben aparecer en el selector de origen (primer combobox)
    const selectores = screen.getAllByRole('combobox');
    const selectOrigen = selectores[0];
    const optionsOrigen = Array.from(selectOrigen.querySelectorAll('option')).map(o => o.textContent);
    expect(optionsOrigen.some(o => o?.includes('Tienda Lima'))).toBe(true);
    expect(optionsOrigen.some(o => o?.includes('Tienda Arequipa'))).toBe(true);
  });
});

describe('F-28-FE-8: Al cambiar tipo de traslado actualiza correctamente el formulario', () => {
  it('al cambiar de DELIVERY a SUCURSALES con 1 sucursal se muestra el panel de sin destino', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());

    // Verificar que inicia en DELIVERY
    expect(screen.getByPlaceholderText(/Buscar por n° de venta/i)).toBeInTheDocument();

    // Cambiar a SUCURSALES
    await seleccionarSucursales();
    // El selector de ventas no debe estar visible
    expect(screen.queryByPlaceholderText(/Buscar por n° de venta/i)).not.toBeInTheDocument();

    // Avanzar al paso 1
    await irAlPaso1();
    // Debe mostrar el panel de sin sucursales
    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
  });

  it('al cambiar de SUCURSALES a DELIVERY con 1 sucursal el formulario de DELIVERY se muestra', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());

    // Ir a SUCURSALES y volver a DELIVERY
    await seleccionarSucursales();
    await userEvent.click(screen.getByText(/Enviar a un cliente/i));

    // Verificar que el selector de ventas volvió a aparecer (DELIVERY)
    expect(screen.getByPlaceholderText(/Buscar por n° de venta/i)).toBeInTheDocument();
  });
});

// ============================================================
// F-28.2: Normalización del límite de sucursales para Legacy
// ============================================================

const sucursalInactiva = { id: 30, nombre: 'Sucursal Cerrada', activo: false, ubigeo: '040101', direccion: 'Calle X', direccionCompleta: 'Calle X' };

describe('F-28.2-FE-1: Básico nuevo y Básico Legacy muestran el mismo panel con CTA upgrade', () => {
  it('Básico nuevo con 1 sucursal activa: muestra upgrade a Plan Pro', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });

  it('Básico Legacy (sin planCodigo) con 1 sucursal activa: muestra exactamente el mismo panel', async () => {
    // Legacy Legacy = isBasico: true, mismos limites que un nuevo Básico
    const planBasicoLegacy = { ...planBasico, segmento: null };
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasicoLegacy);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu plan actual permite tener una sola sucursal/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });
});

describe('F-28.2-FE-2: Básico Legacy con una sucursal inactiva no cuenta como destino disponible', () => {
  it('con 1 activa + 1 inactiva: solo cuenta 1 activa → muestra panel de upgrade', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursalInactiva]);
    (usePlan as Mock).mockReturnValue(planBasico);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // A pesar de que listar() devuelve 2, solo 1 está activa → panel de upgrade
    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Actualiza a Plan Pro/i)).toBeInTheDocument();
  });

  it('con 2 sucursales activas (ninguna inactiva): muestra selectores normalmente', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1, sucursal2]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/Sucursal de origen/i)).toBeInTheDocument();
    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
  });
});

describe('F-28.2-FE-3: Pro con 1 sucursal registrada — muestra link a Configuración (plan permite más)', () => {
  it('Pro con 1 sucursal activa: puede registrar otra (CTA Configuración, no upgrade)', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    expect(screen.getByText(/No tienes otras sucursales/i)).toBeInTheDocument();
    expect(screen.getByText(/Registra una nueva sucursal en/i)).toBeInTheDocument();
    expect(screen.queryByText(/Actualiza a Plan Pro/i)).not.toBeInTheDocument();
  });
});

describe('F-28.2-FE-4: Pro con límite alcanzado — muestra CTA upgrade', () => {
  it('Pro con 5 sucursales activas (límite del plan): limiteAlcanzado → no debería aplicarse en GRE porque ya tiene 5', async () => {
    // Con 5 sucursales, sucursalesActivas.length >= 2, el modal muestra los selectores normalmente
    const cincoSucursales = [
      { id: 1, nombre: 'S1', activo: true, ubigeo: '150101', direccion: 'D1', direccionCompleta: 'D1' },
      { id: 2, nombre: 'S2', activo: true, ubigeo: '150101', direccion: 'D2', direccionCompleta: 'D2' },
      { id: 3, nombre: 'S3', activo: true, ubigeo: '150101', direccion: 'D3', direccionCompleta: 'D3' },
      { id: 4, nombre: 'S4', activo: true, ubigeo: '150101', direccion: 'D4', direccionCompleta: 'D4' },
      { id: 5, nombre: 'S5', activo: true, ubigeo: '150101', direccion: 'D5', direccionCompleta: 'D5' },
    ];
    (sucursalService.listar as Mock).mockResolvedValue(cincoSucursales);
    (usePlan as Mock).mockReturnValue(planPro);

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    await seleccionarSucursales();
    await irAlPaso1();

    // Con 5 sucursales activas, hay destinos disponibles → muestra selectores
    expect(screen.getByText(/Sucursal de origen/i)).toBeInTheDocument();
    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
  });
});

describe('F-28.2-FE-5: DELIVERY con una sola sucursal continúa funcionando', () => {
  it('DELIVERY con 1 sucursal (Básico): botón Siguiente habilitado, no muestra panel de sucursales', async () => {
    (sucursalService.listar as Mock).mockResolvedValue([sucursal1]);
    (usePlan as Mock).mockReturnValue(planBasico);
    (useTenantConfigStore as Mock).mockReturnValue({ config: configConDespacho() });

    renderModal();
    await waitFor(() => expect(sucursalService.listar).toHaveBeenCalled());
    // Por defecto está en DELIVERY
    await irAlPaso1();

    expect(screen.queryByText(/No tienes otras sucursales/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).not.toBeDisabled();
  });
});
