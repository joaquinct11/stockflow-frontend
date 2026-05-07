import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import axiosInstance from '../../api/axios.config';
import { API_ENDPOINTS } from '../../api/endpoints';
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
// Acepta variantes en español/inglés, con/sin tildes, etc.

const COLUMN_MAP: Record<string, keyof ProductoImportRow> = {
  // nombre
  nombre: 'nombre', name: 'nombre', producto: 'nombre',
  // codigo_barras
  codigo_barras: 'codigoBarras', codigobarras: 'codigoBarras',
  codigo: 'codigoBarras', barcode: 'codigoBarras', sku: 'codigoBarras',
  // categoria
  categoria: 'categoria', category: 'categoria',
  // precio_venta
  precio_venta: 'precioVenta', precioventa: 'precioVenta',
  precio: 'precioVenta', price: 'precioVenta',
  // costo_unitario
  costo_unitario: 'costoUnitario', costounitario: 'costoUnitario',
  costo: 'costoUnitario', cost: 'costoUnitario',
  // stock_actual
  stock_actual: 'stockActual', stockactual: 'stockActual',
  stock: 'stockActual', cantidad: 'stockActual',
  // stock_minimo
  stock_minimo: 'stockMinimo', stockminimo: 'stockMinimo',
  stock_min: 'stockMinimo', minimo: 'stockMinimo',
  // stock_maximo
  stock_maximo: 'stockMaximo', stockmaximo: 'stockMaximo',
  stock_max: 'stockMaximo', maximo: 'stockMaximo',
  // unidad_medida
  unidad_medida: 'unidadMedida', unidadmedida: 'unidadMedida',
  unidad: 'unidadMedida', unit: 'unidadMedida', um: 'unidadMedida',
};

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // quitar tildes/diacríticos
    .replace(/[^a-z0-9\s_]/g, '')    // quitar *, #, paréntesis, etc.
    .trim()
    .replace(/[\s]+/g, '_')          // espacios → guión bajo
    .replace(/_+/g, '_')             // colapsar __ → _
    .replace(/^_|_$/g, '');          // quitar _ al inicio/fin
}

function parseSheet(workbook: XLSX.WorkBook): ProductoImportRow[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return raw.map((row) => {
    const parsed: Partial<ProductoImportRow> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalized = normalizeKey(key);
      const field = COLUMN_MAP[normalized];
      if (!field) continue;
      if (field === 'nombre' || field === 'codigoBarras' || field === 'categoria' || field === 'unidadMedida') {
        parsed[field] = String(value ?? '').trim() as never;
      } else {
        const n = parseFloat(String(value));
        if (!isNaN(n)) parsed[field] = n as never;
      }
    }
    return parsed as ProductoImportRow;
  }).filter(r => r.nombre); // descartar filas completamente vacías
}

// ── Plantilla de descarga ─────────────────────────────────────────────────────

function descargarPlantilla() {
  const headers = [
    ['nombre*', 'codigo_barras', 'categoria', 'precio_venta*', 'costo_unitario',
     'stock_actual', 'stock_minimo', 'stock_maximo', 'unidad_medida'],
  ];
  const ejemplos = [
    ['Paracetamol 500mg', 'MED-001', 'Medicamentos', 5.50, 3.20, 100, 20, 500, 'Unidad'],
    ['Alcohol 70° 1L',   'MED-002', 'Desinfectantes', 8.00, 5.00, 50,  10, 200, 'Litro'],
    ['Mascarilla KN95',  '',        'Protección',     2.50, 1.50, 200, 50, 1000, 'Unidad'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...ejemplos]);
  ws['!cols'] = [18, 14, 14, 13, 13, 12, 12, 12, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, 'plantilla_importacion_productos.xlsx');
}

// ── Componente principal ──────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'result';

export function ImportarProductosModal({ isOpen, onClose, onSuccess, unidadesMedida = [] }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ProductoImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setFileName('');
    setResult(null);
    setImporting(false);
  };

  const handleClose = () => {
    // Si hubo productos importados, refrescar el inventario al cerrar (no durante)
    if (result && (result.creados > 0 || result.actualizados > 0)) {
      onSuccess();
    }
    reset();
    onClose();
  };

  // ── Parsear archivo ───────────────────────────────────────────────────────

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
        const wb = XLSX.read(data, { type: 'binary' });
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

  // ── Importar ──────────────────────────────────────────────────────────────

  const ejecutarImportacion = async () => {
    setImporting(true);
    try {
      const { data } = await axiosInstance.post<ImportResult>(
        API_ENDPOINTS.PRODUCTOS.IMPORTAR,
        rows,
      );
      setResult(data);
      setStep('result'); // onSuccess se llama al cerrar el modal para no desmontar la vista
    } catch {
      toast.error('Error al importar productos');
    } finally {
      setImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
            {/* Zona de drag & drop */}
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
              <p className="text-sm text-muted-foreground mt-1">Formatos soportados: .xlsx, .xls, .csv</p>
            </div>

            {/* Plantilla */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              <FileSpreadsheet size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">¿Primera vez? Descarga la plantilla</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contiene las columnas necesarias con ejemplos. Las columnas marcadas con <span className="text-red-500">*</span> son obligatorias.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={descargarPlantilla} className="shrink-0">
                <Download size={14} className="mr-1.5" />
                Plantilla
              </Button>
            </div>

            {/* Info de columnas */}
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Columnas reconocidas
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div><span className="font-medium text-red-500">nombre*</span> — Nombre del producto</div>
                <div><span className="font-medium">codigo_barras</span> — Código único (opcional)</div>
                <div><span className="font-medium text-red-500">precio_venta*</span> — Precio de venta</div>
                <div><span className="font-medium">costo_unitario</span> — Costo de compra</div>
                <div><span className="font-medium">categoria</span> — Categoría</div>
                <div><span className="font-medium">unidad_medida</span> — Nombre exacto de la UM</div>
                <div><span className="font-medium">stock_actual</span> — Stock inicial</div>
                <div><span className="font-medium">stock_minimo / stock_maximo</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Si el <span className="font-medium">codigo_barras</span> ya existe, el producto se <span className="font-medium">actualiza</span>. Si no, se <span className="font-medium">crea nuevo</span>.
              </p>
              {unidadesMedida.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-1">Unidades de medida disponibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {unidadesMedida.map(u => (
                      <span key={u.nombre} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                        {u.nombre}
                      </span>
                    ))}
                  </div>
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
                <p className="text-sm text-muted-foreground">{rows.length} producto(s) listos para importar</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={14} className="mr-1.5" /> Cambiar archivo
              </Button>
            </div>

            {/* Tabla preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
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
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const error = !row.nombre || !row.precioVenta || row.precioVenta <= 0;
                      return (
                        <tr key={i} className={`border-t ${error ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/30'}`}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className={`px-3 py-2 font-medium ${error ? 'text-red-600' : ''}`}>
                            {row.nombre || <span className="italic text-red-500">vacío</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row.codigoBarras || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.categoria || '—'}</td>
                          <td className={`px-3 py-2 text-right ${!row.precioVenta || row.precioVenta <= 0 ? 'text-red-500' : ''}`}>
                            {row.precioVenta ? `S/ ${Number(row.precioVenta).toFixed(2)}` : <span className="text-red-500">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.costoUnitario ? `S/ ${Number(row.costoUnitario).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">{row.stockActual ?? 0}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.unidadMedida || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advertencias previas */}
            {rows.some(r => !r.nombre || !r.precioVenta || r.precioVenta <= 0) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  Las filas marcadas en rojo tienen datos inválidos y serán reportadas como error al importar.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={ejecutarImportacion} disabled={importing}>
                {importing ? 'Importando...' : `Importar ${rows.length} productos`}
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ── */}
        {step === 'result' && result && (
          <div className="flex flex-col gap-4">
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.creados}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Creados</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.actualizados}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Actualizados</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${result.errores > 0
                ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-border'}`}>
                <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {result.errores}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Errores</p>
              </div>
            </div>

            {/* Mensaje principal */}
            {result.creados + result.actualizados > 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                <CheckCircle2 size={16} />
                <span>
                  Importación completada: <strong>{result.creados}</strong> productos creados
                  {result.actualizados > 0 && <> y <strong>{result.actualizados}</strong> actualizados</>}.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                <XCircle size={16} />
                <span>No se importó ningún producto. Revisa los errores y corrige el archivo.</span>
              </div>
            )}

            {/* Lista de errores */}
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
