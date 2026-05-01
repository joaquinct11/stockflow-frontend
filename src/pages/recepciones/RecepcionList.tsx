import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus,
  Inbox,
  Search,
  CheckCircle,
  Clock,
  Lock,
  PackagePlus,
  Save,
  Trash2,
  FileText,
  Building2,
  Hash,
  BadgeCheck,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

type Option = { id: number | string; label: string; subtitle?: string };

type EstadoRecepFilter = 'TODOS' | 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  ANULADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

/**
 * ✅ Normaliza la respuesta del backend a un shape que la UI pueda usar siempre.
 * Backend puede mandar items en:
 * - detalles (lo correcto según DTO del repo)
 * - items (si alguien lo cambió)
 *
 * Backend manda comprobante como campos sueltos:
 * - tipoComprobante/serie/numero/urlAdjunto
 */
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
      ? {
          tipoComprobante: raw.tipoComprobante,
          serie: raw.serie,
          numero: raw.numero,
          urlAdjunto: raw.urlAdjunto ?? undefined,
        }
      : undefined,
    observaciones: raw?.observaciones,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    items,
  } as any;
}

export function RecepcionList() {
  const navigate = useNavigate();
  const { canCreate, canView, canEdit, puede } = usePermissions();

  const hasViewPermission = canView('RECEPCIONES') || canView('INVENTARIO');
  const canCreateRecep = canCreate('RECEPCIONES') || puede('CREAR_RECEPCION');
  const canEditRecep = canEdit('RECEPCIONES') || puede('CREAR_RECEPCION');
  const canConfirmRecep = puede('CONFIRMAR_RECEPCION') || canEditRecep;

  // Data
  const [recepciones, setRecepciones] = useState<RecepcionDTO[]>([]);
  const [ocs, setOcs] = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // List state
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoRecepFilter>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOcId, setCreateOcId] = useState<number | null>(null);
  const [createProveedorId, setCreateProveedorId] = useState<number | null>(null);
  const [createObs, setCreateObs] = useState('');

  // Detail modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedRecepId, setSelectedRecepId] = useState<number | null>(null);
  const [selectedRecep, setSelectedRecep] = useState<RecepcionDTO | null>(null);

  // Add/Update item fields
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemExpiry, setItemExpiry] = useState(''); // YYYY-MM-DD
  const [itemLote, setItemLote] = useState('');

  // Comprobante form
  const [compTipo, setCompTipo] = useState<TipoComprobanteProveedor>('FACTURA');
  const [compSerie, setCompSerie] = useState('');
  const [compNumero, setCompNumero] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [savingComp, setSavingComp] = useState(false);

  useEffect(() => {
    if (hasViewPermission) fetchData();
    else if (canCreateRecep) fetchFormData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [ocData, provData, prodData] = await Promise.all([
        ordenCompraService.getAll().catch(() => []),
        proveedorService.getActivos().catch(() => []),
        productoService.getAll().catch(() => []),
      ]);
      setOcs(ocData);
      setProveedores(provData);
      setProductos(prodData);
    } finally {
      setLoading(false);
    }
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

      const normalized = (recDataRaw as any[]).map(normalizeRecepcion);

      setRecepciones(normalized);
      setOcs(ocData);
      setProveedores(provData);
      setProductos(prodData);
    } catch (e) {
      toast.error('Error al cargar recepciones');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ocOptions: Option[] = useMemo(
    () =>
      ocs
        .filter((oc) => oc.estado === 'ENVIADA' || oc.estado === 'RECIBIDA_PARCIAL')
        .map((oc) => ({
          id: oc.id!,
          label: `OC #${oc.id} — ${oc.proveedorNombre ?? `Proveedor #${oc.proveedorId}`}`,
          subtitle: `Estado: ${oc.estado}`,
        })),
    [ocs]
  );

  const proveedorOptions: Option[] = useMemo(
    () =>
      proveedores.map((p) => ({
        id: p.id!,
        label: p.nombre,
        subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined,
      })),
    [proveedores]
  );

  const productoOptions: Option[] = useMemo(
    () =>
      productos.map((p) => ({
        id: p.id!,
        label: `${p.nombre}${p.codigoBarras ? ` (${p.codigoBarras})` : ''}`,
      })),
    [productos]
  );

  const selectedOc = useMemo(
    () => (createOcId ? ocs.find((o) => o.id === createOcId) ?? null : null),
    [createOcId, ocs]
  );

  const selectedProducto = useMemo(
    () => (selectedProductoId ? productos.find((p) => p.id === selectedProductoId) ?? null : null),
    [selectedProductoId, productos]
  );

  const stats = useMemo(
    () => ({
      total: recepciones.length,
      borrador: recepciones.filter((r) => r.estado === 'BORRADOR').length,
      confirmada: recepciones.filter((r) => r.estado === 'CONFIRMADA').length,
      anulada: recepciones.filter((r) => r.estado === 'ANULADA').length,
    }),
    [recepciones]
  );

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return recepciones.filter((r) => {
      const matchesSearch =
        r.proveedorNombre?.toLowerCase().includes(term) ||
        String(r.id).includes(term) ||
        r.estado.toLowerCase().includes(term) ||
        (r.ordenCompraId && String(r.ordenCompraId).includes(term));

      if (!matchesSearch) return false;

      if (estadoFilter === 'TODOS') return true;
      return r.estado === estadoFilter;
    });
  }, [recepciones, searchTerm, estadoFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRecepciones = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Create
  const openCreate = async () => {
    setIsCreateOpen(true);
    setCreateOcId(null);
    setCreateProveedorId(null);
    setCreateObs('');

    setCreateLoading(true);
    try {
      if (ocs.length === 0 || proveedores.length === 0 || productos.length === 0) {
        await fetchFormData();
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const closeCreate = () => setIsCreateOpen(false);

  const handleCreate = async () => {
    const proveedorId = selectedOc ? selectedOc.proveedorId : createProveedorId;

    if (!proveedorId) {
      toast.error('Selecciona una OC o un proveedor');
      return;
    }

    setCreating(true);
    try {
      const createdRaw = await recepcionService.create({
        ocId: selectedOc?.id,
        proveedorId: selectedOc ? undefined : proveedorId,
        observaciones: createObs || undefined,
      } as any);

      toast.success('Recepción creada');
      setIsCreateOpen(false);
      await fetchData();
      await openDetail((createdRaw as any).id!);
    } catch (e) {
      toast.error('Error al crear la recepción');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setCreating(false);
    }
  };

  // Detail
  const openDetail = async (id: number) => {
    setSelectedRecepId(id);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const recRaw = await recepcionService.getById(id);
      const rec = normalizeRecepcion(recRaw);
      setSelectedRecep(rec);

      const comp = rec.comprobante as any;
      if (comp) {
        setCompTipo(comp.tipoComprobante);
        setCompSerie(comp.serie);
        setCompNumero(comp.numero);
        setCompUrl(comp.urlAdjunto ?? '');
      } else {
        setCompTipo('FACTURA');
        setCompSerie('');
        setCompNumero('');
        setCompUrl('');
      }
    } catch (e) {
      toast.error('Error al cargar la recepción');
      if (import.meta.env.DEV) console.error(e);
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedRecepId(null);
    setSelectedRecep(null);

    setSelectedProductoId(null);
    setItemQty(1);
    setItemExpiry('');
    setItemLote('');
  };

  const isEditable = selectedRecep?.estado === 'BORRADOR';

  const handleAddItem = async () => {
    if (!selectedRecep?.id) return;

    if (!selectedProducto) {
      toast.error('Selecciona un producto');
      return;
    }
    if (itemQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (!isEditable || !canEditRecep) {
      toast.error('No puedes editar esta recepción');
      return;
    }

    const payload: RecepcionItemDTO = {
      productoId: selectedProducto.id!,
      cantidadRecibida: itemQty,
      fechaVencimiento: itemExpiry || undefined,
      lote: itemLote || undefined,
    };

    setDetailActionLoading(true);
    try {
      await recepcionService.upsertItem(selectedRecep.id, payload);

      const refreshedRaw = await recepcionService.getById(selectedRecep.id);
      const refreshed = normalizeRecepcion(refreshedRaw);
      setSelectedRecep(refreshed);

      setSelectedProductoId(null);
      setItemQty(1);
      setItemExpiry('');
      setItemLote('');

      toast.success('Item guardado');
    } catch (e: any) {
      toast.error(
        e?.response?.data?.mensajes
          ? JSON.stringify(e.response.data.mensajes)
          : e?.response?.data?.mensaje ?? 'Error al guardar item'
      );
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleRemoveItem = async () => {
    toast.error('Eliminar items no está disponible todavía en el backend');
  };

  const handleSaveComprobante = async () => {
    if (!selectedRecep?.id) return;
    if (!isEditable) {
      toast.error('No puedes editar comprobante en una recepción confirmada');
      return;
    }

    if (selectedRecep.comprobante) {
      toast.error('Esta recepción ya tiene comprobante registrado');
      return;
    }

    if (!compSerie.trim() || !compNumero.trim()) {
      toast.error('Completa serie y número');
      return;
    }

    const compPayload = {
      tipoComprobante: compTipo,
      serie: compSerie.trim(),
      numero: compNumero.trim(),
      urlAdjunto: compUrl.trim() || undefined,
    } as any;

    setSavingComp(true);
    try {
      await recepcionService.setComprobante(selectedRecep.id, compPayload);

      const refreshedRaw = await recepcionService.getById(selectedRecep.id);
      const refreshed = normalizeRecepcion(refreshedRaw);
      setSelectedRecep(refreshed);

      toast.success('Comprobante guardado');
    } catch (e: any) {
      toast.error(
        e?.response?.data?.mensajes
          ? JSON.stringify(e.response.data.mensajes)
          : e?.response?.data?.mensaje ?? 'Error al guardar comprobante'
      );
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setSavingComp(false);
    }
  };

  const hasComprobanteForConfirm = (r: RecepcionDTO | null) => {
    const c: any = r?.comprobante;
    return !!(c?.tipoComprobante && c?.serie && c?.numero);
  };

  const handleConfirmar = async () => {
    if (!selectedRecep?.id) return;
    if (!isEditable) return;

    if (!canConfirmRecep) {
      toast.error('No tienes permiso para confirmar');
      return;
    }
    if (!hasComprobanteForConfirm(selectedRecep)) {
      toast.error('Registra el comprobante antes de confirmar');
      return;
    }
    if ((selectedRecep.items ?? []).length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    setDetailActionLoading(true);
    try {
      const updatedRaw = await recepcionService.confirmar(selectedRecep.id);
      const updated = normalizeRecepcion(updatedRaw);
      setSelectedRecep(updated);
      toast.success('Recepción confirmada — stock actualizado');
      await fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al confirmar la recepción');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!hasViewPermission) {
    return <EmptyState icon={Lock} title="Sin acceso" description="No tienes permisos para ver recepciones" />;
  }

  const itemsToShow = selectedRecep?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones</h1>
          <p className="text-muted-foreground">Registra y confirma recepciones de mercadería</p>
        </div>

        {canCreateRecep && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva recepción
          </Button>
        )}
      </div>

      {/* Stats (coherente con proveedores/productos/OC) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrador</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.borrador}</div>
            <p className="text-xs text-muted-foreground">Pendientes de confirmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <BadgeCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.confirmada}</div>
            <p className="text-xs text-muted-foreground">Stock actualizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anuladas</CardTitle>
            <Trash2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.anulada}</div>
            <p className="text-xs text-muted-foreground">No impactan inventario</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros (mismo estilo) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, ID, estado u OC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="sm:w-[420px]">
              <div
                className="inline-flex w-full items-center rounded-lg border border-input bg-muted p-1"
                role="tablist"
                aria-label="Filtrar recepciones por estado"
              >
                {(
                  [
                    { key: 'TODOS', label: 'Todos' },
                    { key: 'BORRADOR', label: 'Borrador' },
                    { key: 'CONFIRMADA', label: 'Confirmada' },
                    { key: 'ANULADA', label: 'Anulada' },
                  ] as Array<{ key: EstadoRecepFilter; label: string }>
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setEstadoFilter(t.key)}
                    className={`flex-1 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition
                      ${
                        estadoFilter === t.key
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    aria-pressed={estadoFilter === t.key}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main list */}
      <Card>
        <CardHeader>
          <CardTitle>Recepciones de mercadería</CardTitle>
          <CardDescription>Historial y gestión de recepciones</CardDescription>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No hay recepciones"
              description={searchTerm ? 'No se encontraron recepciones con ese criterio' : 'Crea la primera recepción'}
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>OC Ref.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRecepciones.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span>#{rec.id}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{rec.proveedorNombre || `#${rec.proveedorId}`}</p>
                              {rec.ordenCompraId ? (
                                <p className="text-xs text-muted-foreground">OC #{rec.ordenCompraId}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Sin OC</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{rec.ordenCompraId ? `OC #${rec.ordenCompraId}` : '—'}</TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              ESTADO_BADGE[rec.estado] || ''
                            }`}
                          >
                            {rec.estado}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm">
                          {rec.comprobante ? (
                            `${(rec.comprobante as any).tipoComprobante} ${(rec.comprobante as any).serie}-${(rec.comprobante as any).numero}`
                          ) : (
                            <span className="text-muted-foreground">Sin comprobante</span>
                          )}
                        </TableCell>

                        <TableCell>
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
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create modal (estilo coherente) */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Nueva recepción"
        description="Crea una recepción desde OC o seleccionando proveedor"
        size="xl"
      >
        {createLoading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Registrar recepción</p>
                <p className="text-xs text-muted-foreground">Puedes vincular una OC o elegir proveedor directo.</p>
              </div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                BORRADOR
              </span>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Origen</p>
                <p className="text-xs text-muted-foreground">OC opcional. Si eliges OC, proveedor se bloquea.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">Orden de compra (opcional)</label>
                  <Autocomplete
                    options={ocOptions}
                    value={
                      selectedOc
                        ? {
                            id: selectedOc.id!,
                            label: `OC #${selectedOc.id} — ${
                              selectedOc.proveedorNombre ?? `Proveedor #${selectedOc.proveedorId}`
                            }`,
                          }
                        : null
                    }
                    onChange={(opt) => {
                      const id = opt ? Number(opt.id) : null;
                      setCreateOcId(id);
                      if (id) setCreateProveedorId(null);
                    }}
                    placeholder="Selecciona una OC..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Proveedor {!selectedOc ? <span className="text-red-500">*</span> : <span className="text-muted-foreground">(desde OC)</span>}
                  </label>
                  <Autocomplete
                    options={proveedorOptions}
                    value={
                      !selectedOc && createProveedorId
                        ? (() => {
                            const p = proveedores.find((x) => x.id === createProveedorId);
                            return p
                              ? { id: p.id!, label: p.nombre, subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined }
                              : null;
                          })()
                        : null
                    }
                    onChange={(opt) => setCreateProveedorId(opt ? Number(opt.id) : null)}
                    placeholder={selectedOc ? 'Proveedor se toma de la OC' : 'Selecciona proveedor...'}
                    disabled={!!selectedOc}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Observaciones (opcional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={createObs}
                      onChange={(e) => setCreateObs(e.target.value)}
                      placeholder="Ej: Llegó incompleto..."
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
              <Button variant="outline" onClick={closeCreate} className="h-11">
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="h-11">
                <Plus size={16} className="mr-2" />
                {creating ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Detail modal (estilo coherente) */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={closeDetail}
        title={selectedRecepId ? `Recepción #${selectedRecepId}` : 'Recepción'}
        description="Gestiona items, comprobante y confirmación"
        size="xl"
      >
        {detailLoading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : !selectedRecep ? (
          <EmptyState icon={Inbox} title="No se pudo cargar" description="Intenta nuevamente." />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium">{selectedRecep.proveedorNombre || `#${selectedRecep.proveedorId}`}</p>
                {selectedRecep.ordenCompraId && (
                  <button
                    className="text-sm text-primary hover:underline mt-1"
                    onClick={() => navigate(`/dashboard/compras/ordenes`)}
                    type="button"
                  >
                    <Truck className="inline h-4 w-4 mr-1" />
                    OC #{selectedRecep.ordenCompraId}
                  </button>
                )}
              </div>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  ESTADO_BADGE[selectedRecep.estado] || ''
                }`}
              >
                {selectedRecep.estado}
              </span>
            </div>

            {/* Items */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToShow.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        No hay items aún
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemsToShow.map((it, idx) => (
                      <TableRow key={it.id ?? `${it.productoId}-${idx}`}>
                        <TableCell className="font-medium">{it.productoNombre || `#${it.productoId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.codigoBarras || '—'}</TableCell>
                        <TableCell className="text-right">{it.cantidadEsperada ?? '—'}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{it.cantidadRecibida}</TableCell>
                        <TableCell className="text-xs">{it.fechaVencimiento || '—'}</TableCell>
                        <TableCell className="text-xs">{it.lote || '—'}</TableCell>
                        <TableCell className="text-right">
                          {isEditable && canEditRecep ? (
                            <Button variant="outline" size="sm" onClick={handleRemoveItem} disabled>
                              <Trash2 size={14} className="mr-2" />
                              Quitar
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Agregar/Actualizar producto */}
            {isEditable && canEditRecep && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Agregar / Actualizar producto</p>
                    <p className="text-xs text-muted-foreground">Registra cantidad, lote y vencimiento.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[240px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                    <Autocomplete
                      options={productoOptions}
                      value={
                        selectedProducto
                          ? {
                              id: selectedProducto.id!,
                              label: `${selectedProducto.nombre}${
                                selectedProducto.codigoBarras ? ` (${selectedProducto.codigoBarras})` : ''
                              }`,
                            }
                          : null
                      }
                      onChange={(opt) => setSelectedProductoId(opt ? Number(opt.id) : null)}
                      placeholder="Buscar producto..."
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                    <Input
                      type="number"
                      min={1}
                      className="w-28 h-11"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Vencimiento</label>
                    <Input
                      type="date"
                      className="w-44 h-11"
                      value={itemExpiry}
                      onChange={(e) => setItemExpiry(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Lote (opcional)</label>
                    <Input
                      className="w-36 h-11"
                      value={itemLote}
                      onChange={(e) => setItemLote(e.target.value)}
                      placeholder="Opc."
                    />
                  </div>

                  <Button onClick={handleAddItem} disabled={detailActionLoading} className="h-11">
                    <PackagePlus size={16} className="mr-2" />
                    Guardar item
                  </Button>
                </div>
              </div>
            )}

            {/* Comprobante */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Comprobante del proveedor</p>
                {selectedRecep.comprobante ? (
                  <span className="text-xs text-green-600 font-medium">
                    ✓ Registrado: {(selectedRecep.comprobante as any).tipoComprobante}{' '}
                    {(selectedRecep.comprobante as any).serie}-{(selectedRecep.comprobante as any).numero}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin comprobante</span>
                )}
              </div>

              {selectedRecep.comprobante ? (
                <div className="text-sm text-muted-foreground">El comprobante ya fue registrado. No se puede ingresar otro.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-11"
                        value={compTipo}
                        onChange={(e) => setCompTipo(e.target.value as TipoComprobanteProveedor)}
                        disabled={!isEditable}
                      >
                        <option value="FACTURA">FACTURA</option>
                        <option value="BOLETA">BOLETA</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Serie</label>
                      <Input
                        value={compSerie}
                        onChange={(e) => setCompSerie(e.target.value)}
                        disabled={!isEditable}
                        placeholder="F001"
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Número</label>
                      <Input
                        value={compNumero}
                        onChange={(e) => setCompNumero(e.target.value)}
                        disabled={!isEditable}
                        placeholder="00000001"
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">URL (opcional)</label>
                      <Input
                        value={compUrl}
                        onChange={(e) => setCompUrl(e.target.value)}
                        disabled={!isEditable}
                        placeholder="https://..."
                        className="h-11"
                      />
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={handleSaveComprobante} disabled={savingComp} className="h-11">
                        <Save size={16} className="mr-2" />
                        {savingComp ? 'Guardando...' : 'Guardar comprobante'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Confirm */}
            {isEditable && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
                <Button
                  className="h-11 bg-green-600 hover:bg-green-700 text-white"
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
    </div>
  );
}