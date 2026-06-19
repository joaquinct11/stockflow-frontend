import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, ArrowRight, RotateCcw, Info, FlaskConical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import axiosInstance from '../../api/axios.config';
import { API_ENDPOINTS } from '../../api/endpoints';
import { categoriaService } from '../../services/categoria.service';
import toast from 'react-hot-toast';

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
  fechaVencimiento?: string;   // 'YYYY-MM-DD'
  registroSanitario?: string;
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
}

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
  // Campos de lote
  lote: 'lote', numero_lote: 'lote', num_lote: 'lote', nro_lote: 'lote', batch: 'lote', lot: 'lote',
  fecha_vencimiento: 'fechaVencimiento', fechavencimiento: 'fechaVencimiento',
  vencimiento: 'fechaVencimiento', vence: 'fechaVencimiento', expiry: 'fechaVencimiento',
  fecha_venc: 'fechaVencimiento', fechavenc: 'fechaVencimiento', expiration: 'fechaVencimiento',
  registro_sanitario: 'registroSanitario', registrosanitario: 'registroSanitario',
  rs: 'registroSanitario', reg_san: 'registroSanitario', regsanitario: 'registroSanitario',
  reg_sanitario: 'registroSanitario',
};

const STRING_FIELDS: Array<keyof ProductoImportRow> = [
  'nombre', 'codigoBarras', 'categoria', 'unidadMedida', 'lote', 'registroSanitario',
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeKey(raw: string): string {
  return stripAccents(raw.toLowerCase().trim())
    .replace(/[^a-z0-9\s_]/g, '').trim()
    .replace(/[\s]+/g, '_').replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeName(s: string): string {
  return stripAccents(s.toLowerCase().trim());
}

// Convierte varios formatos de fecha a 'YYYY-MM-DD'
function parseDateValue(value: unknown): string | undefined {
  if (!value && value !== 0) return undefined;
  // JS Date (cuando cellDates:true está activo)
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  // Serial numérico de Excel
  if (typeof value === 'number') {
    try {
      const info = XLSX.SSF.parse_date_code(value);
      if (info) {
        return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
      }
    } catch { /* ignorar */ }
  }
  const s = String(value).trim();
  if (!s) return undefined;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
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

// ── Generar plantilla ─────────────────────────────────────────────────────────

function descargarPlantilla(
  categorias: { nombre: string }[],
  unidades: { nombre: string }[],
) {
  const wb = XLSX.utils.book_new();

  const headers = [[
    'nombre*', 'codigo_barras', 'categoria', 'precio_venta*', 'costo_unitario',
    'stock_actual', 'stock_minimo', 'stock_maximo', 'unidad_medida',
    'lote', 'fecha_vencimiento', 'registro_sanitario',
  ]];

  const cat1 = categorias[0]?.nombre ?? 'Medicamentos';
  const cat2 = categorias[1]?.nombre ?? cat1;
  const um1  = unidades[0]?.nombre  ?? 'Unidad';
  const um2  = unidades[1]?.nombre  ?? um1;

  const ejemplos = [
    // Producto sin lote
    ['Ibuprofeno 400mg', 'COD-001', cat1, 8.00, 5.00, 100, 20, 500, um1, '', '', ''],
    // Mismo producto con 2 lotes distintos
    ['Panadol 500mg', 'COD-002', cat2, 5.50, 3.20, 25, 10, 200, um1, 'LOTE-A', '2026-01-31', 'RS-12345'],
    ['Panadol 500mg', 'COD-002', cat2, 5.50, 3.20, 25, 10, 200, um1, 'LOTE-B', '2026-06-30', 'RS-12345'],
    // Producto sin código de barras
    ['Vitamina C 1g',  '',        cat1, 12.00, 7.50, 60, 10, 300, um2, 'VIT-2025', '2025-12-31', ''],
  ];

  const wsProductos = XLSX.utils.aoa_to_sheet([...headers, ...ejemplos]);
  wsProductos['!cols'] = [22, 14, 16, 13, 13, 12, 12, 12, 14, 14, 18, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

  // Hoja de referencia
  const maxLen = Math.max(categorias.length, unidades.length, 1);
  const refData: (string | number)[][] = [
    ['CATEGORÍAS DISPONIBLES', '', 'UNIDADES DE MEDIDA DISPONIBLES'],
    ['(copia y pega el nombre exacto)', '', '(copia y pega el nombre exacto)'],
  ];
  for (let i = 0; i < maxLen; i++) {
    refData.push([categorias[i]?.nombre ?? '', '', unidades[i]?.nombre ?? '']);
  }
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef['!cols'] = [30, 4, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');

  XLSX.writeFile(wb, 'plantilla_importacion_productos.xlsx');
}

// ── Componente principal ──────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'result';

export function ImportarProductosModal({ isOpen, onClose, onSuccess, unidadesMedida = [] }: Props) {
  const [step, setStep]           = useState<Step>('upload');
  const [rows, setRows]           = useState<ProductoImportRow[]>([]);
  const [fileName, setFileName]   = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [categorias, setCategorias] = useState<{ nombre: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    categoriaService.getAll().then(data => setCategorias(data)).catch(() => {});
  }, [isOpen]);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setFileName('');
    setResult(null);
    setImporting(false);
  };

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
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Formato no soportado. Usa .xlsx, .xls o .csv');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // cellDates:true hace que las fechas de Excel vengan como Date objects
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        const parsed = parseSheet(wb);
        if (parsed.length === 0) {
          toast.error('El archivo no contiene datos válidos');
          return;
        }
        setRows(parsed);
        setStep('preview');
      } catch {
        toast.error('Error al leer el archivo');
      }
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
    setImporting(true);
    try {
      const { data } = await axiosInstance.post<ImportResult>(API_ENDPOINTS.PRODUCTOS.IMPORTAR, rows);
      setResult(data);
      setStep('result');
    } catch {
      toast.error('Error al importar productos');
    } finally {
      setImporting(false);
    }
  };

  // Contadores para el preview
  const unidadesInvalidas = rows.filter(r => r.unidadMedida && unidadStatus(r.unidadMedida) === 'error').length;
  const categoriasNuevas  = rows.filter(r => r.categoria && categoriaStatus(r.categoria) === 'nuevo').length;
  const filasSinPrecio    = rows.filter(r => !r.precioVenta || r.precioVenta <= 0).length;
  const productosUnicos   = new Set(rows.map(r => r.codigoBarras || r.nombre)).size;
  const filasConLote      = rows.filter(r => r.lote || r.fechaVencimiento).length;
  const esMultiLote       = rows.length > productosUnicos;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Importar productos" size="xl">
      <div className="flex flex-col gap-5">

        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => {
            const labels = ['Subir archivo', 'Previsualizar', 'Resultado'];
            const active = step === s;
            const done = (step === 'preview' && i === 0) || (step === 'result' && i < 2);
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                  ${active ? 'bg-primary text-primary-foreground' :
                    done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className={active ? 'font-medium' : 'text-muted-foreground'}>{labels[i]}</span>
                {i < 2 && <ArrowRight size={14} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* ── PASO 1: Upload ── */}
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
              <Upload size={36} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
              <p className="text-sm text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv</p>
            </div>

            {/* Descarga plantilla */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              <FileSpreadsheet size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Descarga la plantilla con tus datos</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Incluye ejemplos de multi-lote y una hoja <strong>Referencia</strong> con las categorías y unidades de tu sistema.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => descargarPlantilla(categorias, unidadesMedida)} className="shrink-0">
                <Download size={14} className="mr-1.5" />
                Plantilla
              </Button>
            </div>

            {/* Info columnas */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Columnas reconocidas
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div><span className="font-medium text-red-500">nombre*</span> — Nombre del producto</div>
                <div><span className="font-medium">codigo_barras</span> — Código único (opcional)</div>
                <div><span className="font-medium text-red-500">precio_venta*</span> — Precio de venta</div>
                <div><span className="font-medium">costo_unitario</span> — Costo de compra</div>
                <div><span className="font-medium">categoria</span> — Nombre exacto de la categoría</div>
                <div><span className="font-medium">unidad_medida</span> — Nombre exacto de la unidad</div>
                <div><span className="font-medium">stock_actual</span> — Cantidad de este lote</div>
                <div><span className="font-medium">stock_minimo / stock_maximo</span></div>
                <div><span className="font-medium text-purple-600">lote</span> — Número de lote</div>
                <div><span className="font-medium text-purple-600">fecha_vencimiento</span> — YYYY-MM-DD o DD/MM/YYYY</div>
                <div><span className="font-medium text-purple-600">registro_sanitario</span> — RS del lote</div>
              </div>

              {/* Tip multi-lote */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <FlaskConical size={14} className="text-purple-600 mt-0.5 shrink-0" />
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  <strong>Multi-lote:</strong> Para un mismo producto con varios lotes, agrega una fila por lote con el mismo nombre/código. El stock se sumará automáticamente y cada lote quedará con su trazabilidad independiente.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Si el <strong>codigo_barras</strong> ya existe, el producto se <strong>actualiza</strong>. Si no, se <strong>crea nuevo</strong>.
              </p>

              {categorias.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Info size={12} className="text-primary" />
                    Categorías disponibles:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {categorias.map(c => (
                      <span key={c.nombre} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{c.nombre}</span>
                    ))}
                  </div>
                </div>
              )}
              {unidadesMedida.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Info size={12} className="text-primary" />
                    Unidades de medida disponibles:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {unidadesMedida.map(u => (
                      <span key={u.nombre} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{u.nombre}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠ La unidad debe coincidir exactamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PASO 2: Preview ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {rows.length} fila(s)
                  {esMultiLote && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-purple-600 font-medium">
                      <FlaskConical size={12} />
                      {productosUnicos} productos únicos — {rows.length - productosUnicos} fila(s) multi-lote
                    </span>
                  )}
                  {!esMultiLote && filasConLote > 0 && (
                    <span className="ml-1.5 text-purple-600 font-medium">· {filasConLote} con lote/vencimiento</span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={14} className="mr-1.5" /> Cambiar archivo
              </Button>
            </div>

            {/* Tabla preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium">Código</th>
                      <th className="px-3 py-2 text-left font-medium">Categoría</th>
                      <th className="px-3 py-2 text-right font-medium">P. Venta</th>
                      <th className="px-3 py-2 text-right font-medium">Costo</th>
                      <th className="px-3 py-2 text-right font-medium">Stock</th>
                      <th className="px-3 py-2 text-left font-medium">Unidad</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-600">Lote</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-600">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const errorFila = !row.nombre || !row.precioVenta || row.precioVenta <= 0;
                      const catSt = categoriaStatus(row.categoria);
                      const uniSt = unidadStatus(row.unidadMedida);
                      // Detectar si es fila multi-lote (mismo código/nombre que una fila anterior)
                      const clave = row.codigoBarras || row.nombre;
                      const esLoteAdicional = rows.slice(0, i).some(r => (r.codigoBarras || r.nombre) === clave);
                      return (
                        <tr key={i} className={`border-t ${errorFila ? 'bg-red-50 dark:bg-red-950/20' : esLoteAdicional ? 'bg-purple-50/40 dark:bg-purple-950/10' : 'hover:bg-muted/30'}`}>
                          <td className="px-3 py-2 text-muted-foreground">
                            {i + 1}
                            {esLoteAdicional && <FlaskConical size={10} className="inline ml-1 text-purple-500" />}
                          </td>
                          <td className={`px-3 py-2 font-medium ${errorFila ? 'text-red-600' : ''}`}>
                            {row.nombre || <span className="italic text-red-500">vacío</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{row.codigoBarras || '—'}</td>
                          <td className="px-3 py-2">
                            {!row.categoria ? <span className="text-muted-foreground">—</span>
                              : catSt === 'ok' ? <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 size={11} />{row.categoria}</span>
                              : <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Se creará"><AlertCircle size={11} />{row.categoria}</span>}
                          </td>
                          <td className={`px-3 py-2 text-right ${!row.precioVenta || row.precioVenta <= 0 ? 'text-red-500' : ''}`}>
                            {row.precioVenta ? `S/ ${Number(row.precioVenta).toFixed(2)}` : <span className="text-red-500">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.costoUnitario ? `S/ ${Number(row.costoUnitario).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{row.stockActual ?? 0}</td>
                          <td className="px-3 py-2">
                            {!row.unidadMedida ? <span className="text-muted-foreground">—</span>
                              : uniSt === 'ok' ? <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 size={11} />{row.unidadMedida}</span>
                              : <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" title="No existe"><XCircle size={11} />{row.unidadMedida}</span>}
                          </td>
                          <td className="px-3 py-2 text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                            {row.lote || '—'}
                          </td>
                          <td className="px-3 py-2 text-purple-700 dark:text-purple-300 text-[11px]">
                            {row.fechaVencimiento || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-600" /> Reconocido</span>
              <span className="flex items-center gap-1"><AlertCircle size={11} className="text-blue-500" /> Categoría nueva (se creará)</span>
              <span className="flex items-center gap-1"><XCircle size={11} className="text-red-500" /> Unidad no encontrada</span>
              {esMultiLote && <span className="flex items-center gap-1"><FlaskConical size={11} className="text-purple-500" /> Lote adicional (suma al stock)</span>}
            </div>

            {/* Advertencias */}
            {esMultiLote && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-sm">
                <FlaskConical size={15} className="text-purple-600 mt-0.5 shrink-0" />
                <span className="text-purple-800 dark:text-purple-200">
                  Se detectaron <strong>{rows.length - productosUnicos} fila(s) multi-lote</strong>. El stock de cada fila adicional se <strong>sumará</strong> al del mismo producto y se guardará con su propia trazabilidad (lote, vencimiento, RS).
                </span>
              </div>
            )}
            {filasSinPrecio > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm">
                <XCircle size={15} className="text-red-600 mt-0.5 shrink-0" />
                <span className="text-red-800 dark:text-red-200">
                  <strong>{filasSinPrecio} fila(s)</strong> sin precio de venta — serán rechazadas al importar.
                </span>
              </div>
            )}
            {unidadesInvalidas > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  <strong>{unidadesInvalidas} producto(s)</strong> con unidad de medida no reconocida. Revisa la hoja <strong>Referencia</strong>.
                </span>
              </div>
            )}
            {categoriasNuevas > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm">
                <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
                <span className="text-blue-800 dark:text-blue-200">
                  <strong>{categoriasNuevas} producto(s)</strong> con categoría nueva — se creará automáticamente.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={ejecutarImportacion} disabled={importing || rows.length === 0}>
                {importing ? 'Importando...' : `Importar ${rows.length} fila(s) · ${productosUnicos} producto(s)`}
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ── */}
        {step === 'result' && result && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Filas</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.creados}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Creados</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.actualizados}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Actualizados</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${result.errores > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-border'}`}>
                <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {result.errores}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Errores</p>
              </div>
            </div>

            {result.creados + result.actualizados > 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                <CheckCircle2 size={16} />
                <span>
                  <strong>{result.creados}</strong> productos creados
                  {result.actualizados > 0 && <> y <strong>{result.actualizados}</strong> actualizados (incluye lotes adicionales)</>}.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                <XCircle size={16} />
                <span>No se importó ningún producto. Revisa los errores y corrige el archivo.</span>
              </div>
            )}

            {result.filaErrores.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border-b flex items-center gap-2">
                  <XCircle size={14} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Filas con error ({result.filaErrores.length})
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-16">Fila</th>
                        <th className="px-3 py-2 text-left font-medium">Producto</th>
                        <th className="px-3 py-2 text-left font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.filaErrores.map((e, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2 text-center text-muted-foreground">{e.fila}</td>
                          <td className="px-3 py-2 font-medium">{e.nombre}</td>
                          <td className="px-3 py-2 text-red-600">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {result.filaErrores.length > 0 && (
                <Button variant="outline" onClick={reset}>
                  <RotateCcw size={14} className="mr-1.5" /> Reimportar corregido
                </Button>
              )}
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}

      </div>
    </Dialog>
  );
}
