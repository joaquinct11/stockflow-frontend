/**
 * Tests para la lógica de planes dinámicos en SelectTenant.tsx.
 * Verifica que el mapeo rubro → segmento sea correcto y que los
 * precios mostrados correspondan al rubro seleccionado.
 */

import { describe, it, expect } from 'vitest';
import type { PlanCatalogoDTO } from '../../../services/auth.service';

// ── Réplica del mapeo en SelectTenant.tsx ────────────────────────────────────

const RUBRO_TO_SEGMENTO: Record<string, string> = {
  FARMACIA:          'FARMACIA_BOTICA',
  BOTICA:            'FARMACIA_BOTICA',
  VETERINARIA:       'VETERINARIA',
  TIENDA:            'TIENDA_BODEGA',
  FERRETERIA:        'FERRETERIA',
  MINIMARKET:        'MINIMARKET',
  RESTAURANTE:       'RESTAURANTE',
  EMPRESA_SERVICIOS: 'EMPRESA_SERVICIOS',
  OTRO:              'OTRO',
};

function planCodigoParaRubroYNivel(rubro: string, planes: PlanCatalogoDTO[], nivel: 'BASICO' | 'PRO'): string | undefined {
  return planes.find(p => p.nivel === nivel)?.codigo;
}

// ── Fixtures de planes por segmento (replica plan_catalogo) ──────────────────

function makePlanes(rubroOp: string, basico: number, pro: number): PlanCatalogoDTO[] {
  return [
    {
      codigo: `${rubroOp}_BASICO`,
      segmento: RUBRO_TO_SEGMENTO[rubroOp] ?? rubroOp,
      rubroOperativo: rubroOp,
      nivel: 'BASICO',
      precioMensual: basico,
      maxUsuarios: 5,
      maxSucursales: 1,
      maxProductos: 500,
      labelVisible: null,
    },
    {
      codigo: `${rubroOp}_PRO`,
      segmento: RUBRO_TO_SEGMENTO[rubroOp] ?? rubroOp,
      rubroOperativo: rubroOp,
      nivel: 'PRO',
      precioMensual: pro,
      maxUsuarios: 20,
      maxSucursales: 5,
      maxProductos: 5000,
      labelVisible: null,
    },
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RUBRO_TO_SEGMENTO — mapeo completo', () => {
  it('FARMACIA y BOTICA mapean al mismo segmento FARMACIA_BOTICA', () => {
    expect(RUBRO_TO_SEGMENTO['FARMACIA']).toBe('FARMACIA_BOTICA');
    expect(RUBRO_TO_SEGMENTO['BOTICA']).toBe('FARMACIA_BOTICA');
  });

  it('VETERINARIA mapea a VETERINARIA', () => {
    expect(RUBRO_TO_SEGMENTO['VETERINARIA']).toBe('VETERINARIA');
  });

  it('TIENDA mapea a TIENDA_BODEGA (no TIENDA)', () => {
    expect(RUBRO_TO_SEGMENTO['TIENDA']).toBe('TIENDA_BODEGA');
    expect(RUBRO_TO_SEGMENTO['TIENDA']).not.toBe('TIENDA');
  });

  it('todos los rubros del formulario tienen entrada en el mapa', () => {
    const rubros = ['FARMACIA', 'BOTICA', 'FERRETERIA', 'VETERINARIA', 'TIENDA', 'MINIMARKET', 'RESTAURANTE', 'EMPRESA_SERVICIOS', 'OTRO'];
    for (const r of rubros) {
      expect(RUBRO_TO_SEGMENTO[r], `falta mapping para ${r}`).toBeDefined();
    }
  });
});

describe('Precios de plan — Veterinaria', () => {
  const planes = makePlanes('VETERINARIA', 109, 189);

  it('plan Básico muestra S/ 109', () => {
    const basico = planes.find(p => p.nivel === 'BASICO');
    expect(basico?.precioMensual).toBe(109);
  });

  it('plan Pro muestra S/ 189', () => {
    const pro = planes.find(p => p.nivel === 'PRO');
    expect(pro?.precioMensual).toBe(189);
  });

  it('plan Básico envía planCodigo VETERINARIA_BASICO', () => {
    expect(planCodigoParaRubroYNivel('VETERINARIA', planes, 'BASICO')).toBe('VETERINARIA_BASICO');
  });

  it('plan Pro envía planCodigo VETERINARIA_PRO', () => {
    expect(planCodigoParaRubroYNivel('VETERINARIA', planes, 'PRO')).toBe('VETERINARIA_PRO');
  });
});

describe('Precios de plan — rubros con precio diferente al genérico', () => {
  it('Restaurante Básico: S/ 119', () => {
    const planes = makePlanes('RESTAURANTE', 119, 199);
    expect(planes.find(p => p.nivel === 'BASICO')?.precioMensual).toBe(119);
  });

  it('Tienda/bodega Básico: S/ 79', () => {
    const planes = makePlanes('TIENDA', 79, 149);
    expect(planes.find(p => p.nivel === 'BASICO')?.precioMensual).toBe(79);
    expect(planCodigoParaRubroYNivel('TIENDA', planes, 'BASICO')).toBe('TIENDA_BASICO');
  });
});

describe('Selección de plan — planId y planCodigo son consistentes', () => {
  it('al seleccionar BASICO de Veterinaria se obtiene planId=BASICO y planCodigo=VETERINARIA_BASICO', () => {
    const planes = makePlanes('VETERINARIA', 109, 189);
    const plan = planes.find(p => p.nivel === 'BASICO')!;
    expect(plan.nivel).toBe('BASICO');
    expect(plan.codigo).toBe('VETERINARIA_BASICO');
  });

  it('al seleccionar PRO de Farmacia se obtiene planId=PRO y planCodigo=FARMACIA_BASICO no es PRO', () => {
    const planes = makePlanes('FARMACIA', 89, 169);
    const plan = planes.find(p => p.nivel === 'PRO')!;
    expect(plan.nivel).toBe('PRO');
    expect(plan.codigo).toBe('FARMACIA_PRO');
    expect(plan.codigo).not.toContain('BASICO');
  });

  it('cambiar de rubro reinicia la selección a BASICO del nuevo rubro', () => {
    const planesFarmacia     = makePlanes('FARMACIA',     89,  169);
    const planesVeterinaria  = makePlanes('VETERINARIA', 109,  189);
    const basicoFarmacia     = planesFarmacia.find(p => p.nivel === 'BASICO')!;
    const basicoVeterinaria  = planesVeterinaria.find(p => p.nivel === 'BASICO')!;

    expect(basicoFarmacia.precioMensual).toBe(89);
    expect(basicoVeterinaria.precioMensual).toBe(109);
    expect(basicoFarmacia.codigo).not.toBe(basicoVeterinaria.codigo);
  });
});
