import type { EstadoTributarioGRE, EstadoLogisticoGRE, TipoTrasladoGRE, ModalidadTransporteGRE } from '../../types/gre.types';

export const MOTIVO_TRASLADO_OPTIONS = [
  { value: '01', label: '01 - Venta' },
  { value: '02', label: '02 - Compra' },
  { value: '04', label: '04 - Traslado entre establecimientos' },
  { value: '08', label: '08 - Importación' },
  { value: '09', label: '09 - Exportación' },
  { value: '13', label: '13 - Otros' },
];

export const TIPO_DOC_OPTIONS = [
  { value: '6', label: 'RUC' },
  { value: '1', label: 'DNI' },
  { value: '4', label: 'Carnet ext.' },
  { value: '7', label: 'Pasaporte' },
  { value: '-', label: 'Sin documento' },
];

export const UNIDAD_MEDIDA_OPTIONS = [
  { value: 'NIU', label: 'Unidad (NIU)' },
  { value: 'KGM', label: 'Kilogramo (KGM)' },
  { value: 'LTR', label: 'Litro (LTR)' },
  { value: 'MTR', label: 'Metro (MTR)' },
  { value: 'BX', label: 'Caja (BX)' },
  { value: 'BG', label: 'Bolsa (BG)' },
];

/** Mapea la abreviatura interna de una unidad de medida al código SUNAT para GRE. */
export function abreviaturaToSunat(abreviatura: string | undefined): string {
  if (!abreviatura) return 'NIU';
  const map: Record<string, string> = {
    'UND': 'NIU', 'UNI': 'NIU', 'U': 'NIU', 'TAB': 'NIU', 'CAP': 'NIU', 'AMP': 'NIU',
    'FRA': 'NIU', 'OVU': 'NIU', 'GRA': 'NIU', 'SUP': 'NIU', 'SOB': 'NIU', 'TUB': 'NIU',
    'KG': 'KGM', 'KGS': 'KGM', 'GR': 'GRM', 'GRS': 'GRM', 'GRM': 'GRM', 'MG': 'GRM',
    'L': 'LTR', 'LT': 'LTR', 'LTS': 'LTR', 'ML': 'MLT', 'MLS': 'MLT',
    'M': 'MTR', 'MT': 'MTR', 'MTS': 'MTR',
    'CJA': 'BX', 'CAJA': 'BX', 'BX': 'BX',
    'BOL': 'BG', 'BG': 'BG',
    'BLI': 'NIU', 'BLIS': 'NIU', 'BLIST': 'NIU',
  };
  return map[abreviatura.toUpperCase()] ?? 'NIU';
}

type BadgeVariant = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'orange';

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const cls: Record<BadgeVariant, string> = {
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    green:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    red:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls[variant]}`}>
      {children}
    </span>
  );
}

export function EstadoTributarioBadge({ estado }: { estado: EstadoTributarioGRE }) {
  const map: Record<EstadoTributarioGRE, { label: string; variant: BadgeVariant }> = {
    BORRADOR:  { label: 'Borrador',  variant: 'gray' },
    EMITIENDO: { label: 'Emitiendo', variant: 'yellow' },
    EMITIDA:   { label: 'Emitida',   variant: 'green' },
    ERROR:     { label: 'Error',     variant: 'red' },
    CANCELADA: { label: 'Cancelada', variant: 'orange' },
  };
  const { label, variant } = map[estado] ?? { label: estado, variant: 'gray' as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function EstadoLogisticoBadge({ estado }: { estado: EstadoLogisticoGRE }) {
  const map: Record<EstadoLogisticoGRE, { label: string; variant: BadgeVariant }> = {
    PENDIENTE:   { label: 'Pendiente',    variant: 'gray' },
    EN_TRANSITO: { label: 'En tránsito',  variant: 'blue' },
    RECIBIDA:    { label: 'Recibida',     variant: 'green' },
    CANCELADA:   { label: 'Cancelada',    variant: 'orange' },
  };
  const { label, variant } = map[estado] ?? { label: estado, variant: 'gray' as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function tipoTrasladoLabel(tipo: TipoTrasladoGRE): string {
  return tipo === 'SUCURSALES' ? 'Entre sucursales' : 'Delivery';
}

export function modalidadLabel(m: ModalidadTransporteGRE): string {
  return m === 'PUBLICO' ? 'Público' : 'Privado';
}

export function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
