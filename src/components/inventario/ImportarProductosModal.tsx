import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import axiosInstance from '../../api/axios.config';
import { API_ENDPOINTS } from '../../api/endpoints';
import { categoriaService } from '../../services/categoria.service';
import toast from 'react-hot-toast';

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F3F6', surface3: '#FAFBFC',
  text: '#0D1117', text2: '#525C6B', text3: '#6B7280',
  primary: '#3B47EF', primarySoft: '#EEF0FF', primaryLine: '#CFD4FD',
  line: '#E4E7EC', lineSoft: '#EEF0F4',
  ok: '#0F9D6E', okSoft: '#E7F7F1', okLine: '#C3EAD8',
  bad: '#D63B3B', badSoft: '#FDECEB', badLine: '#F9C7C6',
  warn: '#B7791F', warnSoft: '#FDF6E7', warnLine: '#F0DFB4',
};

if (typeof document !== 'undefined' && !document.getElementById('fx-imp-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-imp-kf';
  s.textContent = `@keyframes fx-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}`;
  document.head.appendChild(s);
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProductoImportRow {
  nombre: string;
  codigoBarras?: string;
  categoria?: string;
  precioVenta: number;
  costoUnitario?: number;
  stockActual?: number;
  stockMinimo?: number;
  stockMaximo?: number;
  unidadMedida?: string;
  lote?: string;
  fechaVencimiento?: string;
  registroSanitario?: string;
  proveedorNombre?: string;
  talla?: string;
  color?: string;
  skuVariante?: string;
  stockVariante?: number;
  stockMinimoVariante?: number;
}

interface FilaError {
  fila: number;
  nombre: string;
  motivo: string;
}

interface ImportResult {
  total: number;
  creados: number;
  actualizados: number;
  errores: number;
  filaErrores: FilaError[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unidadesMedida?: { nombre: string }[];
  sucursalId?: number;
  rubro?: string;
}

// ── Helpers de rubro ──────────────────────────────────────────────────────────

function esFarmaciaRubro(rubro?: string) { return rubro === 'FARMACIA' || rubro === 'BOTICA'; }
function esTiendaRubro(rubro?: string)   { return rubro === 'TIENDA_ROPA'; }

// ── Mapeo flexible de columnas ────────────────────────────────────────────────

const COLUMN_MAP: Record<string, keyof ProductoImportRow> = {
  nombre: 'nombre', name: 'nombre', producto: 'nombre',
  codigo_barras: 'codigoBarras', codigobarras: 'codigoBarras',
  codigo: 'codigoBarras', barcode: 'codigoBarras', sku: 'codigoBarras',
  categoria: 'categoria', category: 'categoria',
  precio_venta: 'precioVenta', precioventa: 'precioVenta',
  precio: 'precioVenta', price: 'precioVenta',
  costo_unitario: 'costoUnitario', costounitario: 'costoUnitario',
  costo: 'costoUnitario', cost: 'costoUnitario',
  stock_actual: 'stockActual', stockactual: 'stockActual',
  stock: 'stockActual', cantidad: 'stockActual',
  stock_minimo: 'stockMinimo', stockminimo: 'stockMinimo',
  stock_min: 'stockMinimo', minimo: 'stockMinimo',
  stock_maximo: 'stockMaximo', stockmaximo: 'stockMaximo',
  stock_max: 'stockMaximo', maximo: 'stockMaximo',
  unidad_medida: 'unidadMedida', unidadmedida: 'unidadMedida',
  unidad: 'unidadMedida', unit: 'unidadMedida', um: 'unidadMedida',
  lote: 'lote', numero_lote: 'lote', num_lote: 'lote', nro_lote: 'lote', batch: 'lote', lot: 'lote',
  fecha_vencimiento: 'fechaVencimiento', fechavencimiento: 'fechaVencimiento',
  vencimiento: 'fechaVencimiento', vence: 'fechaVencimiento', expiry: 'fechaVencimiento',
  fecha_venc: 'fechaVencimiento', fechavenc: 'fechaVencimiento', expiration: 'fechaVencimiento',
  registro_sanitario: 'registroSanitario', registrosanitario: 'registroSanitario',
  rs: 'registroSanitario', reg_san: 'registroSanitario', regsanitario: 'registroSanitario',
  reg_sanitario: 'registroSanitario',
  proveedor: 'proveedorNombre', proveedor_nombre: 'proveedorNombre', proveedornombre: 'proveedorNombre',
  supplier: 'proveedorNombre', provider: 'proveedorNombre', laboratorio: 'proveedorNombre',
  talla: 'talla', size: 'talla', talle: 'talla',
  color: 'color', colour: 'color',
  sku_variante: 'skuVariante', skuvariante: 'skuVariante', sku_var: 'skuVariante',
  stock_variante: 'stockVariante', stockvariante: 'stockVariante', cantidad_variante: 'stockVariante',
  stock_min_variante: 'stockMinimoVariante', stockminvariante: 'stockMinimoVariante',
};

const STRING_FIELDS: Array<keyof ProductoImportRow> = [
  'nombre', 'codigoBarras', 'categoria', 'unidadMedida',
  'lote', 'registroSanitario', 'proveedorNombre', 'talla', 'color', 'skuVariante',
];

function stripAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function normalizeKey(raw: string): string {
  return stripAccents(raw.toLowerCase().trim())
    .replace(/[^a-z0-9\s_]/g, '').trim()
    .replace(/[\s]+/g, '_').replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
function normalizeName(s: string): string { return stripAccents(s.toLowerCase().trim()); }

function parseDateValue(value: unknown): string | undefined {
  if (!value && value !== 0) return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    try {
      const info = XLSX.SSF.parse_date_code(value);
      if (info) return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
    } catch { /* ignorar */ }
  }
  const s = String(value).trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
}

function parseSheet(workbook: XLSX.WorkBook): ProductoImportRow[] {
  const sheetName = workbook.SheetNames.find(n => n !== 'Referencia') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw.map((row) => {
    const parsed: Partial<ProductoImportRow> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalized = normalizeKey(key);
      const field = COLUMN_MAP[normalized];
      if (!field) continue;
      if (STRING_FIELDS.includes(field)) {
        const str = String(value ?? '').trim();
        if (str) parsed[field] = str as never;
      } else if (field === 'fechaVencimiento') {
        const date = parseDateValue(value);
        if (date) parsed[field] = date as never;
      } else {
        const n = parseFloat(String(value));
        if (!isNaN(n)) parsed[field] = n as never;
      }
    }
    return parsed as ProductoImportRow;
  }).filter(r => r.nombre);
}

// ── Plantilla ─────────────────────────────────────────────────────────────────

function descargarPlantilla(categorias: { nombre: string }[], unidades: { nombre: string }[], rubro?: string) {
  const wb = XLSX.utils.book_new();
  const cat1 = categorias[0]?.nombre ?? 'Categoría 1';
  const cat2 = categorias[1]?.nombre ?? cat1;
  const um1  = unidades[0]?.nombre ?? 'Unidad';
  const esFarm   = esFarmaciaRubro(rubro);
  const esTienda = esTiendaRubro(rubro);

  let headers: string[], ejemplos: (string | number)[][];

  if (esFarm) {
    headers = ['nombre*','codigo_barras','categoria','precio_venta*','costo_unitario','stock_actual','stock_minimo','stock_maximo','unidad_medida','lote','fecha_vencimiento','registro_sanitario','proveedor'];
    ejemplos = [
      ['Ibuprofeno 400mg','COD-001',cat1,8.00,5.00,100,20,500,um1,'','','',''],
      ['Panadol 500mg','COD-002',cat2,5.50,3.20,25,10,200,um1,'LOTE-A','2026-01-31','RS-12345','Lab. Genérico SAC'],
      ['Panadol 500mg','COD-002',cat2,5.50,3.20,25,10,200,um1,'LOTE-B','2026-06-30','RS-12345','Importaciones XYZ'],
    ];
  } else if (esTienda) {
    headers = ['nombre*','codigo_barras','categoria','precio_venta*','costo_unitario','unidad_medida','talla','color','sku_variante','stock_variante','stock_min_variante'];
    ejemplos = [
      ['Polo básico blanco','POL-001',cat1,35.00,18.00,um1,'S','Blanco','POL-001-S-BLA',10,3],
      ['Polo básico blanco','POL-001',cat1,35.00,18.00,um1,'M','Blanco','POL-001-M-BLA',15,3],
      ['Jean slim negro','JEA-002',cat2,89.90,45.00,um1,'30','Negro','JEA-002-30-NEG',5,2],
    ];
  } else {
    headers = ['nombre*','codigo_barras','categoria','precio_venta*','costo_unitario','stock_actual','stock_minimo','stock_maximo','unidad_medida'];
    ejemplos = [
      ['Coca-Cola 500ml','COD-001',cat1,2.50,1.50,100,20,500,um1],
      ['Detergente Ariel 1kg','COD-002',cat2,12.00,7.00,50,10,200,um1],
    ];
  }

  const ws = XLSX.utils.aoa_to_sheet([[...headers], ...ejemplos]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  const maxLen = Math.max(categorias.length, unidades.length, 1);
  const refData: (string | number)[][] = [
    ['CATEGORÍAS DISPONIBLES','','UNIDADES DE MEDIDA DISPONIBLES'],
    ['(copia y pega el nombre exacto)','','(copia y pega el nombre exacto)'],
  ];
  for (let i = 0; i < maxLen; i++) refData.push([categorias[i]?.nombre ?? '','',unidades[i]?.nombre ?? '']);
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef['!cols'] = [30, 4, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');

  XLSX.writeFile(wb, 'plantilla_importacion_productos.xlsx');
}

// ── Componente ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 2.5 | 3;

export function ImportarProductosModal({ isOpen, onClose, onSuccess, unidadesMedida = [], sucursalId, rubro }: Props) {
  const [step, setStep]             = useState<Step>(1);
  const [rows, setRows]             = useState<ProductoImportRow[]>([]);
  const [fileName, setFileName]     = useState('');
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [categorias, setCategorias] = useState<{ nombre: string }[]>([]);
  const [progress, setProgress]     = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const esFarmacia = esFarmaciaRubro(rubro);
  const esTienda   = esTiendaRubro(rubro);

  useEffect(() => {
    if (!isOpen) return;
    categoriaService.getAll().then(data => setCategorias(data)).catch(() => {});
  }, [isOpen]);

  const reset = () => { setStep(1); setRows([]); setFileName(''); setResult(null); setImporting(false); setProgress(0); };

  const handleClose = () => {
    if (result && (result.creados > 0 || result.actualizados > 0)) onSuccess();
    reset();
    onClose();
  };

  const categoriasSet = new Set(categorias.map(c => normalizeName(c.nombre)));
  const unidadesSet   = new Set(unidadesMedida.map(u => normalizeName(u.nombre)));

  const categoriaStatus = (val?: string): 'ok' | 'nuevo' | 'vacio' => {
    if (!val) return 'vacio';
    return categoriasSet.has(normalizeName(val)) ? 'ok' : 'nuevo';
  };
  const unidadStatus = (val?: string): 'ok' | 'error' | 'vacio' => {
    if (!val) return 'vacio';
    return unidadesSet.has(normalizeName(val)) ? 'ok' : 'error';
  };

  const processFile = useCallback((file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) { toast.error('Formato no soportado. Usa .xlsx, .xls o .csv'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        const parsed = parseSheet(wb);
        if (parsed.length === 0) { toast.error('El archivo no contiene datos válidos'); return; }
        setRows(parsed);
        setStep(2);
      } catch { toast.error('Error al leer el archivo'); }
    };
    reader.readAsBinaryString(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const ejecutarImportacion = async () => {
    setStep(2.5);
    setProgress(5);
    setImporting(true);
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 90));
    }, 200);
    try {
      const url = sucursalId
        ? `${API_ENDPOINTS.PRODUCTOS.IMPORTAR}?sucursalId=${sucursalId}`
        : API_ENDPOINTS.PRODUCTOS.IMPORTAR;
      const { data } = await axiosInstance.post<ImportResult>(url, rows);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { setResult(data); setStep(3); setImporting(false); }, 300);
    } catch {
      clearInterval(interval);
      toast.error('Error al importar productos');
      setStep(2);
      setImporting(false);
      setProgress(0);
    }
  };

  const productosUnicos   = new Set(rows.map(r => r.codigoBarras || r.nombre)).size;
  const filasValidas      = rows.filter(r => r.nombre && r.precioVenta > 0).length;
  const filasSinPrecio    = rows.filter(r => !r.precioVenta || r.precioVenta <= 0).length;
  const unidadesInvalidas = rows.filter(r => r.unidadMedida && unidadStatus(r.unidadMedida) === 'error').length;
  const categoriasNuevas  = rows.filter(r => r.categoria && categoriaStatus(r.categoria) === 'nuevo').length;

  const multiTxt = esFarmacia
    ? 'Repite el mismo código en varias filas para cargar más de un lote del producto.'
    : 'Repite el mismo código en varias filas para cargar cada talla y color como variante.';

  const stepLabels: [number, string][] = [[1,'Subir archivo'],[2,'Vista previa'],[3,'Resultado']];

  if (!isOpen) return null;

  const stepNum = Math.min(step as number, 3);

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter,sans-serif' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 920, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}
      >

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.okSoft, color: T.ok }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 13 4 5"/><path d="m13 13-4 5"/></svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: T.text }}>Importar productos</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
              {step === 1 ? 'Carga masiva desde Excel o CSV' : step === 2 ? 'Revisa los datos antes de importar' : step === 3 ? 'Importación finalizada' : 'Procesando…'}
            </div>
          </div>
          <button type="button" onClick={handleClose} aria-label="Cerrar"
            style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Stepper — barra horizontal */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 22px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          {stepLabels.map(([n, label]) => (
            <div key={n} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 4, borderRadius: 4, transition: 'background .2s', background: n <= stepNum ? T.ok : T.surface2 }} />
              <div style={{ fontSize: '.72rem', fontWeight: 600, marginTop: 7, whiteSpace: 'nowrap', color: n === stepNum ? T.text : T.text3 }}>{n} · {label}</div>
            </div>
          ))}
        </div>

        {/* Body scroll */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileChange} />

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '38px 20px', fontFamily: 'Inter,sans-serif', borderRadius: 16, cursor: 'pointer', transition: 'all .16s', background: dragOver ? T.primarySoft : T.surface3, border: `2px dashed ${dragOver ? T.primary : T.line}` }}
              >
                <span style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 14, background: T.primarySoft, color: T.primary }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
                </span>
                <span style={{ fontSize: '.98rem', fontWeight: 650, color: T.text, marginTop: 14 }}>Arrastra tu archivo aquí o haz clic para seleccionarlo</span>
                <span style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {['.xlsx','.xls','.csv'].map(ext => (
                    <span key={ext} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, color: T.text2, background: T.surface2 }}>{ext}</span>
                  ))}
                </span>
              </button>

              {/* Plantilla card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, padding: '14px 16px', borderRadius: 13, background: T.okSoft, border: `1px solid ${T.line}` }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: T.surface, color: T.ok }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 13 4 5"/><path d="m13 13-4 5"/></svg>
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 650, color: T.text }}>Descarga la plantilla para tu rubro</div>
                  <div style={{ fontSize: '.77rem', lineHeight: 1.5, color: T.text2, marginTop: 3 }}>
                    {esFarmacia
                      ? 'Incluye columnas de lote, fecha de vencimiento y registro sanitario.'
                      : 'Incluye columnas de talla, color y SKU de variante. Sin stock general ni lotes.'}
                    {' '}La hoja <strong>Referencia</strong> lista tus categorías y unidades.
                  </div>
                </div>
                <button type="button" onClick={() => descargarPlantilla(categorias, unidadesMedida, rubro)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.84rem', fontWeight: 650, color: T.ok, background: T.surface, border: `1px solid ${T.ok}`, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
                  Plantilla
                </button>
              </div>

              {/* Columnas reconocidas */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '22px 0 10px' }}>Columnas reconocidas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                {(esFarmacia ? [
                  { col: 'nombre',            desc: 'Nombre del producto',           req: true,  esp: false },
                  { col: 'precio_venta',      desc: 'Precio de venta',               req: true,  esp: false },
                  { col: 'codigo_barras',     desc: 'Código de barras',              req: false, esp: false },
                  { col: 'categoria',         desc: 'Nombre exacto de la categoría', req: false, esp: false },
                  { col: 'costo_unitario',    desc: 'Costo de compra',               req: false, esp: false },
                  { col: 'stock',             desc: 'Cantidad del lote',             req: false, esp: false },
                  { col: 'unidad_medida',     desc: 'Tableta, Caja, Frasco…',        req: false, esp: false },
                  { col: 'stock_minimo',      desc: 'Alerta de reposición',          req: false, esp: false },
                  { col: 'lote',              desc: 'Número de lote',                req: false, esp: true  },
                  { col: 'fecha_vencimiento', desc: 'AAAA-MM-DD',                   req: false, esp: true  },
                  { col: 'registro_sanitario',desc: 'DIGEMID',                      req: false, esp: true  },
                  { col: 'proveedor',         desc: 'Nombre exacto (opcional)',      req: false, esp: true  },
                ] : [
                  { col: 'nombre',         desc: 'Nombre del producto',           req: true,  esp: false },
                  { col: 'precio_venta',   desc: 'Precio de venta',               req: true,  esp: false },
                  { col: 'codigo_barras',  desc: 'Código de barras',              req: false, esp: false },
                  { col: 'categoria',      desc: 'Nombre exacto de la categoría', req: false, esp: false },
                  { col: 'costo_unitario', desc: 'Costo de compra',               req: false, esp: false },
                  { col: 'stock_minimo',   desc: 'Alerta de reposición',          req: false, esp: false },
                  { col: 'talla',          desc: 'S, M, L, 30, 32…',             req: false, esp: true  },
                  { col: 'color',          desc: 'Color de la variante',          req: false, esp: true  },
                  { col: 'sku',            desc: 'SKU de la variante',            req: false, esp: true  },
                  { col: 'stock_variante', desc: 'Stock de esa talla/color',      req: false, esp: true  },
                ]).map(({ col, desc, req, esp }) => (
                  <div key={col} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 11px', borderRadius: 9, background: T.surface3, border: `1px solid ${T.lineSoft}`, minWidth: 0 }}>
                    <span style={{ flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.74rem', fontWeight: 600, color: esp ? T.primary : T.text }}>{col}</span>
                    <span style={{ fontSize: '.78rem', color: T.text2, minWidth: 0 }}>{desc}</span>
                    {req && <span style={{ marginLeft: 'auto', fontSize: '.66rem', fontWeight: 700, color: T.bad }}>REQ.</span>}
                  </div>
                ))}
              </div>

              {/* Info box */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14, padding: '11px 13px', borderRadius: 11, background: T.primarySoft, fontSize: '.8rem', lineHeight: 1.5, color: T.text2 }}>
                <span style={{ display: 'grid', color: T.primary, marginTop: 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
                </span>
                <span>
                  Si el <strong style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: T.text }}>codigo_barras</strong> ya existe, el producto se <strong style={{ color: T.text }}>actualiza</strong>. Si no, se <strong style={{ color: T.text }}>crea nuevo</strong>. {multiTxt}
                </span>
              </div>
            </>
          )}

          {/* ── PASO 2 ── */}
          {step === 2 && (
            <>
              {/* Archivo info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: T.surface2 }}>
                <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: T.okSoft, color: T.ok }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 13 4 5"/><path d="m13 13-4 5"/></svg>
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem', fontWeight: 600, color: T.text }}>{fileName}</div>
                  <div style={{ fontSize: '.77rem', color: T.text3, marginTop: 2 }}>
                    {rows.length} filas · {productosUnicos} productos · hoja &quot;Productos&quot;
                  </div>
                </div>
                <button type="button" onClick={reset}
                  style={{ height: 32, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Cambiar archivo
                </button>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'Filas válidas',    n: filasValidas,                       tone: filasValidas > 0 ? T.ok : null,      soft: filasValidas > 0 ? T.okSoft : T.surface2 },
                  { label: 'Productos nuevos', n: productosUnicos,                     tone: null,                                soft: T.surface2 },
                  { label: 'Se actualizan',    n: 0,                                   tone: T.primary,                           soft: T.primarySoft },
                  { label: 'Con error',        n: filasSinPrecio + unidadesInvalidas,  tone: filasSinPrecio + unidadesInvalidas > 0 ? T.bad : null, soft: filasSinPrecio + unidadesInvalidas > 0 ? T.badSoft : T.surface2 },
                ].map(k => (
                  <div key={k.label} style={{ background: k.soft, border: `1px solid ${T.line}`, borderRadius: 11, padding: '12px 14px' }}>
                    <div style={{ fontSize: '.72rem', color: T.text3 }}>{k.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-.03em', color: k.tone ?? T.text, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{k.n}</div>
                  </div>
                ))}
              </div>

              {/* Tabla */}
              <div style={{ marginTop: 12, border: `1px solid ${T.line}`, borderRadius: 12, overflow: 'auto', maxHeight: 330 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: 820 }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: T.surface3 }}>
                      {['#','Nombre','Código','Categoría','Precio','Costo',
                        ...(esTienda ? ['Talla','Color'] : ['Stock','Unidad']),
                        ...(esFarmacia ? ['Lote','Vence'] : []),
                      ].map(h => (
                        <th key={h} style={{ textAlign: ['Precio','Costo','Stock'].includes(h) ? 'right' : 'left', padding: '9px 12px', fontSize: '.7rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const errorFila = !row.nombre || !row.precioVenta || row.precioVenta <= 0;
                      const clave     = row.codigoBarras || row.nombre;
                      const esRepetido = rows.slice(0, i).some(r => (r.codigoBarras || r.nombre) === clave);
                      const catSt     = categoriaStatus(row.categoria);
                      const uniSt     = unidadStatus(row.unidadMedida);
                      return (
                        <tr key={i} style={{ borderTop: `1px solid ${T.lineSoft}`, background: errorFila ? T.badSoft : 'transparent' }}>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3 }}>{i + 2}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ fontWeight: 600, color: row.nombre ? T.text : T.bad, fontStyle: row.nombre ? 'normal' : 'italic' }}>{row.nombre || 'vacío'}</span>
                            {esRepetido && <span style={{ marginLeft: 6, fontSize: '.66rem', fontWeight: 700, color: T.primary, background: T.primarySoft, padding: '1px 6px', borderRadius: 5 }}>{esFarmacia ? 'LOTE +' : 'VARIANTE'}</span>}
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.74rem', color: T.text2 }}>{row.codigoBarras || '—'}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            {row.categoria
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.76rem', color: catSt === 'ok' ? T.text2 : T.primary, fontWeight: catSt === 'nuevo' ? 600 : undefined }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: catSt === 'ok' ? T.ok : T.primary }} />
                                  {row.categoria}
                                </span>
                              : <span style={{ color: T.text3 }}>—</span>}
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ fontWeight: 650, color: row.precioVenta > 0 ? T.text : T.bad }}>S/ {(row.precioVenta ?? 0).toFixed(2)}</span>
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', textAlign: 'right', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>S/ {(row.costoUnitario ?? 0).toFixed(2)}</td>
                          {esTienda ? <>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>{row.talla || '—'}</td>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{row.color || '—'}</td>
                          </> : <>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.stockActual ?? 0}</td>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '.78rem', color: uniSt === 'error' ? T.bad : T.text2, fontWeight: uniSt === 'error' ? 700 : undefined }}>{row.unidadMedida || '—'}</span>
                            </td>
                          </>}
                          {esFarmacia && <>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.74rem' }}>{row.lote || '—'}</td>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.74rem', color: T.text2 }}>{row.fechaVencimiento || '—'}</td>
                          </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: '.74rem', color: T.text3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: T.ok }} />Reconocido</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: T.primary }} />Categoría nueva, se creará</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: T.bad }} />Error, la fila se rechaza</span>
              </div>

              {/* Avisos */}
              {[
                filasSinPrecio > 0    ? `${filasSinPrecio} fila(s) sin nombre o sin precio de venta. Serán rechazadas al importar.` : '',
                unidadesInvalidas > 0 ? `${unidadesInvalidas} producto(s) con unidad de medida no reconocida. Revisa la hoja Referencia.` : '',
                categoriasNuevas > 0  ? `${categoriasNuevas} categoría(s) nueva(s) se crearán automáticamente.` : '',
              ].filter(Boolean).map((txt, i) => {
                const isInfo = txt.includes('categor');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, padding: '10px 13px', borderRadius: 10, fontSize: '.8rem', lineHeight: 1.5, color: isInfo ? T.primary : T.bad, background: isInfo ? T.primarySoft : T.badSoft }}>
                    <span style={{ display: 'grid', marginTop: 1 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </span>
                    <span>{txt}</span>
                  </div>
                );
              })}
            </>
          )}

          {/* ── PASO 2.5: Loading ── */}
          {step === 2.5 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: 180, height: 6, margin: '0 auto', borderRadius: 6, background: T.surface2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, background: T.primary, transition: 'width .17s linear', width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: '.95rem', fontWeight: 650, marginTop: 16, color: T.text }}>Importando productos…</div>
              <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>No cierres esta ventana</div>
            </div>
          )}

          {/* ── PASO 3: Resultado ── */}
          {step === 3 && result && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px 18px', borderRadius: 13, color: result.creados + result.actualizados > 0 ? T.ok : T.bad, background: result.creados + result.actualizados > 0 ? T.okSoft : T.badSoft }}>
                <span style={{ display: 'grid' }}>
                  {result.creados + result.actualizados > 0
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: T.text }}>
                    {result.creados > 0 || result.actualizados > 0
                      ? `${result.creados} productos creados${result.actualizados > 0 ? ` y ${result.actualizados} actualizados` : ''}`
                      : 'No se importó ningún producto'}
                  </div>
                  <div style={{ fontSize: '.82rem', color: T.text2, marginTop: 3 }}>
                    {result.errores > 0 ? `${result.errores} fila(s) no se importaron. Corrígelas en el archivo y vuelve a importarlo.` : 'Todas las filas se importaron correctamente.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'Filas',        n: result.total,        tone: null,      soft: T.surface2 },
                  { label: 'Creados',      n: result.creados,      tone: result.creados > 0 ? T.ok : null,           soft: result.creados > 0 ? T.okSoft : T.surface2 },
                  { label: 'Actualizados', n: result.actualizados, tone: result.actualizados > 0 ? T.primary : null, soft: result.actualizados > 0 ? T.primarySoft : T.surface2 },
                  { label: 'Errores',      n: result.errores,      tone: result.errores > 0 ? T.bad : null,          soft: result.errores > 0 ? T.badSoft : T.surface2 },
                ].map(k => (
                  <div key={k.label} style={{ background: k.soft, border: `1px solid ${T.line}`, borderRadius: 11, padding: '12px 14px' }}>
                    <div style={{ fontSize: '.72rem', color: T.text3 }}>{k.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-.03em', color: k.tone ?? T.text, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{k.n}</div>
                  </div>
                ))}
              </div>

              {result.filaErrores.length > 0 && (
                <>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, margin: '20px 0 10px' }}>Filas con error</div>
                  <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                      <thead>
                        <tr style={{ background: T.surface3 }}>
                          {['Fila','Producto','Motivo'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: '.7rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.filaErrores.map((e, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                            <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.76rem', color: T.text3 }}>{e.fila}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: T.text }}>{e.nombre}</td>
                            <td style={{ padding: '10px 12px', color: T.bad }}>{e.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

        </div>

        {/* Footer sticky */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          {step === 1 && (
            <>
              <button type="button" onClick={handleClose}
                style={{ minWidth: 104, height: 44, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Cancelar
              </button>
              <span style={{ flex: 1 }} />
            </>
          )}
          {step === 2 && (
            <>
              <button type="button" onClick={reset}
                style={{ minWidth: 104, height: 44, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Cancelar
              </button>
              <button type="button" onClick={ejecutarImportacion} disabled={importing || rows.length === 0}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: importing ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` }}>
                Importar {filasValidas} fila(s) · {productosUnicos} producto(s)
              </button>
            </>
          )}
          {step === 3 && (
            <>
              {result && result.filaErrores.length > 0 && (
                <button type="button" onClick={reset}
                  style={{ minWidth: 104, height: 44, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                  Reimportar corregido
                </button>
              )}
              <button type="button" onClick={handleClose}
                style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` }}>
                Cerrar
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
