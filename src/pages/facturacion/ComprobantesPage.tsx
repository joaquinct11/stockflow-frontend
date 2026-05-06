import { useEffect, useState } from 'react';
import { facturacionService } from '../../services/facturacion.service';
import { ventaService } from '../../services/venta.service';
import type { ComprobanteDTO, EmitirComprobanteForm, EmitirComprobanteRequest, TipoComprobante, VentaDTO, ItemComprobanteDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Eye, Calendar, DollarSign, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

const TIPO_OPTIONS: TipoComprobante[] = ['BOLETA', 'FACTURA'];
// const ESTADO_OPTIONS = ['EMITIDO', 'ANULADO'];

function estadoBadgeVariant(estado: string): 'success' | 'destructive' | 'warning' | 'default' {
  if (estado === 'EMITIDO') return 'success';
  if (estado === 'ANULADO') return 'destructive';
  return 'default';
}

function estadoIcon(estado: string) {
  if (estado === 'EMITIDO') return <CheckCircle size={14} className="inline mr-1" />;
  if (estado === 'ANULADO') return <XCircle size={14} className="inline mr-1" />;
  return <Clock size={14} className="inline mr-1" />;
}

const emptyForm = (): EmitirComprobanteForm => ({
  ventaId: 0,
  tipo: 'BOLETA',
  receptor: {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    razonSocial: '',
    direccion: '',
  },
});

export function ComprobantesPage() {
  const { canAccess, puede, canCreate, canDelete, isVendedor } = usePermissions();
  const { user } = useAuthStore();

  const canView = canAccess('FACTURACION');
  const canEmitir = puede('EMITIR_COMPROBANTE') || canCreate('FACTURACION');
  const canAnular = puede('ANULAR_COMPROBANTE') || canDelete('FACTURACION');

  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Emit dialog
  const [isEmitirOpen, setIsEmitirOpen] = useState(false);
  const [emitirForm, setEmitirForm] = useState<EmitirComprobanteForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Anular confirm
  const [confirmAnular, setConfirmAnular] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    if (canView) {
      fetchComprobantes();
      fetchVentas();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  const fetchVentas = async () => {
    try {
      // VENDEDOR solo puede ver sus propias ventas (VER_MIS_VENTAS)
      const data = isVendedor && user?.usuarioId
        ? await ventaService.getByVendor(user.usuarioId)
        : await ventaService.getAll();
      setVentas(data);
    } catch { /* no bloquear si falla */ }
  };

  const fetchComprobantes = async () => {
    try {
      setLoading(true);
      const data = await facturacionService.listComprobantes({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      setComprobantes(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para ver comprobantes');
      } else {
        toast.error('Error al cargar comprobantes');
      }
      setComprobantes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredComprobantes = comprobantes.filter((c) => {
    // ✅ 1) filtro fechas (createdAt)
    if (fechaDesde || fechaHasta) {
      const created = c.createdAt ? new Date(c.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      const createdTime = created.getTime();

      if (fechaDesde) {
        const [y, m, d] = fechaDesde.split('-').map(Number);
        const from = startOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime < from) return false;
      }

      if (fechaHasta) {
        const [y, m, d] = fechaHasta.split('-').map(Number);
        const to = endOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime > to) return false;
      }
    }

    // ✅ 2) filtro search
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.numero?.toLowerCase().includes(term) ||
      String(c.ventaId).includes(term) ||
      c.receptor?.razonSocial?.toLowerCase().includes(term) ||
      c.receptor?.numeroDocumento?.toLowerCase().includes(term)
    );
  });

  const sortedComprobantes = [...filteredComprobantes].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
    const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
    return db - da;
  });

  const totalPages = Math.ceil(sortedComprobantes.length / itemsPerPage);
  const paginatedComprobantes = sortedComprobantes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emitirForm.ventaId || emitirForm.ventaId <= 0) {
      toast.error('Ingresa un ID de venta válido');
      return;
    }

    if (emitirForm.tipo === 'FACTURA') {
      if (!emitirForm.receptor?.numeroDocumento || !emitirForm.receptor?.razonSocial) {
        toast.error('Para FACTURA se requiere RUC y Razón Social');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: EmitirComprobanteRequest = {
        ventaId: emitirForm.ventaId,
        tipo: emitirForm.tipo,

        receptorDocTipo: emitirForm.receptor?.tipoDocumento ?? null,
        receptorDocNumero: emitirForm.receptor?.numeroDocumento?.trim() || null,
        receptorNombre: emitirForm.receptor?.razonSocial?.trim() || null,
        receptorDireccion: emitirForm.receptor?.direccion?.trim() || null,
      };

      const result = await facturacionService.emitirComprobante(payload);
      toast.success(`Comprobante emitido: ${result.numero ?? 'OK'}`);
      setIsEmitirOpen(false);
      setEmitirForm(emptyForm());
      fetchComprobantes();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para emitir comprobantes');
      } else if (err?.response?.status === 409) {
        toast.error(err?.response?.data?.mensaje ?? 'Esta venta ya tiene un comprobante asociado');
      } else {
        toast.error(err?.response?.data?.mensaje ?? 'Error al emitir comprobante');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnular = async () => {
    if (!confirmAnular.id) return;
    try {
      await facturacionService.anularComprobante(confirmAnular.id);
      toast.success('Comprobante anulado');
      fetchComprobantes();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para anular comprobantes');
      } else {
        toast.error(err?.response?.data?.mensaje ?? 'Error al anular comprobante');
      }
    } finally {
      setConfirmAnular({ isOpen: false, id: null });
    }
  };

  // const resetFilters = () => {
  //   setSearchTerm('');
  //   setFilterTipo('');
  //   setFilterEstado('');
  //   setFechaDesde('');
  //   setFechaHasta('');
  // };

  const ventasYaFacturadas = new Set(
    comprobantes.filter((c) => c.estado === 'EMITIDO').map((c) => c.ventaId)
  );

  const ventasOptions = ventas
    .filter((v) => !ventasYaFacturadas.has(v.id!))
    .map((v) => ({
      id: v.id!,
      label: `Venta #${v.id} · S/.${v.total.toFixed(2)}`,
      subtitle: `${v.vendedorNombre ?? ''} · ${v.metodoPago}${v.createdAt ? ' · ' + new Date(v.createdAt).toLocaleDateString('es-PE') : ''}`,
    }));

  if (!canView) {
    return (
      <EmptyState
        icon={FileText}
        title="Acceso restringido"
        description="No tienes permisos para ver el módulo de Facturación."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground">Gestión de comprobantes electrónicos</p>
        </div>
        {canEmitir && (
          <Button
            onClick={() => {
              setEmitirForm(emptyForm());
              setIsEmitirOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Emitir comprobante
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Comprobantes</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{comprobantes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emitidos</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {comprobantes.filter((c) => c.estado === 'EMITIDO').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Válidos y enviados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anulados</p>
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <XCircle className="text-red-600 dark:text-red-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {comprobantes.filter((c) => c.estado === 'ANULADO').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anulados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Facturado</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              S/.{comprobantes.filter((c) => c.estado === 'EMITIDO').reduce((s, c) => s + (c.total ?? 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">De comprobantes emitidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros (layout igual a Ventas: Buscar + fechas arriba, tabs abajo) */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Row 1: Buscar + Desde/Hasta + Limpiar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              {/* Search */}
              <div className="lg:col-span-7">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar número, venta, receptor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Desde */}
              <div className="lg:col-span-2">
                <label className="text-xs text-muted-foreground font-medium">Desde</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Hasta */}
              <div className="lg:col-span-2">
                <label className="text-xs text-muted-foreground font-medium">Hasta</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Limpiar */}
              <div className="lg:col-span-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFechaDesde('');
                    setFechaHasta('');
                    setFilterTipo('');
                    setFilterEstado('');
                  }}
                  className="w-full"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Row 2: Tipo (debajo) */}
            <div className="w-full rounded-lg border border-input bg-muted p-1">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filtrar por tipo">
                {(
                  [
                    { key: '', label: 'Todos' },
                    { key: 'BOLETA', label: '🧾 Boleta' },
                    { key: 'FACTURA', label: '🏢 Factura' },
                  ] as Array<{ key: '' | TipoComprobante; label: string }>
                ).map((t) => {
                  const active = filterTipo === t.key;
                  return (
                    <button
                      key={t.key || 'ALL'}
                      type="button"
                      onClick={() => setFilterTipo(t.key)}
                      className={[
                        'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition',
                        'min-w-[140px] sm:min-w-0 flex-1',
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Estado (debajo) */}
            <div className="w-full rounded-lg border border-input bg-muted p-1">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filtrar por estado">
                {(
                  [
                    { key: '', label: 'Todos' },
                    { key: 'EMITIDO', label: '✅ Emitido' },
                    { key: 'ANULADO', label: '⛔ Anulado' },
                  ] as Array<{ key: '' | 'EMITIDO' | 'ANULADO'; label: string }>
                ).map((t) => {
                  const active = filterEstado === t.key;
                  return (
                    <button
                      key={t.key || 'ALL'}
                      type="button"
                      onClick={() => setFilterEstado(t.key)}
                      className={[
                        'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition',
                        'min-w-[140px] sm:min-w-0 flex-1',
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {/* Icono con color (igual idea que en Ventas) */}
                      {t.key === 'EMITIDO' && <span className="mr-2 text-green-600"></span>}
                      {t.key === 'ANULADO' && <span className="mr-2 text-red-600"></span>}
                      {t.key === '' && <span className="mr-2 text-muted-foreground"></span>}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes</CardTitle>
          <CardDescription>
            {sortedComprobantes.length} comprobante{sortedComprobantes.length !== 1 ? 's' : ''} encontrado
            {sortedComprobantes.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : sortedComprobantes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin comprobantes"
              description="No se encontraron comprobantes con los filtros aplicados."
            />
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Venta ID</TableHead>
                      <TableHead>Receptor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedComprobantes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-semibold">{c.numero ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={c.tipo === 'FACTURA' ? 'default' : 'secondary'}>{c.tipo}</Badge>
                        </TableCell>
                        <TableCell>#{c.ventaId}</TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {c.receptor?.razonSocial || c.receptor?.numeroDocumento || '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {c.total != null ? `S/.${c.total.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={estadoBadgeVariant(c.estado)}>
                            {estadoIcon(c.estado)}
                            {c.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedComprobante(c);
                                setIsDetailOpen(true);
                              }}
                              title="Ver"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {canAnular && c.estado === 'EMITIDO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmAnular({ isOpen: true, id: c.id! })}
                              >
                                Anular
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedComprobantes.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Emitir Comprobante Dialog */}
      <Dialog
        isOpen={isEmitirOpen}
        onClose={() => {
          setIsEmitirOpen(false);
          setEmitirForm(emptyForm());
        }}
        title="Emitir Comprobante"
        description="Genera un comprobante electrónico para una venta"
        size="md"
      >
        <form onSubmit={handleEmitir} className="space-y-4">
          {/* Venta */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Venta <span className="text-destructive">*</span>
            </label>
            <Autocomplete
              options={ventasOptions}
              value={ventasOptions.find((o) => o.id === emitirForm.ventaId) ?? null}
              onChange={(opt) => setEmitirForm((prev) => ({ ...prev, ventaId: opt?.id ? Number(opt.id) : 0 }))}
              placeholder="Buscar venta por ID, vendedor..."
              emptyMessage="No se encontraron ventas"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Tipo de Comprobante <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              {TIPO_OPTIONS.map((tipo) => (
                <label
                  key={tipo}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md border-2 px-4 py-3 cursor-pointer transition-colors ${
                    emitirForm.tipo === tipo
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={emitirForm.tipo === tipo}
                    onChange={() =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        tipo,
                        receptor:
                          tipo === 'BOLETA'
                            ? { tipoDocumento: 'DNI', numeroDocumento: '', razonSocial: '', direccion: '' }
                            : { tipoDocumento: 'RUC', numeroDocumento: '', razonSocial: '', direccion: '' },
                      }))
                    }
                  />
                  {tipo}
                  {tipo === 'BOLETA' && (
                    <span className="text-xs text-muted-foreground font-normal">(B001)</span>
                  )}
                  {tipo === 'FACTURA' && (
                    <span className="text-xs text-muted-foreground font-normal">(F001)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Receptor */}
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium">
              Datos del receptor{' '}
              {emitirForm.tipo === 'FACTURA' && <span className="text-destructive">*</span>}
            </p>

            {emitirForm.tipo === 'FACTURA' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    RUC <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="20xxxxxxxxx (11 dígitos)"
                    maxLength={11}
                    value={emitirForm.receptor?.numeroDocumento ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, tipoDocumento: 'RUC', numeroDocumento: e.target.value },
                      }))
                    }
                    required={emitirForm.tipo === 'FACTURA'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    Razón Social <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Nombre de la empresa"
                    value={emitirForm.receptor?.razonSocial ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, razonSocial: e.target.value },
                      }))
                    }
                    required={emitirForm.tipo === 'FACTURA'}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    DNI <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    placeholder="DNI del cliente"
                    maxLength={8}
                    value={emitirForm.receptor?.numeroDocumento ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, tipoDocumento: 'DNI', numeroDocumento: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    Nombre <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={emitirForm.receptor?.razonSocial ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, razonSocial: e.target.value },
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Dirección <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Input
                placeholder="Dirección del receptor"
                value={emitirForm.receptor?.direccion ?? ''}
                onChange={(e) =>
                  setEmitirForm((prev) => ({
                    ...prev,
                    receptor: { ...prev.receptor, direccion: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEmitirOpen(false);
                setEmitirForm(emptyForm());
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Emitiendo...' : 'Emitir Comprobante'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Detail Dialog — vista tipo comprobante real */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedComprobante(null);
        }}
        title=""
        description=""
        size="lg"
      >
        {selectedComprobante && (
          <div className="space-y-0 text-sm" id="comprobante-print">

            {/* ── Cabecera del comprobante ── */}
            <div className="text-center border-b pb-4 mb-4 space-y-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Badge
                  variant={selectedComprobante.tipo === 'FACTURA' ? 'default' : 'secondary'}
                  className="text-base px-3 py-1"
                >
                  {selectedComprobante.tipo === 'BOLETA' ? '🧾 BOLETA DE VENTA' : '🏢 FACTURA ELECTRÓNICA'}
                </Badge>
                <Badge variant={estadoBadgeVariant(selectedComprobante.estado)} className="text-xs">
                  {estadoIcon(selectedComprobante.estado)}
                  {selectedComprobante.estado}
                </Badge>
              </div>
              <p className="text-xl font-bold tracking-wide">{selectedComprobante.numero ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                Fecha de emisión:{' '}
                {selectedComprobante.createdAt
                  ? new Date(selectedComprobante.createdAt).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>

            {/* ── Receptor ── */}
            <div className="border rounded-lg p-3 mb-4 space-y-1 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {selectedComprobante.tipo === 'FACTURA' ? 'Razón Social' : 'Cliente'}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedComprobante.receptorDocTipo ?? selectedComprobante.receptor?.tipoDocumento ?? 'DOC'}
                </span>
                <span className="font-medium">
                  {selectedComprobante.receptorDocNumero
                    ?? selectedComprobante.receptor?.numeroDocumento
                    ?? 'CLIENTES VARIOS'}
                </span>
              </div>
              {(selectedComprobante.receptorNombre ?? selectedComprobante.receptor?.razonSocial) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nombre / Razón Social</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {selectedComprobante.receptorNombre ?? selectedComprobante.receptor?.razonSocial}
                  </span>
                </div>
              )}
              {(selectedComprobante.receptorDireccion ?? selectedComprobante.receptor?.direccion) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dirección</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {selectedComprobante.receptorDireccion ?? selectedComprobante.receptor?.direccion}
                  </span>
                </div>
              )}
            </div>

            {/* ── Detalle de productos ── */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Detalle
              </p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-left">
                      <th className="px-3 py-2 font-semibold text-xs">Producto</th>
                      <th className="px-3 py-2 font-semibold text-xs text-center">Cant.</th>
                      <th className="px-3 py-2 font-semibold text-xs text-right">P. Unit.</th>
                      <th className="px-3 py-2 font-semibold text-xs text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComprobante.items && selectedComprobante.items.length > 0 ? (
                      selectedComprobante.items.map((item: ItemComprobanteDTO, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <p className="font-medium leading-tight">{item.productoNombre ?? `Producto #${item.productoId}`}</p>
                            {item.codigoBarras && (
                              <p className="text-xs text-muted-foreground">{item.codigoBarras}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right">S/.{Number(item.precioUnitario).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">S/.{Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">
                          Sin detalle de productos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Resumen financiero ── */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="flex justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">OP. GRAVADA</span>
                <span className="text-sm font-medium">
                  S/.{selectedComprobante.subtotal != null ? Number(selectedComprobante.subtotal).toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">IGV (18%)</span>
                <span className="text-sm font-medium">
                  S/.{selectedComprobante.igv != null ? Number(selectedComprobante.igv).toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-primary/10">
                <span className="font-bold text-base">IMPORTE TOTAL</span>
                <span className="text-xl font-bold text-primary">
                  S/.{selectedComprobante.total != null ? Number(selectedComprobante.total).toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {/* ── Footer info ── */}
            <div className="text-center text-xs text-muted-foreground space-y-1 border-t pt-3 mb-4">
              <p>Venta #{selectedComprobante.ventaId}</p>
              {selectedComprobante.sunatEstado && (
                <p>Estado SUNAT: <span className="font-medium">{selectedComprobante.sunatEstado}</span></p>
              )}
              {selectedComprobante.estado === 'ANULADO' && selectedComprobante.updatedAt && (
                <p className="text-destructive font-medium">
                  Anulado: {new Date(selectedComprobante.updatedAt).toLocaleString('es-PE')}
                </p>
              )}
            </div>

            {/* ── Acciones ── */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                Imprimir
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedComprobante(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Anular Confirm */}
      <ConfirmDialog
        isOpen={confirmAnular.isOpen}
        type="danger"
        title="Anular Comprobante"
        description="¿Estás seguro de que deseas anular este comprobante? Esta acción no se puede deshacer."
        confirmText="Anular Comprobante"
        onConfirm={handleAnular}
        onCancel={() => setConfirmAnular({ isOpen: false, id: null })}
      />
    </div>
  );
}
