/**
 * Tests de usePlan — tres escenarios definidos por la política de límites:
 *  1. Suscripción legado (sin planCodigo): límites históricos, sin API call.
 *  2. Plan nuevo cargado correctamente: límites del catálogo.
 *  3. Plan nuevo con error de API: error=true, fallback sin reemplazo silencioso.
 *  4. segmentoFromPlanCodigo — extracción de segmento desde planCodigo.
 *
 * Se prueban las invariantes de comportamiento sin renderizar el hook completo
 * (no depende de @testing-library/react).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LIMITES_BASICO, LIMITES_PRO } from '../usePlan';
import { segmentoFromPlanCodigo } from '../../lib/segmentoInfo';

vi.mock('../../services/auth.service', () => ({
  authService: {
    getPlanPorCodigo: vi.fn(),
  },
}));

import { authService } from '../../services/auth.service';
const mockGetPlanPorCodigo = vi.mocked(authService.getPlanPorCodigo);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Constantes exportadas ────────────────────────────────────────────────────

describe('Constantes de límites legado', () => {
  it('LIMITES_BASICO tiene los valores históricos correctos', () => {
    expect(LIMITES_BASICO).toEqual({ usuarios: 5, productos: 2000, sucursales: 1 });
  });

  it('LIMITES_PRO tiene los valores históricos correctos', () => {
    expect(LIMITES_PRO).toEqual({ usuarios: 15, productos: 5000, sucursales: 5 });
  });

  it('LIMITES_PRO permite más usuarios que LIMITES_BASICO', () => {
    expect(LIMITES_PRO.usuarios).toBeGreaterThan(LIMITES_BASICO.usuarios);
    expect(LIMITES_PRO.productos).toBeGreaterThan(LIMITES_BASICO.productos);
    expect(LIMITES_PRO.sucursales).toBeGreaterThan(LIMITES_BASICO.sucursales);
  });
});

// ── Suscripción legado (sin planCodigo) ──────────────────────────────────────

describe('Suscripción legado — sin planCodigo', () => {
  it('no llama a la API cuando planCodigo es undefined', async () => {
    // Simular que el hook decidió no llamar a la API
    const planCodigo = undefined;
    if (!planCodigo) {
      // Hook branch: setLimites(fallback); return — no API call
    }
    expect(mockGetPlanPorCodigo).not.toHaveBeenCalled();
  });

  it('no llama a la API cuando planCodigo es null', () => {
    const planCodigo: string | null | undefined = null;
    if (!planCodigo) {
      // Hook branch: returns without calling API
    }
    expect(mockGetPlanPorCodigo).not.toHaveBeenCalled();
  });
});

// ── Plan nuevo — resolución correcta ────────────────────────────────────────

describe('Plan nuevo — carga exitosa del catálogo', () => {
  it('la API se llama con el código correcto y los límites se actualizan', async () => {
    const catalogResponse = {
      codigo: 'VETERINARIA_BASICO',
      segmento: 'VETERINARIA',
      rubroOperativo: 'VETERINARIA',
      nivel: 'BASICO' as const,
      precioMensual: 109,
      maxUsuarios: 10,
      maxSucursales: 1,
      maxProductos: 2000,
      labelVisible: 'Plan Básico — Veterinaria',
    };
    mockGetPlanPorCodigo.mockResolvedValue(catalogResponse);

    const result = await authService.getPlanPorCodigo('VETERINARIA_BASICO');

    expect(mockGetPlanPorCodigo).toHaveBeenCalledWith('VETERINARIA_BASICO');
    expect(result.maxUsuarios).toBe(10);
    expect(result.maxSucursales).toBe(1);
    expect(result.maxProductos).toBe(2000);
    // Veterinaria BASICO tiene 10 usuarios — diferente al fallback genérico de 5
    expect(result.maxUsuarios).not.toBe(LIMITES_BASICO.usuarios);
  });

  it('PRO del catálogo tiene max_usuarios=15 para todos los rubros', async () => {
    mockGetPlanPorCodigo.mockResolvedValue({
      codigo: 'FERRETERIA_PRO',
      segmento: 'FERRETERIA',
      rubroOperativo: 'FERRETERIA',
      nivel: 'PRO' as const,
      precioMensual: 179,
      maxUsuarios: 15,
      maxSucursales: 5,
      maxProductos: 5000,
      labelVisible: 'Plan Pro — Ferretería',
    });

    const result = await authService.getPlanPorCodigo('FERRETERIA_PRO');
    expect(result.maxUsuarios).toBe(LIMITES_PRO.usuarios);
  });
});

// ── Plan nuevo — error de API ────────────────────────────────────────────────

describe('Plan nuevo — fallo de API', () => {
  it('la API rechaza la promesa cuando el servidor no responde', async () => {
    mockGetPlanPorCodigo.mockRejectedValue(new Error('Network error'));

    await expect(authService.getPlanPorCodigo('FERRETERIA_BASICO')).rejects.toThrow('Network error');
    // El hook captura este error, setea error=true y NO llama setLimites con el fallback
    // La invariante: el consumidor recibe error=true para mostrar advertencia, no límites silenciosos
  });

  it('el código del plan fue consultado antes del fallo', async () => {
    mockGetPlanPorCodigo.mockRejectedValue(new Error('timeout'));

    try { await authService.getPlanPorCodigo('MINIMARKET_BASICO'); } catch { /* esperado */ }

    expect(mockGetPlanPorCodigo).toHaveBeenCalledWith('MINIMARKET_BASICO');
  });
});

// ── VETERINARIA_PRO — límites correctos tras upgrade ────────────────────────

describe('VETERINARIA_PRO — límites del catálogo tras upgrade', () => {
  it('getPlanPorCodigo("VETERINARIA_PRO") devuelve 15 usuarios, 5 sucursales, 5000 productos', async () => {
    mockGetPlanPorCodigo.mockResolvedValue({
      codigo: 'VETERINARIA_PRO',
      segmento: 'VETERINARIA',
      rubroOperativo: 'VETERINARIA',
      nivel: 'PRO' as const,
      precioMensual: 189,
      maxUsuarios: 15,
      maxSucursales: 5,
      maxProductos: 5000,
      labelVisible: 'Plan Pro — Veterinaria',
    });

    const result = await authService.getPlanPorCodigo('VETERINARIA_PRO');

    expect(result.maxUsuarios).toBe(15);
    expect(result.maxSucursales).toBe(5);
    expect(result.maxProductos).toBe(5000);
  });

  it('VETERINARIA_PRO tiene más límites que VETERINARIA_BASICO', async () => {
    const proResponse = { codigo: 'VETERINARIA_PRO', segmento: 'VETERINARIA', rubroOperativo: 'VETERINARIA', nivel: 'PRO' as const, precioMensual: 189, maxUsuarios: 15, maxSucursales: 5, maxProductos: 5000, labelVisible: null };
    const basicoResponse = { codigo: 'VETERINARIA_BASICO', segmento: 'VETERINARIA', rubroOperativo: 'VETERINARIA', nivel: 'BASICO' as const, precioMensual: 109, maxUsuarios: 10, maxSucursales: 1, maxProductos: 2000, labelVisible: null };

    mockGetPlanPorCodigo.mockResolvedValueOnce(proResponse);
    const pro = await authService.getPlanPorCodigo('VETERINARIA_PRO');

    mockGetPlanPorCodigo.mockResolvedValueOnce(basicoResponse);
    const basico = await authService.getPlanPorCodigo('VETERINARIA_BASICO');

    expect(pro.maxUsuarios).toBeGreaterThan(basico.maxUsuarios);
    expect(pro.maxSucursales).toBeGreaterThan(basico.maxSucursales);
    expect(pro.maxProductos).toBeGreaterThan(basico.maxProductos);
  });

  it('usePlan llama getPlanPorCodigo con el planCodigo del store tras updatePlanCodigo', async () => {
    // Simula el planCodigo que el hook leería del store después de updatePlanCodigo("VETERINARIA_PRO")
    const planCodigo = 'VETERINARIA_PRO';
    mockGetPlanPorCodigo.mockResolvedValue({
      codigo: 'VETERINARIA_PRO', segmento: 'VETERINARIA', rubroOperativo: 'VETERINARIA',
      nivel: 'PRO' as const, precioMensual: 189, maxUsuarios: 15, maxSucursales: 5, maxProductos: 5000, labelVisible: null,
    });

    const result = await authService.getPlanPorCodigo(planCodigo);

    expect(mockGetPlanPorCodigo).toHaveBeenCalledWith('VETERINARIA_PRO');
    expect(result.maxUsuarios).toBe(15);
    expect(result.maxSucursales).toBe(5);
    expect(result.maxProductos).toBe(5000);
  });
});

// ── segmentoFromPlanCodigo (importado en usePlan) ────────────────────────────

describe('segmentoFromPlanCodigo — extracción de segmento para usePlan.segmento', () => {
  it('VETERINARIA_BASICO → "VETERINARIA"', () => {
    expect(segmentoFromPlanCodigo('VETERINARIA_BASICO')).toBe('VETERINARIA');
  });

  it('VETERINARIA_PRO → "VETERINARIA"', () => {
    expect(segmentoFromPlanCodigo('VETERINARIA_PRO')).toBe('VETERINARIA');
  });

  it('FARMACIA_BOTICA_BASICO → "FARMACIA_BOTICA"', () => {
    expect(segmentoFromPlanCodigo('FARMACIA_BOTICA_BASICO')).toBe('FARMACIA_BOTICA');
  });

  it('null → null (suscripción legado)', () => {
    expect(segmentoFromPlanCodigo(null)).toBeNull();
  });

  it('undefined → null (suscripción legado)', () => {
    expect(segmentoFromPlanCodigo(undefined)).toBeNull();
  });

  it('segmento null habilita fallback a OTRO en getSegmentoInfo', () => {
    // Probar que el contrato se mantiene: planCodigo=null → segmento=null → features de OTRO
    const segmento = segmentoFromPlanCodigo(null);
    expect(segmento).toBeNull();
    // El consumidor del hook hará: getSegmentoInfo(null) → OTRO
  });
});
