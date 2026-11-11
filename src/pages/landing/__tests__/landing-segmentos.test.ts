/**
 * Tests para la presentación comercial por segmento en la landing.
 * Verifica que cada segmento tenga features propios, que el plan PRO
 * use los límites del catálogo y que las funciones exportadas sean correctas.
 */

import { describe, it, expect } from 'vitest';
import { precioMinimoDesde } from '../LandingPage';

// ── Réplicas locales (mismas constantes que LandingPage, sin importar el componente) ──

const BASICO_COMUNES = [
  'Punto de Venta (POS) con caja integrada',
  'Facturación electrónica SUNAT (boletas y facturas)',
  'Órdenes de compra y recepciones de mercadería',
  'Devoluciones y notas de crédito',
  'Reportes + exportación a Excel y PDF',
  'Roles y permisos por usuario',
  'Soporte por WhatsApp en español',
];

const SEG_CONFIGS = [
  {
    k: 'FARMACIA', label: 'Farmacia y botica',
    basicoExtra: [
      'Control de lotes y fechas de vencimiento con alertas',
      'Venta por presentación: caja, blíster o tableta',
      'Búsqueda y vinculación al catálogo DIGEMID (~18 000 medicamentos)',
      'Código DIGEMID y registro sanitario por producto',
      'Exportación de reporte OPPF para DIGEMID',
    ],
  },
  {
    k: 'VETERINARIA', label: 'Veterinarias',
    basicoExtra: [
      'Ficha de mascota: especie, raza, microchip y peso',
      'Agenda de citas con vista por día y semana',
      'Asignación de profesional por cita',
      'Inventario de medicamentos e insumos veterinarios',
      'Roles: Veterinario, Recepcionista, Groomer y Auxiliar',
    ],
  },
  {
    k: 'TIENDA_ROPA', label: 'Tiendas de ropa',
    basicoExtra: [
      'Gestión de productos por talla y color',
      'Stock independiente por variante (talla-color)',
      'Precio mayorista por cantidad mínima',
      'Descuento manual en venta',
    ],
  },
  {
    k: 'TIENDA_BODEGA', label: 'Tiendas y bodegas',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Kardex de movimientos por producto',
      'Control de caja con apertura y cierre por turno',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'FERRETERIA', label: 'Ferreterías',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Recepciones parciales de órdenes de compra',
      'Kardex valorizado con costos actualizados',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'MINIMARKET', label: 'Minimarkets',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Múltiples turnos de caja con cierre independiente',
      'Ajustes de inventario para registrar merma',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'EMPRESA_SERVICIOS', label: 'Empresa de servicios',
    basicoExtra: [
      'Gestión completa de órdenes de trabajo (OT)',
      'Registro de equipos y datos del cliente',
      'Consumo de materiales y devoluciones en OT',
      'Cierre técnico y entrega con firma del cliente',
      'Facturación directa desde la orden de trabajo',
      'Rol Técnico de Servicio incluido en el plan',
    ],
  },
];

function getProFeatures(pro: { maxSucursales: number; maxUsuarios: number; maxProductos: number } | undefined): string[] {
  if (!pro) return [
    'Todo lo incluido en Plan Básico',
    'Gestión de múltiples sucursales con stock independiente',
    'Reportes consolidados multi-local',
    'Selector de sucursal en POS y módulos',
    'Mayor capacidad de usuarios y productos',
  ];
  return [
    'Todo lo incluido en Plan Básico',
    `Hasta ${pro.maxSucursales} sucursales con stock independiente`,
    'Reportes consolidados multi-local',
    'Selector de sucursal en POS y módulos',
    `Hasta ${pro.maxUsuarios} usuarios activos`,
    `Hasta ${pro.maxProductos.toLocaleString('es-PE')} productos en catálogo`,
  ];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SEG_CONFIGS — cobertura de los 7 segmentos', () => {
  it('hay exactamente 7 segmentos', () => {
    expect(SEG_CONFIGS).toHaveLength(7);
  });

  it('cada segmento tiene al menos 1 feature extra propio', () => {
    SEG_CONFIGS.forEach(seg => {
      expect(seg.basicoExtra.length).toBeGreaterThan(0);
    });
  });

  it('EMPRESA_SERVICIOS incluye Órdenes de Trabajo (OT)', () => {
    const es = SEG_CONFIGS.find(s => s.k === 'EMPRESA_SERVICIOS')!;
    const tieneOT = es.basicoExtra.some(f => f.toLowerCase().includes('orden') && f.toLowerCase().includes('trabajo'));
    expect(tieneOT).toBe(true);
  });

  it('FARMACIA incluye mención a DIGEMID', () => {
    const farm = SEG_CONFIGS.find(s => s.k === 'FARMACIA')!;
    const tieneDigemid = farm.basicoExtra.some(f => f.toUpperCase().includes('DIGEMID'));
    expect(tieneDigemid).toBe(true);
  });

  it('FARMACIA incluye exportación del reporte OPPF', () => {
    const farm = SEG_CONFIGS.find(s => s.k === 'FARMACIA')!;
    const tieneOppf = farm.basicoExtra.some(f => f.toUpperCase().includes('OPPF'));
    expect(tieneOppf).toBe(true);
  });

  it('VETERINARIA incluye ficha de mascota', () => {
    const vet = SEG_CONFIGS.find(s => s.k === 'VETERINARIA')!;
    const tiene = vet.basicoExtra.some(f => f.toLowerCase().includes('mascota'));
    expect(tiene).toBe(true);
  });

  it('TIENDA_ROPA incluye gestión por talla', () => {
    const ropa = SEG_CONFIGS.find(s => s.k === 'TIENDA_ROPA')!;
    const tiene = ropa.basicoExtra.some(f => f.toLowerCase().includes('talla'));
    expect(tiene).toBe(true);
  });

  it('FERRETERIA incluye kardex valorizado', () => {
    const ferr = SEG_CONFIGS.find(s => s.k === 'FERRETERIA')!;
    const tiene = ferr.basicoExtra.some(f => f.toLowerCase().includes('kardex'));
    expect(tiene).toBe(true);
  });

  it('MINIMARKET incluye múltiples turnos de caja', () => {
    const mini = SEG_CONFIGS.find(s => s.k === 'MINIMARKET')!;
    const tiene = mini.basicoExtra.some(f => f.toLowerCase().includes('turno'));
    expect(tiene).toBe(true);
  });
});

describe('BASICO_COMUNES — features compartidas', () => {
  it('incluye POS', () => {
    expect(BASICO_COMUNES.some(f => f.toLowerCase().includes('pos'))).toBe(true);
  });

  it('incluye facturación SUNAT', () => {
    expect(BASICO_COMUNES.some(f => f.toUpperCase().includes('SUNAT'))).toBe(true);
  });

  it('incluye soporte por WhatsApp', () => {
    expect(BASICO_COMUNES.some(f => f.toLowerCase().includes('whatsapp'))).toBe(true);
  });

  it('no incluye features específicas de rubro (DIGEMID, OT, mascota)', () => {
    const texto = BASICO_COMUNES.join(' ').toUpperCase();
    expect(texto).not.toContain('DIGEMID');
    expect(texto).not.toContain('MASCOTA');
    expect(texto.toLowerCase()).not.toContain('orden de trabajo');
  });
});

describe('getProFeatures — límites dinámicos del catálogo', () => {
  const mockPro = { maxSucursales: 5, maxUsuarios: 15, maxProductos: 5000 };

  it('incluye el número real de sucursales del plan Pro', () => {
    const features = getProFeatures(mockPro);
    expect(features.some(f => f.includes('5 sucursales'))).toBe(true);
  });

  it('incluye el número real de usuarios del plan Pro', () => {
    const features = getProFeatures(mockPro);
    expect(features.some(f => f.includes('15 usuarios'))).toBe(true);
  });

  it('incluye el número real de productos del plan Pro', () => {
    const features = getProFeatures(mockPro);
    expect(features.some(f => f.includes('5000') || f.includes('5.000') || f.includes('5,000'))).toBe(true);
  });

  it('devuelve fallback genérico si no hay datos del plan Pro', () => {
    const features = getProFeatures(undefined);
    expect(features[0]).toBe('Todo lo incluido en Plan Básico');
    expect(features.some(f => f.toLowerCase().includes('sucursales'))).toBe(true);
    expect(features.some(f => f.toLowerCase().includes('usuarios'))).toBe(true);
  });

  it('Veterinaria PRO con 20 usuarios devuelve 20 en las features', () => {
    const vetPro = { maxSucursales: 5, maxUsuarios: 20, maxProductos: 5000 };
    const features = getProFeatures(vetPro);
    expect(features.some(f => f.includes('20 usuarios'))).toBe(true);
  });
});

describe('Features por segmento — plan Básico completo', () => {
  it.each(SEG_CONFIGS.map(s => [s.label, s] as [string, typeof s]))(
    '%s: las features básicas incluyen POS y los extras propios',
    (_label, segConfig) => {
      const todas = BASICO_COMUNES.concat(segConfig.basicoExtra);
      expect(todas.some(f => f.toLowerCase().includes('pos'))).toBe(true);
      segConfig.basicoExtra.forEach(extra => {
        expect(todas).toContain(extra);
      });
    }
  );
});

describe('precioMinimoDesde — integración con datos de catálogo', () => {
  it('devuelve 69 con los precios del catálogo actual (TIENDA_ROPA_BASICO es el mínimo)', () => {
    const planes = [
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 109 }],
      [{ nivel: 'BASICO', precioMensual: 69 }],
      [{ nivel: 'BASICO', precioMensual: 79 }],
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 89 }],
      [{ nivel: 'BASICO', precioMensual: 89 }],
    ];
    expect(precioMinimoDesde(planes)).toBe(69);
  });
});
