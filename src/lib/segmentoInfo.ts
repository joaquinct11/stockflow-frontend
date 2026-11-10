/**
 * Catálogo de información comercial por segmento.
 * Fuente única de verdad para features, descripciones y etiquetas mostradas
 * en la landing (/landing) y en el dashboard de suscripciones (/dashboard/suscripciones).
 *
 * PRECIOS: no se almacenan aquí; provienen de plan_catalogo vía API.
 * LÍMITES: no se almacenan aquí; provienen de usePlan().limites.
 */

export interface SegmentoInfo {
  /** Nombre comercial (ej: "Farmacias y boticas") */
  title: string;
  /** Descripción breve para la tarjeta de rubro en la landing */
  desc: string;
  /** 3 bullets de diferenciación para la tarjeta marketing de la landing */
  checks: string[];
  /** Chips de etiquetas para la landing */
  tags: string[];
  /** Lista de funcionalidades del plan Básico (tarjeta del dashboard) */
  featuresBasico: string[];
  /** Beneficios adicionales del plan Pro, sin repetir los de Básico */
  featuresPro: string[];
}

/** Funcionalidades ERP base comunes a todos los rubros en el plan Básico */
const BASE_BASICO: string[] = [
  'Punto de Venta (POS) con caja integrada',
  'Inventario en tiempo real con alertas de stock mínimo',
  'Órdenes de compra y recepciones de mercadería',
  'Devoluciones y notas de crédito',
  'Facturación electrónica SUNAT',
  'Reportes + exportación a Excel y PDF',
  'Roles y permisos por usuario',
  'Soporte por WhatsApp en español',
];

/** Beneficios adicionales del plan Pro, comunes a todos los rubros */
const BASE_PRO: string[] = [
  'Todo lo incluido en el plan Básico',
  'Hasta 5 sucursales con stock independiente',
  'Reportes consolidados multi-local',
  'Selector de sucursal en POS y módulos',
  'Límites superiores de usuarios y productos',
];

const SEGMENTO_MAP: Record<string, SegmentoInfo> = {
  FARMACIA_BOTICA: {
    title: 'Farmacias y boticas',
    desc: 'Control de lotes, fechas de vencimiento, registro sanitario, DIGEMID y reporte OPPF mensual automático.',
    checks: [
      'Catálogo DIGEMID con más de 18 000 registros vinculables',
      'Alertas de vencimiento por lote antes de perder mercadería',
      'Reporte OPPF mensual en ZIP, listo para presentar',
    ],
    tags: ['Lotes y vencimientos', 'Registro sanitario', 'DIGEMID', 'OPPF', 'POS', 'Facturación SUNAT'],
    featuresBasico: [
      ...BASE_BASICO,
      'Control de lotes y fechas de vencimiento con alertas',
      'Catálogo DIGEMID con registro sanitario vinculable',
      'Reporte OPPF mensual en ZIP para presentar ante DIGEMID',
    ],
    featuresPro: [...BASE_PRO],
  },

  VETERINARIA: {
    title: 'Clínicas y consultorios veterinarios',
    // Funcionalidades verificadas: MascotaController y CitaController existen.
    // No se mencionan historia clínica, vacunas, recetas ni hospitalización (no implementadas aún).
    desc: 'Registro de mascotas, agenda de citas con profesionales y gestión de medicamentos e insumos.',
    checks: [
      'Ficha por mascota: especie, raza, propietario y notas',
      'Agenda de citas con asignación de profesional',
      'Inventario de medicamentos e insumos con alertas de stock',
    ],
    tags: ['Mascotas', 'Citas', 'Agenda', 'Medicamentos', 'POS', 'Facturación SUNAT'],
    featuresBasico: [
      ...BASE_BASICO,
      'Registro y ficha por mascota (especie, raza, propietario)',
      'Agenda de citas y control de atenciones',
      'Asignación de profesionales por cita',
      'Inventario de medicamentos e insumos veterinarios',
    ],
    featuresPro: [...BASE_PRO],
  },

  TIENDA_ROPA: {
    title: 'Tiendas de ropa',
    desc: 'Gestión por talla y color, control de stock por variante y POS rápido con búsqueda por categoría.',
    checks: [
      'Una ficha por producto, stock separado por variante (talla y color)',
      'Búsqueda por categoría para cobrar sin código de barras',
      'Cambios y devoluciones con nota de crédito aplicable en caja',
    ],
    tags: ['Tallas y colores', 'Variantes', 'Devoluciones', 'POS'],
    featuresBasico: [
      ...BASE_BASICO,
      'Gestión de prendas por talla y color',
      'Stock independiente por variante (talla-color)',
    ],
    featuresPro: [...BASE_PRO],
  },

  TIENDA_BODEGA: {
    title: 'Tiendas y bodegas',
    desc: 'POS rápido con caja integrada, historial diario de ventas, control de proveedores y alertas de stock.',
    checks: [
      'Cobro en segundos con código de barras y vuelto automático',
      'Cierre de caja diario con totales por método de pago',
      'Alertas de stock mínimo para reponer antes de quedarte sin nada',
    ],
    tags: ['POS', 'Caja', 'Alertas de stock', 'Proveedores'],
    featuresBasico: [
      ...BASE_BASICO,
      'Cierre de caja diario con totales por método de pago',
    ],
    featuresPro: [...BASE_PRO],
  },

  FERRETERIA: {
    title: 'Ferreterías y distribuidoras',
    desc: 'OCs a varios proveedores, recepciones parciales, costos de compra actualizados y kardex por producto.',
    checks: [
      'Miles de SKUs con búsqueda instantánea',
      'Recepción parcial cuando el proveedor manda a medias',
      'Kardex valorizado para saber tu margen real',
    ],
    tags: ['Órdenes de compra', 'Recepciones parciales', 'Kardex', 'Costos'],
    featuresBasico: [
      ...BASE_BASICO,
      'Recepciones parciales de órdenes de compra',
      'Kardex valorizado con costos actualizados',
    ],
    featuresPro: [...BASE_PRO],
  },

  MINIMARKET: {
    title: 'Minimarkets',
    desc: 'Manejo de múltiples categorías, POS por código de barras, control de merma y vencimientos.',
    checks: [
      'Varias cajas y turnos, cada uno con su cierre',
      'Ajustes de inventario para registrar merma sin descuadrar',
      'Permisos por usuario: el cajero solo cobra',
    ],
    tags: ['Turnos de caja', 'Merma', 'Categorías', 'Roles'],
    featuresBasico: [
      ...BASE_BASICO,
      'Múltiples turnos de caja con cierre independiente',
      'Ajustes de inventario para registrar merma',
    ],
    featuresPro: [...BASE_PRO],
  },

  ALMACENES: {
    title: 'Almacenes y depósitos',
    desc: 'Movimientos de inventario, kardex completo, ajustes manuales y reportes de valorización de stock.',
    checks: [
      'Ingresos, salidas y traslados con trazabilidad completa',
      'Traslados entre sucursales en el Plan Pro',
      'Valorización de stock para cierres contables',
    ],
    tags: ['Movimientos', 'Traslados', 'Kardex', 'Valorización'],
    featuresBasico: [
      ...BASE_BASICO,
      'Ingresos, salidas y traslados con trazabilidad',
      'Kardex valorizado con reportes de stock',
    ],
    featuresPro: [
      ...BASE_PRO,
      'Traslados de stock entre sucursales',
    ],
  },

  RESTAURANTE: {
    title: 'Restaurantes y cafeterías',
    desc: 'Control de inventario de insumos, órdenes de compra, facturación electrónica y gestión de ventas.',
    checks: [
      'Control de inventario de insumos y mercadería',
      'Órdenes de compra a proveedores con recepciones',
      'Facturación electrónica SUNAT y reportes de ventas',
    ],
    tags: ['Inventario', 'POS', 'Facturación SUNAT'],
    featuresBasico: [...BASE_BASICO],
    featuresPro: [...BASE_PRO],
  },

  EMPRESA_SERVICIOS: {
    title: 'Empresas de servicios',
    desc: 'Facturación electrónica, control de gastos, inventario de insumos y gestión de clientes.',
    checks: [
      'Facturación electrónica SUNAT para servicios',
      'Control de gastos e inventario de insumos',
      'Reportes de ventas y exportación a Excel y PDF',
    ],
    tags: ['Facturación', 'Gastos', 'Clientes'],
    featuresBasico: [...BASE_BASICO],
    featuresPro: [...BASE_PRO],
  },

  OTRO: {
    title: 'Mi negocio',
    desc: 'POS integrado, inventario en tiempo real, facturación electrónica SUNAT y gestión completa de tu negocio.',
    checks: [
      'Punto de Venta con caja e inventario en tiempo real',
      'Facturación electrónica SUNAT integrada',
      'Reportes de ventas exportables a Excel y PDF',
    ],
    tags: ['POS', 'Inventario', 'Facturación SUNAT'],
    featuresBasico: [...BASE_BASICO],
    featuresPro: [...BASE_PRO],
  },
};

/**
 * Extrae el segmento comercial de un planCodigo.
 *   "VETERINARIA_BASICO"  → "VETERINARIA"
 *   "FARMACIA_BOTICA_PRO" → "FARMACIA_BOTICA"
 *   "TIENDA_BODEGA_BASICO"→ "TIENDA_BODEGA"
 *   null / undefined      → null
 */
export function segmentoFromPlanCodigo(planCodigo: string | null | undefined): string | null {
  if (!planCodigo) return null;
  const m = planCodigo.match(/^(.+)_(BASICO|PRO)$/);
  return m ? m[1] : null;
}

/**
 * Devuelve la info comercial del segmento.
 * Fallback explícito a OTRO para suscripciones legado (sin planCodigo)
 * o para segmentos no reconocidos — nunca devuelve undefined.
 */
export function getSegmentoInfo(segmento: string | null | undefined): SegmentoInfo {
  if (!segmento) return SEGMENTO_MAP['OTRO'];
  return SEGMENTO_MAP[segmento] ?? SEGMENTO_MAP['OTRO'];
}

export { SEGMENTO_MAP };
