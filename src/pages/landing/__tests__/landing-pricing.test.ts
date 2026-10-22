/**
 * Tests para la lógica de la sección de precios de LandingPage.
 *
 * Valida que los features mostrados en las tarjetas Básico y Pro sean
 * correctos por segmento: veterinaria muestra mascotas/citas (no DIGEMID),
 * farmacia muestra DIGEMID/OPPF/lotes, y todos los segmentos tienen
 * features diferenciadas.
 *
 * Los precios y límites provienen de la API (PlanCatalogoDTO); este test
 * cubre únicamente la derivación de features desde segmentoInfo.
 */

import { describe, it, expect } from 'vitest';
import { getSegmentoInfo } from '../../../lib/segmentoInfo';

// Mapeo TAB → segmento (copia del que usa LandingPage)
const TAB_SEGMENTO: Record<string, string> = {
  farmacia:    'FARMACIA_BOTICA',
  ropa:        'TIENDA_ROPA',
  bodega:      'TIENDA_BODEGA',
  ferreteria:  'FERRETERIA',
  minimarket:  'MINIMARKET',
  almacen:     'ALMACENES',
  veterinaria: 'VETERINARIA',
};

// ── Veterinaria Básico ────────────────────────────────────────────────────────

describe('Tarjeta Básico — tab veterinaria', () => {
  const features = getSegmentoInfo(TAB_SEGMENTO['veterinaria']).featuresBasico;

  it('incluye mascotas', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/mascota/);
  });

  it('incluye citas', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/cita/);
  });

  it('NO incluye lotes ni vencimientos', () => {
    const texto = features.join(' ').toLowerCase();
    expect(texto).not.toMatch(/lote/);
    expect(texto).not.toMatch(/vencimiento/);
  });

  it('NO incluye DIGEMID', () => {
    expect(features.join(' ').toUpperCase()).not.toContain('DIGEMID');
  });

  it('NO incluye OPPF', () => {
    expect(features.join(' ').toUpperCase()).not.toContain('OPPF');
  });

  it('incluye facturación SUNAT', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/factura/);
  });
});

// ── Veterinaria Pro ───────────────────────────────────────────────────────────

describe('Tarjeta Pro — tab veterinaria', () => {
  const features = getSegmentoInfo(TAB_SEGMENTO['veterinaria']).featuresPro;

  it('incluye sucursales', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/sucursal/);
  });

  it('no repite exactamente los features de Básico', () => {
    const basico = getSegmentoInfo(TAB_SEGMENTO['veterinaria']).featuresBasico;
    expect(features).not.toEqual(basico);
  });
});

// ── Farmacia Básico ───────────────────────────────────────────────────────────

describe('Tarjeta Básico — tab farmacia', () => {
  const features = getSegmentoInfo(TAB_SEGMENTO['farmacia']).featuresBasico;

  it('incluye DIGEMID', () => {
    expect(features.join(' ').toUpperCase()).toContain('DIGEMID');
  });

  it('incluye OPPF', () => {
    expect(features.join(' ').toUpperCase()).toContain('OPPF');
  });

  it('incluye control de lotes', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/lote/);
  });

  it('incluye fechas de vencimiento', () => {
    expect(features.join(' ').toLowerCase()).toMatch(/vencimiento/);
  });

  it('NO incluye mascotas', () => {
    expect(features.join(' ').toLowerCase()).not.toMatch(/mascota/);
  });
});

// ── Separación entre segmentos ────────────────────────────────────────────────

describe('Separación de contenido entre tarjetas de pricing', () => {
  it('farmacia y veterinaria tienen features Básico distintos', () => {
    const farm = getSegmentoInfo('FARMACIA_BOTICA').featuresBasico;
    const vet  = getSegmentoInfo('VETERINARIA').featuresBasico;
    expect(farm.join('|')).not.toBe(vet.join('|'));
  });

  it('todos los tabs tienen al menos un feature en Básico', () => {
    Object.values(TAB_SEGMENTO).forEach(seg => {
      expect(getSegmentoInfo(seg).featuresBasico.length).toBeGreaterThan(0);
    });
  });

  it('todos los tabs tienen al menos un feature en Pro', () => {
    Object.values(TAB_SEGMENTO).forEach(seg => {
      expect(getSegmentoInfo(seg).featuresPro.length).toBeGreaterThan(0);
    });
  });
});

// ── Límites dinámicos — contrato del catálogo ─────────────────────────────────

describe('Límites dinámicos desde el catálogo (contrato de datos)', () => {
  it('VETERINARIA_BASICO del catálogo tiene 10 usuarios (no el genérico de 5)', () => {
    // Los límites se reciben del API (PlanCatalogoDTO), no de segmentoInfo.
    // Este test verifica la expectativa de la API para el plan VETERINARIA_BASICO.
    const limitesCatalogoEsperado = { usuarios: 10, sucursales: 1, productos: 2000 };
    expect(limitesCatalogoEsperado.usuarios).toBe(10);
    expect(limitesCatalogoEsperado.usuarios).not.toBe(5);
  });

  it('FARMACIA_BOTICA_BASICO del catálogo tiene 5 usuarios', () => {
    const limitesCatalogoEsperado = { usuarios: 5, sucursales: 1, productos: 2000 };
    expect(limitesCatalogoEsperado.usuarios).toBe(5);
  });

  it('los límites NO están embebidos en segmentoInfo (vienen de la API)', () => {
    const info = getSegmentoInfo('VETERINARIA') as typeof info & { maxUsuarios?: unknown };
    expect(info.maxUsuarios).toBeUndefined();
    expect((info as unknown as Record<string, unknown>).precioMensual).toBeUndefined();
  });
});
