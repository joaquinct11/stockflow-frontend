import { useEffect, useState, useMemo } from 'react';
import { FileText, Download, RefreshCw, Tag, CheckCircle2, Clock, XCircle, Banknote, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { notaCreditoService } from '../../services/notaCredito.service';
import type { NotaCreditoDTO } from '../../types';

type FiltroEstado = 'TODOS' | 'PENDIENTE' | 'USADA' | 'ANULADA';

const FILTROS: { id: FiltroEstado; label: string }[] = [
  { id: 'TODOS',    label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'USADA',    label: 'Usadas' },
  { id: 'ANULADA',  label: 'Anuladas' },
];

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'PENDIENTE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Clock className="w-3 h-3" /> Pendiente
      </span>
    );
  }
  if (estado === 'USADA') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <CheckCircle2 className="w-3 h-3" /> Usada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <XCircle className="w-3 h-3" /> Anulada
    </span>
  );
}

function fmtFecha(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function NotasCreditoPage() {
  const [notas, setNotas] = useState<NotaCreditoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);

  const fetchNotas = async () => {
    try {
      setLoading(true);
      const data = await notaCreditoService.getAll();
      setNotas(data);
    } catch {
      toast.error('Error al cargar las notas de crédito');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  const handleDescargarPdf = async (nc: NotaCreditoDTO) => {
    try {
      setDescargando(nc.id);
      await notaCreditoService.descargarPdf(nc.id);
      toast.success(`PDF de ${nc.codigo} descargado`);
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setDescargando(null);
    }
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filtro !== 'TODOS') n++;
    if (fechaDesde) n++;
    if (fechaHasta) n++;
    return n;
  }, [filtro, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setFiltro('TODOS');
    setFechaDesde('');
    setFechaHasta('');
  };

  const notasFiltradas = useMemo(() => {
    return notas.filter(n => {
      if (filtro !== 'TODOS' && n.estado !== filtro) return false;
      if (fechaDesde && n.fechaEmision) {
        if (new Date(n.fechaEmision) < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && n.fechaEmision) {
        const to = new Date(fechaHasta);
        to.setHours(23, 59, 59, 999);
        if (new Date(n.fechaEmision) > to) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!n.codigo?.toLowerCase().includes(q) &&
            !String(n.ventaOrigenId ?? '').includes(q) &&
            !String(n.ventaUsoId ?? '').includes(q)) return false;
      }
      return true;
    });
  }, [notas, filtro, fechaDesde, fechaHasta, searchTerm]);

  // Stats
  const pendientes = notas.filter(n => n.estado === 'PENDIENTE');
  const totalPendiente = pendientes.reduce((s, n) => s + (n.montoTotal ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas de Crédito</h1>
          <p className="text-muted-foreground">Notas generadas por devoluciones de venta</p>
        </div>
        <button
          onClick={fetchNotas}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input hover:bg-muted text-sm transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total emitidas</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{notas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Generadas por devoluciones</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendientes de canje</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Disponibles para usar</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto por canjear</p>
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Banknote className="text-violet-600 dark:text-violet-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
              S/.{totalPendiente.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">A favor del cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por código, venta origen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={[
              'flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all shrink-0',
              activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary/40',
            ].join(' ')}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {(activeFiltersCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {filtro !== 'TODOS' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {FILTROS.find(f => f.id === filtro)?.label}
                <button onClick={() => setFiltro('TODOS')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaDesde && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Desde {fechaDesde}
                <button onClick={() => setFechaDesde('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaHasta && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Hasta {fechaHasta}
                <button onClick={() => setFechaHasta('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-1">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Filter drawer backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[35] transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilterDrawer(false)}
      />

      {/* Filter drawer panel */}
      <div
        className={`fixed right-0 top-16 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden bg-slate-900 border-l border-t border-b border-slate-700/50 ${showFilterDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: 'calc(100vh - 7rem)', maxHeight: 'calc(100dvh - 7rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm text-white">Filtros</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </div>
          <button onClick={() => setShowFilterDrawer(false)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Rango de fechas */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rango de fechas</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</p>
            <div className="flex flex-col gap-1.5">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left',
                    filtro === f.id
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40 shrink-0 flex gap-2">
          <button onClick={limpiarFiltros} className="flex-1 h-9 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            Limpiar todo
          </button>
          <button onClick={() => setShowFilterDrawer(false)} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
            Ver {notasFiltradas.length} resultado{notasFiltradas.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : notasFiltradas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={notas.length === 0 ? 'Todavía no hay notas de crédito' : 'Sin resultados'}
            description={notas.length === 0
              ? 'Las notas de crédito se generan cuando se anula o devuelve una venta. Aparecerán aquí con su estado y montos disponibles.'
              : 'No hay notas de crédito que coincidan con los filtros aplicados.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Emisión</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vence</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Venta origen</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Canjeada en venta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notasFiltradas.map(nc => {
                  const isVencida =
                    nc.estado === 'PENDIENTE' &&
                    nc.fechaVencimiento &&
                    new Date(nc.fechaVencimiento) < new Date();

                  return (
                    <tr key={nc.id} className="hover:bg-muted/30 transition-colors">
                      {/* Código */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="font-mono font-semibold text-primary">{nc.codigo}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        {isVencida ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <XCircle className="w-3 h-3" /> Vencida
                          </span>
                        ) : (
                          <EstadoBadge estado={nc.estado} />
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 text-right font-semibold">
                        S/.{(nc.montoTotal ?? 0).toFixed(2)}
                      </td>

                      {/* Emisión */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtFecha(nc.fechaEmision)}
                      </td>

                      {/* Vence */}
                      <td className={`px-4 py-3 ${isVencida ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {fmtFecha(nc.fechaVencimiento)}
                      </td>

                      {/* Venta origen */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {nc.ventaOrigenId ? (
                          <span className="font-medium">Venta #{nc.ventaOrigenId}</span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>

                      {/* Canjeada en venta */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {nc.ventaUsoId ? (
                          <span className="text-blue-600 dark:text-blue-400">Venta #{nc.ventaUsoId}</span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDescargarPdf(nc)}
                          disabled={descargando === nc.id}
                          title="Descargar PDF"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-input hover:bg-muted text-xs transition-colors disabled:opacity-50"
                        >
                          {descargando === nc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
