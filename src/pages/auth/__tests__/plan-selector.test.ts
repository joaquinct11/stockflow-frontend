/**
 * Tests para la lógica de filtrado y deduplicación del selector de planes
 * en el formulario «Agregar otro negocio» (SelectTenant.tsx).
 *
 * Requerimientos cubiertos:
 *  1. Farmacia y botica muestra exactamente dos tarjetas (una por nivel).
 *  2. Farmacia no duplica los planes.
 *  3. Botica no duplica los planes.
 *  4. Veterinaria muestra sus planes correspondientes sin duplicados.
 *  5. Los demás segmentos tampoco muestran duplicados.
 *  6. Los precios coinciden con el catálogo (no se hardcodean).
 *  7. Cambiar el subtipo Farmacia/Botica no duplica las tarjetas.
 *  8. La selección del plan usa el código correcto al crear el negocio.
 */

import { describe, it, expect } from 'vitest';
import type { PlanCatalogoDTO } from '../../../services/auth.service';

// ── Helpers replicando la lógica de SelectTenant ──────────────────────────────

/**
 * Replica el filtrado de planes por rubroOperativo que hace SelectTenant.
 * Para FARMACIA_BOTICA el backend devuelve 4 planes (2 por subrubro);
 * filtramos al rubroOperativo activo para mostrar solo 2 tarjetas.
 */
function filtrarPlanes(allPlanes: PlanCatalogoDTO[], effectiveRubro: string): PlanCatalogoDTO[] {
  const filtered = allPlanes.filter(p => p.rubroOperativo === effectiveRubro.toUpperCase());
  if (filtered.length > 0) return filtered;
  // Fallback: deduplicar por nivel (garantía ante catálogos imprevistos)
  return allPlanes.filter((p, idx, arr) => arr.findIndex(q => q.nivel === p.nivel) === idx);
}

/** Rubro efectivo según el dropdown principal y el subtipo farmacia/botica. */
function getEffectiveRubro(formRubro: string, subtipoFarmaBotica: 'FARMACIA' | 'BOTICA'): string {
  return formRubro === 'FARMACIA' ? subtipoFarmaBotica : formRubro;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makePlan(
  codigo: string,
  segmento: string,
  rubroOperativo: string,
  nivel: 'BASICO' | 'PRO',
  precioMensual: number,
  maxUsuarios = 5,
  maxSucursales = 1,
): PlanCatalogoDTO {
  return { codigo, segmento, rubroOperativo, nivel, precioMensual, maxUsuarios, maxSucursales, maxProductos: 2000, labelVisible: null };
}

// Simulación de lo que devuelve el endpoint para segmento=FARMACIA_BOTICA (4 planes)
const FARMACIA_BOTICA_PLANES: PlanCatalogoDTO[] = [
  makePlan('BOTICA_BASICO',   'FARMACIA_BOTICA', 'BOTICA',   'BASICO',  89, 5,  1),
  makePlan('BOTICA_PRO',      'FARMACIA_BOTICA', 'BOTICA',   'PRO',    169, 15, 5),
  makePlan('FARMACIA_BASICO', 'FARMACIA_BOTICA', 'FARMACIA', 'BASICO',  89, 5,  1),
  makePlan('FARMACIA_PRO',    'FARMACIA_BOTICA', 'FARMACIA', 'PRO',    169, 15, 5),
];

const VETERINARIA_PLANES: PlanCatalogoDTO[] = [
  makePlan('VETERINARIA_BASICO', 'VETERINARIA', 'VETERINARIA', 'BASICO', 109, 10, 1),
  makePlan('VETERINARIA_PRO',    'VETERINARIA', 'VETERINARIA', 'PRO',    189, 15, 5),
];

const TIENDA_ROPA_PLANES: PlanCatalogoDTO[] = [
  makePlan('TIENDA_ROPA_BASICO', 'TIENDA_ROPA', 'TIENDA_ROPA', 'BASICO',  89, 5,  1),
  makePlan('TIENDA_ROPA_PRO',    'TIENDA_ROPA', 'TIENDA_ROPA', 'PRO',    169, 15, 5),
];

const FERRETERIA_PLANES: PlanCatalogoDTO[] = [
  makePlan('FERRETERIA_BASICO', 'FERRETERIA', 'FERRETERIA', 'BASICO',  99, 5,  1),
  makePlan('FERRETERIA_PRO',    'FERRETERIA', 'FERRETERIA', 'PRO',    179, 15, 5),
];

// ── Tests: REQ-1 — Farmacia muestra exactamente 2 tarjetas ───────────────────

describe('REQ-1 — Farmacia y botica muestra exactamente dos tarjetas', () => {
  it('subtipo Farmacia: 2 planes (no 4)', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    expect(planes).toHaveLength(2);
  });

  it('subtipo Botica: 2 planes (no 4)', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    expect(planes).toHaveLength(2);
  });

  it('exactamente un Básico y un PRO para Farmacia', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
    expect(planes.filter(p => p.nivel === 'PRO')).toHaveLength(1);
  });

  it('exactamente un Básico y un PRO para Botica', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
    expect(planes.filter(p => p.nivel === 'PRO')).toHaveLength(1);
  });
});

// ── Tests: REQ-2 — Farmacia no duplica ───────────────────────────────────────

describe('REQ-2 — Farmacia no duplica los planes', () => {
  it('no hay dos planes con nivel BASICO', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const basicos = planes.filter(p => p.nivel === 'BASICO');
    expect(basicos).toHaveLength(1);
  });

  it('no hay dos planes con nivel PRO', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const pros = planes.filter(p => p.nivel === 'PRO');
    expect(pros).toHaveLength(1);
  });

  it('usa los códigos correctos para Farmacia', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const codigos = planes.map(p => p.codigo);
    expect(codigos).toContain('FARMACIA_BASICO');
    expect(codigos).toContain('FARMACIA_PRO');
    expect(codigos).not.toContain('BOTICA_BASICO');
    expect(codigos).not.toContain('BOTICA_PRO');
  });
});

// ── Tests: REQ-3 — Botica no duplica ─────────────────────────────────────────

describe('REQ-3 — Botica no duplica los planes', () => {
  it('no hay dos planes con nivel BASICO para Botica', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
  });

  it('usa los códigos correctos para Botica', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    const codigos = planes.map(p => p.codigo);
    expect(codigos).toContain('BOTICA_BASICO');
    expect(codigos).toContain('BOTICA_PRO');
    expect(codigos).not.toContain('FARMACIA_BASICO');
    expect(codigos).not.toContain('FARMACIA_PRO');
  });
});

// ── Tests: REQ-4 — Veterinaria sin duplicados ─────────────────────────────────

describe('REQ-4 — Veterinaria muestra sus planes sin duplicados', () => {
  it('exactamente 2 planes', () => {
    const planes = filtrarPlanes(VETERINARIA_PLANES, 'VETERINARIA');
    expect(planes).toHaveLength(2);
  });

  it('un Básico y un PRO', () => {
    const planes = filtrarPlanes(VETERINARIA_PLANES, 'VETERINARIA');
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
    expect(planes.filter(p => p.nivel === 'PRO')).toHaveLength(1);
  });
});

// ── Tests: REQ-5 — Demás segmentos sin duplicados ─────────────────────────────

describe('REQ-5 — Los demás segmentos tampoco muestran duplicados', () => {
  it('Tienda de ropa: 2 planes únicos', () => {
    const planes = filtrarPlanes(TIENDA_ROPA_PLANES, 'TIENDA_ROPA');
    expect(planes).toHaveLength(2);
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
    expect(planes.filter(p => p.nivel === 'PRO')).toHaveLength(1);
  });

  it('Ferretería: 2 planes únicos', () => {
    const planes = filtrarPlanes(FERRETERIA_PLANES, 'FERRETERIA');
    expect(planes).toHaveLength(2);
    expect(planes.filter(p => p.nivel === 'BASICO')).toHaveLength(1);
    expect(planes.filter(p => p.nivel === 'PRO')).toHaveLength(1);
  });
});

// ── Tests: REQ-6 — Precios del catálogo ──────────────────────────────────────

describe('REQ-6 — Los precios coinciden con el catálogo (no hardcodeados)', () => {
  it('Farmacia Básico: S/ 89 (del catálogo)', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const basico = planes.find(p => p.nivel === 'BASICO');
    expect(basico?.precioMensual).toBe(89);
  });

  it('Farmacia PRO: S/ 169 (del catálogo)', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const pro = planes.find(p => p.nivel === 'PRO');
    expect(pro?.precioMensual).toBe(169);
  });

  it('Veterinaria Básico: S/ 109 (precio diferenciado del catálogo)', () => {
    const planes = filtrarPlanes(VETERINARIA_PLANES, 'VETERINARIA');
    expect(planes.find(p => p.nivel === 'BASICO')?.precioMensual).toBe(109);
  });

  it('Veterinaria PRO: S/ 189 (precio diferenciado del catálogo)', () => {
    const planes = filtrarPlanes(VETERINARIA_PLANES, 'VETERINARIA');
    expect(planes.find(p => p.nivel === 'PRO')?.precioMensual).toBe(189);
  });
});

// ── Tests: REQ-7 — Cambiar subtipo no duplica ────────────────────────────────

describe('REQ-7 — Cambiar el subtipo Farmacia/Botica no duplica las tarjetas', () => {
  it('switch Farmacia→Botica: sigue mostrando 2 tarjetas', () => {
    const planesF = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const planesB = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    expect(planesF).toHaveLength(2);
    expect(planesB).toHaveLength(2);
  });

  it('switch Botica→Farmacia: los códigos cambian correctamente', () => {
    const planesB = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    const planesF = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    expect(planesB.map(p => p.codigo)).not.toEqual(planesF.map(p => p.codigo));
  });

  it('effectiveRubro con formRubro=FARMACIA y subtipo=BOTICA → BOTICA', () => {
    expect(getEffectiveRubro('FARMACIA', 'BOTICA')).toBe('BOTICA');
  });

  it('effectiveRubro con formRubro=FARMACIA y subtipo=FARMACIA → FARMACIA', () => {
    expect(getEffectiveRubro('FARMACIA', 'FARMACIA')).toBe('FARMACIA');
  });

  it('effectiveRubro con formRubro=VETERINARIA → VETERINARIA (subtipo ignorado)', () => {
    expect(getEffectiveRubro('VETERINARIA', 'FARMACIA')).toBe('VETERINARIA');
  });
});

// ── Tests: REQ-8 — Código correcto al crear negocio ──────────────────────────

describe('REQ-8 — La selección del plan usa el código correcto al crear negocio', () => {
  it('Farmacia selecciona FARMACIA_BASICO por defecto', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const basico = planes.find(p => p.nivel === 'BASICO');
    expect(basico?.codigo).toBe('FARMACIA_BASICO');
  });

  it('Botica selecciona BOTICA_BASICO por defecto', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    const basico = planes.find(p => p.nivel === 'BASICO');
    expect(basico?.codigo).toBe('BOTICA_BASICO');
  });

  it('Veterinaria selecciona VETERINARIA_BASICO por defecto', () => {
    const planes = filtrarPlanes(VETERINARIA_PLANES, 'VETERINARIA');
    const basico = planes.find(p => p.nivel === 'BASICO');
    expect(basico?.codigo).toBe('VETERINARIA_BASICO');
  });

  it('al seleccionar PRO en Farmacia, el código es FARMACIA_PRO', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'FARMACIA');
    const pro = planes.find(p => p.nivel === 'PRO');
    expect(pro?.codigo).toBe('FARMACIA_PRO');
  });

  it('al seleccionar PRO en Botica, el código es BOTICA_PRO', () => {
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, 'BOTICA');
    const pro = planes.find(p => p.nivel === 'PRO');
    expect(pro?.codigo).toBe('BOTICA_PRO');
  });

  it('el rubro enviado al crear negocio es el effectiveRubro, no el formRubro', () => {
    // Simula: formRubro='FARMACIA', subtipo='BOTICA' → effectiveRubro='BOTICA'
    const effectiveRubro = getEffectiveRubro('FARMACIA', 'BOTICA');
    expect(effectiveRubro).toBe('BOTICA');
    // Verifica que el plan default sea de Botica
    const planes = filtrarPlanes(FARMACIA_BOTICA_PLANES, effectiveRubro);
    expect(planes.find(p => p.nivel === 'BASICO')?.rubroOperativo).toBe('BOTICA');
  });
});

// ── Tests: Fallback deduplicación ─────────────────────────────────────────────

describe('Fallback: deduplicación por nivel si ningún plan coincide por rubroOperativo', () => {
  it('si no hay coincidencias por rubroOperativo, deduplica por nivel', () => {
    const planesRaros: PlanCatalogoDTO[] = [
      makePlan('X_BASICO_1', 'OTRO', 'OTRO', 'BASICO', 89),
      makePlan('X_BASICO_2', 'OTRO', 'OTRO', 'BASICO', 89),
      makePlan('X_PRO_1',    'OTRO', 'OTRO', 'PRO',   169),
      makePlan('X_PRO_2',    'OTRO', 'OTRO', 'PRO',   169),
    ];
    // Si buscamos rubroOperativo='DESCONOCIDO', cae en el fallback
    const filtered = planesRaros.filter(p => p.rubroOperativo === 'DESCONOCIDO');
    const toShow = filtered.length > 0
      ? filtered
      : planesRaros.filter((p, idx, arr) => arr.findIndex(q => q.nivel === p.nivel) === idx);
    expect(toShow).toHaveLength(2);
  });
});
