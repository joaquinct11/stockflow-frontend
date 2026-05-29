import { useEffect, useState, useMemo } from 'react';
import {
  gastoService,
  type GastoDTO,
  type CategoriaGasto,
  CATEGORIAS_GASTO,
  METODOS_PAGO_GASTO,
} from '../../services/gasto.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus, Trash2, Edit, Search, TrendingDown, Calendar,
  DollarSign, SlidersHorizontal, X, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getCategoria(value: CategoriaGasto) {
  return CATEGORIAS_GASTO.find((c) => c.value === value) ?? { label: value, icon: '📦' };
}

function mesActual(): { inicio: string; fin: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { inicio: `${y}-${m}-01`, fin: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
}

const CATEGORIA_COLORS: Record<CategoriaGasto, string> = {
  ALQUILER:         'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  SERVICIOS:        'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  SUELDOS:          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  MANTENIMIENTO:    'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  PUBLICIDAD:       'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  TRANSPORTE:       'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  IMPUESTOS:        'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  COMPRAS_INTERNAS:  'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  COMPRA_PROVEEDOR:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  OTROS:             'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

const emptyForm: GastoDTO = {
  concepto: '',
  categoria: 'OTROS',
  monto: 0,
  fechaGasto: new Date().toISOString().slice(0, 10),
  metodoPago: 'EFECTIVO',
  numeroComprobante: '',
  notas: '',
};

// ─── component ───────────────────────────────────────────────────────────────

export function GastosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasView = canView('GASTOS');

  const [gastos, setGastos] = useState<GastoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoDTO | null>(null);
  const [formData, setFormData] = useState<GastoDTO>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaGasto | 'TODAS'>('TODAS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('TODOS');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalMes, setTotalMes] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    pendingId: null as number | null,
  });

  useEffect(() => {
    if (hasView) {
      fetchGastos();
      fetchTotalMes();
    } else {
      setLoading(false);
    }
  }, [hasView]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoriaFilter, fechaDesde, fechaHasta, metodoPagoFilter]);

  const fetchGastos = async () => {
    try {
      setLoading(true);
      const data = await gastoService.getAll();
      setGastos(data);
    } catch {
      toast.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalMes = async () => {
    try {
      const { inicio, fin } = mesActual();
      const total = await gastoService.getTotal(inicio, fin);
      setTotalMes(Number(total));
    } catch { /* silencioso */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.concepto.trim()) { toast.error('El concepto es obligatorio'); return; }
    if (!formData.monto || formData.monto <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    try {
      if (editingGasto?.id) {
        await gastoService.update(editingGasto.id, formData);
        toast.success('Gasto actualizado');
      } else {
        await gastoService.create(formData);
        toast.success('Gasto registrado');
      }
      closeDialog();
      fetchGastos();
      fetchTotalMes();
    } catch {
      toast.error('Error al guardar gasto');
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingGasto(null);
    setFormData({ ...emptyForm, fechaGasto: new Date().toISOString().slice(0, 10) });
  };

  const openCreate = () => {
    setEditingGasto(null);
    setFormData({ ...emptyForm, fechaGasto: new Date().toISOString().slice(0, 10) });
    setIsDialogOpen(true);
  };

  const openEdit = (g: GastoDTO) => {
    setEditingGasto(g);
    setFormData({ ...g });
    setIsDialogOpen(true);
  };

  const askDelete = (g: GastoDTO) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar gasto',
      description: `¿Eliminar "${g.concepto}" (${formatCurrency(Number(g.monto))})?`,
      confirmText: 'Eliminar',
      pendingId: g.id!,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog.pendingId) return;
    try {
      await gastoService.delete(confirmDialog.pendingId);
      toast.success('Gasto eliminado');
      fetchGastos();
      fetchTotalMes();
    } catch {
      toast.error('Error al eliminar gasto');
    } finally {
      setConfirmDialog((p) => ({ ...p, isOpen: false, pendingId: null }));
    }
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (categoriaFilter !== 'TODAS') n++;
    if (fechaDesde) n++;
    if (fechaHasta) n++;
    if (metodoPagoFilter !== 'TODOS') n++;
    return n;
  }, [categoriaFilter, fechaDesde, fechaHasta, metodoPagoFilter]);

  const limpiarFiltros = () => {
    setCategoriaFilter('TODAS');
    setFechaDesde('');
    setFechaHasta('');
    setMetodoPagoFilter('TODOS');
  };

  const filtered = useMemo(() => {
    let list = gastos;
    if (categoriaFilter !== 'TODAS') list = list.filter((g) => g.categoria === categoriaFilter);
    if (metodoPagoFilter !== 'TODOS') list = list.filter((g) => g.metodoPago === metodoPagoFilter);
    if (fechaDesde) list = list.filter((g) => g.fechaGasto >= fechaDesde);
    if (fechaHasta) list = list.filter((g) => g.fechaGasto <= fechaHasta);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (g) =>
          g.concepto.toLowerCase().includes(q) ||
          (g.numeroComprobante ?? '').toLowerCase().includes(q) ||
          (g.notas ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [gastos, searchTerm, categoriaFilter, metodoPagoFilter, fechaDesde, fechaHasta]);

  const totalFiltered = useMemo(() => filtered.reduce((s, g) => s + Number(g.monto), 0), [filtered]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);

  const porCategoria = useMemo(() => {
    const map = new Map<CategoriaGasto, number>();
    gastos.forEach((g) => map.set(g.categoria, (map.get(g.categoria) ?? 0) + Number(g.monto)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [gastos]);

  if (loading) return <LoadingSpinner />;

  if (!hasView) {
    return (
      <EmptyState
        icon={TrendingDown}
        title="Sin acceso"
        description="No tienes permiso para ver los gastos."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos y Egresos</h1>
          <p className="text-muted-foreground">Registra y controla los gastos operativos del negocio</p>
        </div>
        {canCreate('GASTOS') && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo gasto
          </Button>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total registrado */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total registrado</p>
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="text-red-600 dark:text-red-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalGastos)}</div>
            <p className="text-xs text-muted-foreground mt-1">{gastos.length} movimiento{gastos.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        {/* Mes actual */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mes actual</p>
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="text-orange-600 dark:text-orange-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">{formatCurrency(totalMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">en el mes en curso</p>
          </CardContent>
        </Card>

        {/* Filtro actual */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista filtrada</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{formatCurrency(totalFiltered)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        {/* Top categorías */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardHeader className="space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top categorías</p>
          </CardHeader>
          <CardContent className="pt-0">
            {porCategoria.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros aún</p>
            ) : (
              <div className="space-y-1.5">
                {porCategoria.map(([cat, total]) => {
                  const meta = getCategoria(cat);
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{meta.icon} {meta.label}</span>
                      <span className="text-xs font-semibold">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Search + Filtros ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por concepto, comprobante, notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={cn(
              'flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all shrink-0',
              activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary/40'
            )}
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
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categoriaFilter !== 'TODAS' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {getCategoria(categoriaFilter as CategoriaGasto).icon} {getCategoria(categoriaFilter as CategoriaGasto).label}
                <button onClick={() => setCategoriaFilter('TODAS')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {metodoPagoFilter !== 'TODOS' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {metodoPagoFilter}
                <button onClick={() => setMetodoPagoFilter('TODOS')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
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

      {/* ── Filter drawer backdrop ────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/50 z-[35] transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilterDrawer(false)}
      />

      {/* ── Filter drawer panel ───────────────────────────────────────── */}
      <div
        className={`fixed right-0 top-16 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden bg-slate-900 border-l border-t border-b border-slate-700/50 ${showFilterDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: 'calc(100vh - 7rem)', maxHeight: 'calc(100dvh - 7rem)' }}
      >
        {/* Drawer header */}
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

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Rango de fechas */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rango de fechas</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Categoría</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setCategoriaFilter('TODAS')}
                className={cn(
                  'col-span-3 px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left',
                  categoriaFilter === 'TODAS'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                )}
              >
                Todas las categorías
              </button>
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategoriaFilter(c.value as CategoriaGasto)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium border transition-all',
                    categoriaFilter === c.value
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  )}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="leading-tight text-center">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Método de pago */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Método de pago</p>
            <div className="flex flex-col gap-1.5">
              {['TODOS', ...METODOS_PAGO_GASTO.map((m) => m.value)].map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodoPagoFilter(m)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left',
                    metodoPagoFilter === m
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  )}
                >
                  {m === 'TODOS' ? 'Todos los métodos' : (METODOS_PAGO_GASTO.find((x) => x.value === m)?.label ?? m)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40 shrink-0 flex gap-2">
          <button
            onClick={limpiarFiltros}
            className="flex-1 h-9 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            Limpiar todo
          </button>
          <button
            onClick={() => setShowFilterDrawer(false)}
            className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
          >
            Ver {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 size={18} className="text-primary" />
            Registro de gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={TrendingDown}
                title={searchTerm || categoriaFilter !== 'TODAS' ? 'Sin resultados' : 'Todavía no hay gastos registrados'}
                description={
                  searchTerm || categoriaFilter !== 'TODAS'
                    ? 'No hay gastos que coincidan con los filtros aplicados.'
                    : 'Registra tus egresos para tener visibilidad completa de los costos operativos de tu negocio.'
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Comprobante</TableHead>
                      {(canEdit('GASTOS') || canDelete('GASTOS')) && (
                        <TableHead className="text-right">Acciones</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((g) => {
                      const cat = getCategoria(g.categoria);
                      const colorClass = CATEGORIA_COLORS[g.categoria] ?? CATEGORIA_COLORS['OTROS'];
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(g.fechaGasto)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{g.concepto}</p>
                              {g.notas && (
                                <p className="text-muted-foreground text-xs truncate max-w-[200px]">{g.notas}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                              colorClass
                            )}>
                              {cat.icon} {cat.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {g.metodoPago ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums text-sm">
                              {formatCurrency(Number(g.monto))}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {g.numeroComprobante || '—'}
                          </TableCell>
                          {(canEdit('GASTOS') || canDelete('GASTOS')) && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit('GASTOS') && (
                                  <button
                                    onClick={() => openEdit(g)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit size={15} />
                                  </button>
                                )}
                                {canDelete('GASTOS') && (
                                  <button
                                    onClick={() => askDelete(g)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filtered.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filtered.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog crear / editar ────────────────────────────────────── */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title={editingGasto ? 'Editar gasto' : 'Registrar gasto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Concepto <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ej: Pago luz enero, Sueldo Juan..."
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaGasto })}
                className="w-full bg-background border border-input text-foreground text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                {CATEGORIAS_GASTO.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Monto (S/) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={formData.monto || ''}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Fecha del gasto <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.fechaGasto}
                onChange={(e) => setFormData({ ...formData, fechaGasto: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Método de pago</label>
              <select
                value={formData.metodoPago ?? ''}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value as any })}
                className="w-full bg-background border border-input text-foreground text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sin especificar</option>
                {METODOS_PAGO_GASTO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">N° Comprobante / Boleta</label>
            <Input
              placeholder="Ej: B001-001234"
              value={formData.numeroComprobante ?? ''}
              onChange={(e) => setFormData({ ...formData, numeroComprobante: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea
              rows={2}
              placeholder="Observaciones adicionales..."
              value={formData.notas ?? ''}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full bg-background border border-input text-foreground text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingGasto ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Confirm delete ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false, pendingId: null }))}
        type="danger"
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}
