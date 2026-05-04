import { useEffect, useMemo, useState } from 'react';
import { recepcionService } from '../../services/recepcion.service';
import { ordenCompraService } from '../../services/ordenCompra.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoService } from '../../services/producto.service';
import type {
  RecepcionDTO,
  RecepcionItemDTO,
  OrdenCompraDTO,
  ProveedorDTO,
  ProductoDTO,
  TipoComprobanteProveedor,
} from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus, Inbox, Search, CheckCircle, Clock, Lock,
  PackagePlus, Save, Trash2, FileText, Building2,
  BadgeCheck, XCircle, Truck, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

type Option = { id: number | string; label: string; subtitle?: string };
type EstadoRecepFilter = 'TODOS' | 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
type CreateMode = 'OC' | 'MANUAL';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR:   'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  ANULADA:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

function normalizeRecepcion(raw: any): RecepcionDTO {
  const detalles: any[] = Array.isArray(raw?.detalles)
    ? raw.detalles
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  const items: RecepcionItemDTO[] = detalles.map((d) => ({
    id: d.id,
    productoId: d.productoId,
    productoNombre: d.productoNombre,
    codigoBarras: d.codigoBarras,
    cantidadEsperada: d.cantidadEsperada,
    cantidadRecibida: d.cantidadRecibida,
    precioUnitario: d.precioUnitario,
    fechaVencimiento: d.fechaVencimiento,
    lote: d.lote,
  }));

  const hasComp = !!raw?.tipoComprobante && !!raw?.serie && !!raw?.numero;
  return {
    id: raw?.id,
    tenantId: raw?.tenantId,
    ordenCompraId: raw?.ocId ?? raw?.ordenCompraId,
    proveedorId: raw?.proveedorId,
    proveedorNombre: raw?.proveedorNombre,
    estado: raw?.estado,
    comprobante: hasComp
      ? { tipoComprobante: raw.tipoComprobante, serie: raw.serie, numero: raw.numero, urlAdjunto: raw.urlAdjunto ?? undefined }
      : undefined,
    observaciones: raw?.observaciones,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    items,
  } as any;
}

// ── Stepper visual ───────────────────────────────────────────────────────────
function Stepper({ items, comprobante }: { items: RecepcionItemDTO[]; comprobante: any }) {
  const hasItems = items.length > 0 && items.some((i) => (i.cantidadRecibida ?? 0) > 0);
  const hasComp = !!comprobante?.tipoComprobante;

  const steps = [
    { label: 'Productos', done: hasItems, icon: hasItems ? CheckCircle : AlertCircle },
    { label: 'Comprobante', done: hasComp, icon: hasComp ? CheckCircle : AlertCircle },
    { label: 'Confirmar', done: false, icon: BadgeCheck },
  ];

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={s.label} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              s.done ? 'text-green-600' : i === 2 ? 'text-muted-foreground' : 'text-amber-600'
            }`}>
              <Icon size={14} className="shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-px mx-1 ${s.done ? 'bg-green-400' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RecepcionList() {
  const { canCreate, canView, canEdit, puede } = usePermissions();

  const hasViewPermission = canView('RECEPCIONES') || canView('INVENTARIO');
  const canCreateRecep   = canCreate('RECEPCIONES') || puede('CREAR_RECEPCION');
  const canEditRecep     = canEdit('RECEPCIONES')   || puede('CREAR_RECEPCION');
  const canConfirmRecep  = puede('CONFIRMAR_RECEPCION') || canEditRecep;

  // Data
  const [recepciones, setRecepciones] = useState<RecepcionDTO[]>([]);
  const [ocs, setOcs]               = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos]   = useState<ProductoDTO[]>([]);
  const [loading, setLoading]       = useState(true);

  // List
  const [searchTerm, setSearchTerm]     = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoRecepFilter>('TODOS');
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 10;

  // Create modal
  const [isCreateOpen, setIsCreateOpen]     = useState(false);
  const [createLoading, setCreateLoading]   = useState(false);
  const [creating, setCreating]             = useState(false);
  const [createMode, setCreateMode]         = useState<CreateMode>('OC');
  const [createOcId, setCreateOcId]         = useState<number | null>(null);
  const [createProveedorId, setCreateProveedorId] = useState<number | null>(null);
  const [createObs, setCreateObs]           = useState('');

  // Detail modal
  const [isDetailOpen, setIsDetailOpen]           = useState(false);
  const [detailLoading, setDetailLoading]         = useState(false);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedRecepId, setSelectedRecepId]     = useState<number | null>(null);
  const [selectedRecep, setSelectedRecep]         = useState<RecepcionDTO | null>(null);

  // Add item
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [itemQty, setItemQty]       = useState<number>(1);
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemLote, setItemLote]     = useState('');

  // Comprobante
  const [compTipo, setCompTipo]   = useState<TipoComprobanteProveedor>('FACTURA');
  const [compSerie, setCompSerie] = useState('');
  const [compNumero, setCompNumero] = useState('');
  const [compUrl, setCompUrl]     = useState('');
  const [savingComp, setSavingComp] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning' as 'warning' | 'danger' | 'success' | 'info',
    title: '', description: '', confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  useEffect(() => {
    if (hasViewPermission) fetchData();
    else if (canCreateRecep) fetchFormData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, estadoFilter]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [ocData, provData, prodData] = await Promise.all([
        ordenCompraService.getAll().catch(() => []),
        proveedorService.getActivos().catch(() => []),
        productoService.getAll().catch(() => []),
      ]);
      setOcs(ocData); setProveedores(provData); setProductos(prodData);
    } finally { setLoading(false); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recDataRaw, ocData, provData, prodData] = await Promise.all([
        recepcionService.getAll(),
        ordenCompraService.getAll().catch(() => []),
        proveedorService.getActivos().catch(() => []),
        productoService.getAll().catch(() => []),
      ]);
      setRecepciones((recDataRaw as any[]).map(normalizeRecepcion));
      setOcs(ocData); setProveedores(provData); setProductos(prodData);
    } catch { toast.error('Error al cargar recepciones'); }
    finally { setLoading(false); }
  };

  // ── Memo ────────────────────────────────────────────────────────────────────
  const ocOptions: Option[] = useMemo(
    () => ocs
      .filter((oc) => oc.estado === 'ENVIADA' || oc.estado === 'RECIBIDA_PARCIAL')
      .map((oc) => ({
        id: oc.id!,
        label: `OC #${oc.id} — ${oc.proveedorNombre ?? `Proveedor #${oc.proveedorId}`}`,
        subtitle: `${oc.estado} · ${(oc.items ?? []).length} producto(s)`,
      })),
    [ocs]
  );

  const proveedorOptions: Option[] = useMemo(
    () => proveedores.map((p) => ({
      id: p.id!, label: p.nombre,
      subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined,
    })),
    [proveedores]
  );

  const productoOptions: Option[] = useMemo(
    () => productos.map((p) => ({
      id: p.id!,
      label: `${p.nombre}${p.codigoBarras ? ` (${p.codigoBarras})` : ''}`,
    })),
    [productos]
  );

  const selectedCreateOc = useMemo(
    () => createOcId ? ocs.find((o) => o.id === createOcId) ?? null : null,
    [createOcId, ocs]
  );

  const selectedProducto = useMemo(
    () => selectedProductoId ? productos.find((p) => p.id === selectedProductoId) ?? null : null,
    [selectedProductoId, productos]
  );

  const stats = useMemo(() => ({
    total:     recepciones.length,
    borrador:  recepciones.filter((r) => r.estado === 'BORRADOR').length,
    confirmada: recepciones.filter((r) => r.estado === 'CONFIRMADA').length,
    anulada:   recepciones.filter((r) => r.estado === 'ANULADA').length,
  }), [recepciones]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return recepciones
      .filter((r) => {
        const match =
          r.proveedorNombre?.toLowerCase().includes(term) ||
          String(r.id).includes(term) ||
          r.estado.toLowerCase().includes(term) ||
          (r.ordenCompraId && String(r.ordenCompraId).includes(term));
        if (!match) return false;
        if (estadoFilter === 'TODOS') return true;
        return r.estado === estadoFilter;
      })
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
        const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
        return db - da;
      });
  }, [recepciones, searchTerm, estadoFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentRecepciones = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Create ───────────────────────────────────────────────────────────────────
  const openCreate = async () => {
    setIsCreateOpen(true);
    setCreateMode('OC');
    setCreateOcId(null);
    setCreateProveedorId(null);
    setCreateObs('');
    if (ocs.length === 0 || proveedores.length === 0) {
      setCreateLoading(true);
      await fetchFormData().finally(() => setCreateLoading(false));
    }
  };

  const closeCreate = () => setIsCreateOpen(false);

  const handleCreate = async () => {
    const proveedorId = selectedCreateOc ? selectedCreateOc.proveedorId : createProveedorId;
    if (createMode === 'MANUAL' && !proveedorId) {
      toast.error('Selecciona un proveedor'); return;
    }
    if (createMode === 'OC' && !createOcId) {
      toast.error('Selecciona una OC'); return;
    }

    setCreating(true);
    try {
      const createdRaw = await recepcionService.create({
        ocId: createMode === 'OC' ? createOcId! : undefined,
        proveedorId: createMode === 'MANUAL' ? proveedorId! : undefined,
        observaciones: createObs || undefined,
      } as any);

      toast.success('Recepción creada — completa los datos a continuación');
      setIsCreateOpen(false);
      await fetchData();
      await openDetail((createdRaw as any).id!);
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al crear la recepción');
    } finally { setCreating(false); }
  };

  // ── Detail ───────────────────────────────────────────────────────────────────
  const openDetail = async (id: number) => {
    setSelectedRecepId(id);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const rec = normalizeRecepcion(await recepcionService.getById(id));
      setSelectedRecep(rec);
      const comp = rec.comprobante as any;
      if (comp) {
        setCompTipo(comp.tipoComprobante); setCompSerie(comp.serie);
        setCompNumero(comp.numero); setCompUrl(comp.urlAdjunto ?? '');
      } else {
        setCompTipo('FACTURA'); setCompSerie(''); setCompNumero(''); setCompUrl('');
      }
    } catch { toast.error('Error al cargar la recepción'); setIsDetailOpen(false); }
    finally { setDetailLoading(false); }
  };

  const refreshDetail = async () => {
    if (!selectedRecepId) return;
    const rec = normalizeRecepcion(await recepcionService.getById(selectedRecepId));
    setSelectedRecep(rec);
  };

  const closeDetail = () => {
    setIsDetailOpen(false); setSelectedRecepId(null); setSelectedRecep(null);
    setSelectedProductoId(null); setItemQty(1); setItemExpiry(''); setItemLote('');
  };

  const isEditable = selectedRecep?.estado === 'BORRADOR';

  const handleAddItem = async () => {
    if (!selectedRecep?.id || !selectedProducto) { toast.error('Selecciona un producto'); return; }
    if (itemQty <= 0) { toast.error('La cantidad debe ser mayor a 0'); return; }
    setDetailActionLoading(true);
    try {
      await recepcionService.upsertItem(selectedRecep.id, {
        productoId: selectedProducto.id!,
        cantidadRecibida: itemQty,
        fechaVencimiento: itemExpiry || undefined,
        lote: itemLote || undefined,
      });
      await refreshDetail();
      setSelectedProductoId(null); setItemQty(1); setItemExpiry(''); setItemLote('');
      toast.success('Producto guardado');
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al guardar producto');
    } finally { setDetailActionLoading(false); }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedRecep?.id || !isEditable) return;
    setConfirmDialog({
      isOpen: true, type: 'warning',
      title: 'Quitar producto',
      description: '¿Estás seguro de quitar este producto de la recepción?',
      confirmText: 'Quitar',
      action: async () => {
        setDetailActionLoading(true);
        try {
          await recepcionService.removeItem(selectedRecep.id!, itemId);
          await refreshDetail();
          toast.success('Producto quitado');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error'); }
        finally { setDetailActionLoading(false); }
      },
    });
  };

  const handleSaveComprobante = async () => {
    if (!selectedRecep?.id || !isEditable) return;
    if (!compSerie.trim() || !compNumero.trim()) { toast.error('Completa serie y número'); return; }
    setSavingComp(true);
    try {
      await recepcionService.setComprobante(selectedRecep.id, {
        tipoComprobante: compTipo, serie: compSerie.trim(),
        numero: compNumero.trim(), urlAdjunto: compUrl.trim() || undefined,
      } as any);
      await refreshDetail();
      toast.success('Comprobante registrado');
    } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al guardar comprobante'); }
    finally { setSavingComp(false); }
  };

  const handleConfirmar = async () => {
    if (!selectedRecep?.id || !isEditable) return;
    if (!canConfirmRecep) { toast.error('Sin permiso para confirmar'); return; }
    const comp = selectedRecep.comprobante as any;
    if (!comp?.tipoComprobante || !comp?.serie || !comp?.numero) {
      toast.error('Registra el comprobante antes de confirmar'); return;
    }
    if ((selectedRecep.items ?? []).length === 0) {
      toast.error('Agrega al menos un producto'); return;
    }
    setDetailActionLoading(true);
    try {
      const updated = normalizeRecepcion(await recepcionService.confirmar(selectedRecep.id));
      setSelectedRecep(updated);
      toast.success('✅ Recepción confirmada — stock actualizado');
      await fetchData();
    } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al confirmar'); }
    finally { setDetailActionLoading(false); }
  };

  const handleAnular = () => {
    if (!selectedRecep?.id) return;
    setConfirmDialog({
      isOpen: true, type: 'danger',
      title: 'Anular recepción',
      description: 'La recepción quedará ANULADA. El inventario no se verá afectado.',
      confirmText: 'Anular',
      action: async () => {
        setDetailActionLoading(true);
        try {
          await recepcionService.anular(selectedRecep!.id!);
          toast.success('Recepción anulada');
          closeDetail(); await fetchData();
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al anular'); }
        finally { setDetailActionLoading(false); }
      },
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!hasViewPermission)
    return <EmptyState icon={Lock} title="Sin acceso" description="No tienes permisos para ver recepciones" />;

  const itemsToShow = selectedRecep?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones</h1>
          <p className="text-muted-foreground">Registra y confirma la llegada de mercadería</p>
        </div>
        {canCreateRecep && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nueva recepción
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: Inbox, color: '' },
          { label: 'Borrador', value: stats.borrador, icon: Clock, color: 'text-gray-600' },
          { label: 'Confirmadas', value: stats.confirmada, icon: BadgeCheck, color: 'text-green-600' },
          { label: 'Anuladas', value: stats.anulada, icon: Trash2, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 text-muted-foreground ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, ID, OC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="sm:w-[420px]">
              <div className="inline-flex w-full items-center rounded-lg border border-input bg-muted p-1">
                {(['TODOS', 'BORRADOR', 'CONFIRMADA', 'ANULADA'] as EstadoRecepFilter[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEstadoFilter(k)}
                    className={`flex-1 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition ${
                      estadoFilter === k
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {k === 'TODOS' ? 'Todos' : k.charAt(0) + k.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de recepciones</CardTitle>
          <CardDescription>{filtered.length} recepción(es) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin recepciones"
              description={searchTerm ? 'Sin resultados para ese criterio' : 'Crea la primera recepción'}
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>OC vinculada</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRecepciones.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-semibold">#{rec.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{rec.proveedorNombre || `#${rec.proveedorId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rec.ordenCompraId
                            ? <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium"><Truck size={12} />OC #{rec.ordenCompraId}</span>
                            : <span className="text-xs text-muted-foreground">Manual</span>}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {(rec.items ?? []).length} item(s)
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[rec.estado] || ''}`}>
                            {rec.estado}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {rec.comprobante
                            ? <span className="text-green-600 font-medium">✓ {(rec.comprobante as any).tipoComprobante} {(rec.comprobante as any).serie}-{(rec.comprobante as any).numero}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('es-PE') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openDetail(rec.id!)}>
                            Ver / Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                onPageChange={setCurrentPage} totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create modal ──────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isCreateOpen} onClose={closeCreate}
        title="Nueva recepción" description="¿La mercadería viene de una OC o es una entrada manual?"
        size="lg"
      >
        {createLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-5">
            {/* Tabs modo */}
            <div className="flex rounded-lg border border-input bg-muted p-1 gap-1">
              {([
                { key: 'OC', label: '📦 Desde Orden de Compra' },
                { key: 'MANUAL', label: '🏪 Entrada manual' },
              ] as { key: CreateMode; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setCreateMode(t.key); setCreateOcId(null); setCreateProveedorId(null); }}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    createMode === t.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modo OC */}
            {createMode === 'OC' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Orden de Compra <span className="text-destructive">*</span>
                  </label>
                  <Autocomplete
                    options={ocOptions}
                    value={selectedCreateOc ? { id: selectedCreateOc.id!, label: `OC #${selectedCreateOc.id} — ${selectedCreateOc.proveedorNombre}` } : null}
                    onChange={(opt) => setCreateOcId(opt ? Number(opt.id) : null)}
                    placeholder="Buscar OC por número o proveedor..."
                    emptyMessage={ocOptions.length === 0 ? 'No hay OCs en estado ENVIADA o RECIBIDA_PARCIAL' : 'Sin resultados'}
                  />
                </div>

                {/* Preview productos de la OC */}
                {selectedCreateOc && (selectedCreateOc.items ?? []).length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Productos de la OC (pre-cargados automáticamente)
                    </p>
                    <div className="divide-y">
                      {(selectedCreateOc.items ?? []).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="font-medium">{it.productoNombre}</span>
                          <span className="text-muted-foreground text-xs">
                            {it.cantidadSolicitada} un. solicitadas
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600">
                      💡 Los productos se cargarán automáticamente. Podrás ajustar cantidades recibidas en el siguiente paso.
                    </p>
                  </div>
                )}

                {ocOptions.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle size={16} className="shrink-0" />
                    No hay órdenes de compra enviadas pendientes de recepción.
                  </div>
                )}
              </div>
            )}

            {/* Modo Manual */}
            {createMode === 'MANUAL' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Proveedor <span className="text-destructive">*</span>
                </label>
                <Autocomplete
                  options={proveedorOptions}
                  value={createProveedorId ? (() => { const p = proveedores.find((x) => x.id === createProveedorId); return p ? { id: p.id!, label: p.nombre } : null; })() : null}
                  onChange={(opt) => setCreateProveedorId(opt ? Number(opt.id) : null)}
                  placeholder="Buscar proveedor..."
                  emptyMessage="Sin proveedores activos"
                />
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Observaciones (opcional)</label>
              <Input
                value={createObs}
                onChange={(e) => setCreateObs(e.target.value)}
                placeholder="Ej: Llegó incompleto, verificar..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={closeCreate}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || (createMode === 'OC' ? !createOcId : !createProveedorId)}
              >
                <Plus size={16} className="mr-2" />
                {creating ? 'Creando...' : 'Crear recepción'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isDetailOpen} onClose={closeDetail}
        title={selectedRecepId ? `Recepción #${selectedRecepId}` : 'Recepción'}
        description=""
        size="xl"
      >
        {detailLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : !selectedRecep ? (
          <EmptyState icon={Inbox} title="No se pudo cargar" description="Intenta nuevamente." />
        ) : (
          <div className="space-y-5">

            {/* Header info */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedRecep.proveedorNombre || `#${selectedRecep.proveedorId}`}</p>
                {selectedRecep.ordenCompraId && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Truck size={12} /> Vinculada a OC #{selectedRecep.ordenCompraId}
                  </p>
                )}
                {selectedRecep.observaciones && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <FileText size={11} /> {selectedRecep.observaciones}
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ESTADO_BADGE[selectedRecep.estado] || ''}`}>
                {selectedRecep.estado}
              </span>
            </div>

            {/* Stepper — solo en BORRADOR */}
            {isEditable && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Progreso de la recepción</p>
                <Stepper items={itemsToShow} comprobante={selectedRecep.comprobante} />
              </div>
            )}

            {/* ── Sección 1: Productos ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <PackagePlus size={13} /> Productos recibidos
              </p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Esperado</TableHead>
                      <TableHead className="text-center">Recibido</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Lote</TableHead>
                      {isEditable && canEditRecep && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToShow.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                          Sin productos aún — agrega usando el formulario de abajo
                        </TableCell>
                      </TableRow>
                    ) : itemsToShow.map((it, idx) => (
                      <TableRow key={it.id ?? `${it.productoId}-${idx}`}>
                        <TableCell className="font-medium">{it.productoNombre || `#${it.productoId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.codigoBarras || '—'}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{it.cantidadEsperada ?? '—'}</TableCell>
                        <TableCell className="text-center font-semibold text-green-600">{it.cantidadRecibida}</TableCell>
                        <TableCell className="text-xs">{it.fechaVencimiento || '—'}</TableCell>
                        <TableCell className="text-xs">{it.lote || '—'}</TableCell>
                        {isEditable && canEditRecep && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => it.id && handleRemoveItem(it.id)}
                              disabled={detailActionLoading || !it.id}
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Agregar producto — solo BORRADOR */}
            {isEditable && canEditRecep && (
              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  + Registrar cantidad recibida
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                    <Autocomplete
                      options={productoOptions}
                      value={selectedProducto ? { id: selectedProducto.id!, label: selectedProducto.nombre } : null}
                      onChange={(opt) => setSelectedProductoId(opt ? Number(opt.id) : null)}
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                    <Input type="number" min={1} value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))} className="h-9 text-center" />
                  </div>
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground mb-1 block">Vencimiento</label>
                    <Input type="date" value={itemExpiry}
                      onChange={(e) => setItemExpiry(e.target.value)} className="h-9" />
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-muted-foreground mb-1 block">Lote</label>
                    <Input value={itemLote} onChange={(e) => setItemLote(e.target.value)}
                      placeholder="Opc." className="h-9" />
                  </div>
                  <Button onClick={handleAddItem} disabled={detailActionLoading || !selectedProducto} className="h-9">
                    <PackagePlus size={14} className="mr-1" /> Guardar
                  </Button>
                </div>
              </div>
            )}

            {/* ── Sección 2: Comprobante ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText size={13} /> Comprobante del proveedor
                </p>
                {selectedRecep.comprobante ? (
                  <span className="text-xs text-green-600 font-semibold">
                    ✓ {(selectedRecep.comprobante as any).tipoComprobante}{' '}
                    {(selectedRecep.comprobante as any).serie}-{(selectedRecep.comprobante as any).numero}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Pendiente
                  </span>
                )}
              </div>

              {selectedRecep.comprobante ? (
                <p className="text-sm text-muted-foreground">El comprobante ya fue registrado.</p>
              ) : isEditable ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                        value={compTipo}
                        onChange={(e) => setCompTipo(e.target.value as TipoComprobanteProveedor)}
                      >
                        <option value="FACTURA">FACTURA</option>
                        <option value="BOLETA">BOLETA</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Serie</label>
                      <Input value={compSerie} onChange={(e) => setCompSerie(e.target.value)}
                        placeholder="F001" className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Número</label>
                      <Input value={compNumero} onChange={(e) => setCompNumero(e.target.value)}
                        placeholder="00000001" className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">URL (opc.)</label>
                      <Input value={compUrl} onChange={(e) => setCompUrl(e.target.value)}
                        placeholder="https://..." className="h-9" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleSaveComprobante} disabled={savingComp}>
                      <Save size={14} className="mr-1" />
                      {savingComp ? 'Guardando...' : 'Guardar comprobante'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se registró comprobante.</p>
              )}
            </div>

            {/* ── Acciones finales ── */}
            {isEditable && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleAnular}
                  disabled={detailActionLoading}
                >
                  <XCircle size={16} className="mr-2" /> Anular recepción
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmar}
                  disabled={detailActionLoading || !canConfirmRecep}
                >
                  <CheckCircle size={16} className="mr-2" />
                  {detailActionLoading ? 'Procesando...' : 'Confirmar recepción'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => { if (confirmDialog.action) await confirmDialog.action(); }}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
