// Catálogo de iconos SVG (path 24×24) y colores por clave de rubro.
// Cubre tanto los valores de SelectTenant (FARMACIA, TIENDA, TIENDA_ROPA)
// como los segmentos internos de Register (FARMACIA_BOTICA, TIENDA_BODEGA).
export const IC: Record<string, [string, string]> = {
  FARMACIA:          ['M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7', '#00d4aa'],
  BOTICA:            ['M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7', '#00d4aa'],
  FARMACIA_BOTICA:   ['M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7', '#00d4aa'],
  VETERINARIA:       ['M11 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M17 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0M7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0M8.5 15.5c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5c0 1.5 1.5 2 1.5 3.5a2 2 0 0 1-2 2c-1 0-2-.7-3-.7s-2 .7-3 .7a2 2 0 0 1-2-2c0-1.5 1.5-2 1.5-3.5Z', '#ec6fb1'],
  TIENDA_ROPA:       ['M20.4 6.6 16 4a4 4 0 0 1-8 0L3.6 6.6a1 1 0 0 0-.5 1.2l1.4 4a1 1 0 0 0 1 .7H7V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7.5h1.5a1 1 0 0 0 1-.7l1.4-4a1 1 0 0 0-.5-1.2Z', '#8b85ff'],
  TIENDA:            ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10', '#febc2e'],
  TIENDA_BODEGA:     ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10', '#febc2e'],
  FERRETERIA:        ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9Z', '#f5a524'],
  MINIMARKET:        ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0', '#a3e635'],
  RESTAURANTE:       ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7', '#fb923c'],
  EMPRESA_SERVICIOS: ['M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7ZM3.3 7 12 12l8.7-5M12 22V12', '#38bdf8'],
  OTRO:              ['M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1ZM3 9l2-5h14l2 5M10 13h4', '#9898b0'],
};

export interface RubroOption {
  value: string;
  label: string;
}

// Catálogo canónico de 7 rubros comerciales.
// Valores: claves de rubro usadas en SelectTenant (y en el backend como rubro).
// Register usa sus propios valores internos (FARMACIA_BOTICA, TIENDA_BODEGA)
// que resuelven al mismo segmento de plan pero mantienen compatibilidad de tests.
export const RUBROS_CATALOG: RubroOption[] = [
  { value: 'FARMACIA',          label: 'Farmacia y botica' },
  { value: 'VETERINARIA',       label: 'Veterinarias' },
  { value: 'TIENDA_ROPA',       label: 'Tiendas de ropa' },
  { value: 'TIENDA',            label: 'Tiendas y bodegas' },
  { value: 'FERRETERIA',        label: 'Ferreterías' },
  { value: 'MINIMARKET',        label: 'Minimarkets' },
  { value: 'EMPRESA_SERVICIOS', label: 'Empresa de servicios' },
];
