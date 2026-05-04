import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // usado para el banner de recepciones
import { ordenCompraService } from '../../services/ordenCompra.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoService } from '../../services/producto.service';
import type { OrdenCompraDTO, OrdenCompraItemDTO, ProveedorDTO, ProductoDTO } from '../../types';
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
  ShoppingBag,
  Search,
  ClipboardList,
  Lock,
  Send,
  XCircle,
  PackagePlus,
  Truck,
  FileText,
  Hash,
  Building2,
  Boxes,
  BadgeCheck,
  AlertTriangle,
  Clock,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  ENVIADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  RECIBIDA_PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  RECIBIDA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

type Option = { id: number | string; label: string; subtitle?: string };
type EstadoOCFilter = 'TODOS' | 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export function OrdenComprasList() {
  const navigate = useNavigate();
  const { canCreate, canView, canEdit } = usePermissions();

  // Ajusta si tu sistema usa otro módulo para permisos de compras:
  const hasViewPermission = canView('COMPRAS') || canView('COMPRAS') || canView('PROVEEDORES');
  const canCreateOC = canCreate('COMPRAS') || canCreate('COMPRAS');
  const canEditOC = canEdit('COMPRAS') || canEdit('COMPRAS');

  const [ordenes, setOrdenes] = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // List state
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoOCFilter>('TODOS');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // Detail modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedOcId, setSelectedOcId] = useState<number | null>(null);
  const [selectedOc, setSelectedOc] = useState<OrdenCompraDTO | null>(null);

  // Edit-in-detail state (solo BORRADOR)
  const [editObs, setEditObs] = useState(false);
  const [editObsValue, setEditObsValue] = useState('');
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemQty, setEditItemQty] = useState<number>(1);
  const [editItemPrice, setEditItemPrice] = useState<number | ''>('');
  const [addProdId, setAddProdId] = useState<number | null>(null);
  const [addQty, setAddQty] = useState<number>(1);
  const [addPrice, setAddPrice] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Create form (IDs)
  const [selectedProveedorId, setSelectedProveedorId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<OrdenCompraItemDTO[]>([]);
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>('');

  useEffect(() => {
    if (hasViewPermission) {
      fetchData();
    } else if (canCreateOC) {
      fetchFormData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [proveedoresData, productosData] = await Promise.all([
        proveedorService.getActivos(),
        productoService.getAll(),
      ]);
      setProveedores(proveedoresData);
      setProductos(productosData);
    } catch (e) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordenesData, proveedoresData, productosData] = await Promise.all([
        ordenCompraService.getAll(),
        proveedorService.getActivos(),
        productoService.getAll(),
      ]);
      setOrdenes(ordenesData);
      setProveedores(proveedoresData);
      setProductos(productosData);
    } catch (e) {
      toast.error('Error al cargar órdenes de compra');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  const selectedProveedor = useMemo(
    () => proveedores.find((p) => p.id === selectedProveedorId) ?? null,
    [proveedores, selectedProveedorId]
  );

  const selectedProducto = useMemo(
    () => productos.find((p) => p.id === selectedProductoId) ?? null,
    [productos, selectedProductoId]
  );

  const resetCreateForm = () => {
    setSelectedProveedorId(null);
    setObservaciones('');
    setItems([]);
    setSelectedProductoId(null);
    setItemQty(1);
    setItemPrice('');
    setIsCreateOpen(false);
  };

  function diasDesde(fecha?: string | null): number {
    if (!fecha) return 0;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  const stats = useMemo(
    () => ({
      total: ordenes.length,
      borrador: ordenes.filter((o) => o.estado === 'BORRADOR').length,
      enviada: ordenes.filter((o) => o.estado === 'ENVIADA').length,
      parcial: ordenes.filter((o) => o.estado === 'RECIBIDA_PARCIAL').length,
      recibida: ordenes.filter((o) => o.estado === 'RECIBIDA').length,
      cancelada: ordenes.filter((o) => o.estado === 'CANCELADA').length,
      retrasadas: ordenes.filter((o) => o.estado === 'ENVIADA' && diasDesde(o.createdAt) > 30).length,
    }),
    [ordenes]
  );

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ordenes.filter((o) => {
      const matchesSearch =
        (o.proveedorNombre ?? '').toLowerCase().includes(term) ||
        String(o.id ?? '').includes(term) ||
        (o.estado ?? '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (estadoFilter === 'TODOS') return true;
      return o.estado === estadoFilter;
    }).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
      const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
      return db - da;
    });
  }, [ordenes, searchTerm, estadoFilter]);

  const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrdenes = filteredOrdenes.slice(startIndex, startIndex + itemsPerPage);

  const handleAddCreateItem = () => {
    if (!selectedProducto) {
      toast.error('Selecciona un producto');
      return;
    }
    if (itemQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    const exists = items.find((i) => i.productoId === selectedProducto.id);
    if (exists) {
      toast.error('El producto ya fue agregado');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productoId: selectedProducto.id!,
        productoNombre: selectedProducto.nombre,
        codigoBarras: selectedProducto.codigoBarras,
        cantidadSolicitada: itemQty,
        precioUnitario: itemPrice !== '' ? Number(itemPrice) : undefined,
      },
    ]);

    setSelectedProductoId(null);
    setItemQty(1);
    setItemPrice('');
  };

  const handleRemoveCreateItem = (productoId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const handleCreateOC = async () => {
    if (!selectedProveedorId) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    try {
      setSavingCreate(true);
      await ordenCompraService.create({
        proveedorId: selectedProveedorId,
        estado: 'BORRADOR',
        observaciones,
        items,
      });
      toast.success('Orden de compra creada');
      resetCreateForm();
      await fetchData();
    } catch (e) {
      toast.error('Error al crear la orden de compra');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setSavingCreate(false);
    }
  };

  const openDetail = async (ocId: number) => {
    setSelectedOcId(ocId);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await ordenCompraService.getById(ocId);
      setSelectedOc(data);
    } catch (e) {
      toast.error('Error al cargar detalle de la OC');
      if (import.meta.env.DEV) console.error(e);
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedOcId(null);
    setSelectedOc(null);
    setEditObs(false);
    setEditItemId(null);
    setAddProdId(null);
  };

  // ── Edit handlers (solo BORRADOR) ────────────────────────────────────────

  const handleSaveObs = async () => {
    if (!selectedOc?.id) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.editarCabecera(selectedOc.id, editObsValue);
      setSelectedOc(updated);
      setEditObs(false);
      toast.success('Observaciones actualizadas');
    } catch { toast.error('Error al guardar observaciones'); }
    finally { setSavingEdit(false); }
  };

  const handleSaveItem = async (itemId: number) => {
    if (!selectedOc?.id) return;
    const item = selectedOc.items?.find((i) => i.id === itemId);
    if (!item) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.addItem(selectedOc.id, {
        productoId: item.productoId,
        cantidadSolicitada: editItemQty,
        precioUnitario: editItemPrice === '' ? undefined : editItemPrice,
      });
      setSelectedOc(updated);
      setEditItemId(null);
      toast.success('Ítem actualizado');
    } catch { toast.error('Error al actualizar ítem'); }
    finally { setSavingEdit(false); }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedOc?.id) return;
    try {
      setSavingEdit(true);
      await ordenCompraService.removeItem(selectedOc.id, itemId);
      const updated = await ordenCompraService.getById(selectedOc.id);
      setSelectedOc(updated);
      toast.success('Ítem eliminado');
    } catch { toast.error('Error al eliminar ítem'); }
    finally { setSavingEdit(false); }
  };

  const handleAddItem = async () => {
    if (!selectedOc?.id || !addProdId) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.addItem(selectedOc.id, {
        productoId: addProdId,
        cantidadSolicitada: addQty,
        precioUnitario: addPrice === '' ? undefined : addPrice,
      });
      setSelectedOc(updated);
      setAddProdId(null);
      setAddQty(1);
      setAddPrice('');
      toast.success('Producto agregado');
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al agregar producto');
    } finally { setSavingEdit(false); }
  };

  const handleEnviar = async () => {
    if (!selectedOc?.id) return;
    try {
      setDetailActionLoading(true);
      const updated = await ordenCompraService.enviar(selectedOc.id);
      setSelectedOc(updated);
      toast.success('Orden de compra enviada');
      await fetchData();
    } catch (e) {
      toast.error('Error al enviar OC');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!selectedOc?.id) return;
    try {
      setDetailActionLoading(true);
      const updated = await ordenCompraService.cancelar(selectedOc.id);
      setSelectedOc(updated);
      toast.success('Orden de compra cancelada');
      await fetchData();
    } catch (e) {
      toast.error('Error al cancelar OC');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };


  if (loading) return <LoadingSpinner />;

  if (!hasViewPermission) {
    return (
      <EmptyState
        icon={Lock}
        title="Sin acceso"
        description="No tienes permisos para ver el listado de órdenes de compra."
      />
    );
  }

  const pendienteTotal = (oc: OrdenCompraDTO) =>
    (oc.items ?? []).reduce((acc, it) => {
      const recibido = it.cantidadRecibida ?? 0;
      return acc + Math.max(0, it.cantidadSolicitada - recibido);
    }, 0);

  const subtotalOC = (oc: OrdenCompraDTO) =>
    (oc.items ?? []).reduce((acc, it) => acc + (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-muted-foreground">Crea, envía y recepciona compras a tus proveedores</p>
        </div>

        {canCreateOC && (
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva OC
          </Button>
        )}
      </div>

      {/* Alerta OCs retrasadas */}
      {stats.retrasadas > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              {stats.retrasadas} orden{stats.retrasadas > 1 ? 'es' : ''} enviada{stats.retrasadas > 1 ? 's' : ''} lleva{stats.retrasadas === 1 ? '' : 'n'} más de 30 días sin recepción. Considera contactar al proveedor.
            </p>
          </div>
        </div>
      )}

      {/* Stats (estilo proveedores/productos) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OC</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.borrador}</div>
            <p className="text-xs text-muted-foreground">Aún no enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enviada}</div>
            <p className="text-xs text-muted-foreground">Esperando recepción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
            <BadgeCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.recibida}</div>
            <p className="text-xs text-muted-foreground">Recibidas al 100%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <BadgeCheck className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.cancelada}</div>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros (mismo estilo de proveedores/productos) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, ID o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Estado filter (segmented control) */}
            <div className="sm:w-[520px]">
              <div
                className="inline-flex w-full items-center rounded-lg border border-input bg-muted p-1"
                role="tablist"
                aria-label="Filtrar OC por estado"
              >
                {(
                  [
                    { key: 'TODOS', label: 'Todos' },
                    { key: 'BORRADOR', label: 'Borrador' },
                    { key: 'ENVIADA', label: 'Enviada' },
                    { key: 'RECIBIDA_PARCIAL', label: 'Parcial' },
                    { key: 'RECIBIDA', label: 'Recibida' },
                    { key: 'CANCELADA', label: 'Cancelada' },
                  ] as Array<{ key: EstadoOCFilter; label: string }>
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
          <CardTitle>Listado</CardTitle>
          <CardDescription>Haz clic en “Ver detalle” para acciones (enviar/cancelar/recepcionar)</CardDescription>
        </CardHeader>

        <CardContent>
          {filteredOrdenes.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No hay órdenes de compra"
              description={searchTerm ? 'No se encontraron órdenes con ese criterio' : 'Crea la primera orden de compra'}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrdenes.map((oc) => {
                      const pendiente = pendienteTotal(oc);
                      const subtotal = subtotalOC(oc);
                      const dias = diasDesde(oc.createdAt);
                      const retrasada = oc.estado === 'ENVIADA' && dias > 30;

                      return (
                        <TableRow key={oc.id} className={retrasada ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <span>#{oc.id}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-start gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{oc.proveedorNombre || `Proveedor #${oc.proveedorId}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {oc.items?.length ?? 0} item(s)
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                ESTADO_BADGE[oc.estado] || ''
                              }`}
                            >
                              {oc.estado}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            {oc.createdAt ? (
                              <span className={`text-xs flex items-center justify-center gap-1 ${retrasada ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                {retrasada && <Clock className="h-3 w-3" />}
                                {dias}d
                              </span>
                            ) : '—'}
                          </TableCell>

                          <TableCell className="text-right">
                            <span className={pendiente > 0 ? 'font-semibold text-orange-600' : 'text-green-700 font-semibold'}>
                              {pendiente}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">u</span>
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {subtotal > 0 ? `S/. ${subtotal.toFixed(2)}` : '—'}
                          </TableCell>

                          <TableCell>
                            {oc.createdAt ? new Date(oc.createdAt).toLocaleDateString('es-PE') : '—'}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {(oc.estado === 'BORRADOR' || oc.estado === 'ENVIADA') && canEditOC && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Cancelar OC"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm(`¿Cancelar OC #${oc.id}? Esta acción no se puede deshacer.`)) return;
                                    try {
                                      await ordenCompraService.cancelar(oc.id!);
                                      toast.success(`OC #${oc.id} cancelada`);
                                      await fetchData();
                                    } catch {
                                      toast.error('Error al cancelar la OC');
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => openDetail(oc.id!)}>
                                Ver detalle
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredOrdenes.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={closeDetail}
        title={selectedOcId ? `Orden de Compra #${selectedOcId}` : 'Orden de Compra'}
        description="Detalle de la orden y acciones"
        size="xl"
      >
        {detailLoading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : !selectedOc ? (
          <EmptyState icon={ClipboardList} title="No se pudo cargar la OC" description="Intenta nuevamente." />
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedOc.proveedorNombre || `#${selectedOc.proveedorId}`}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ESTADO_BADGE[selectedOc.estado] || ''}`}>
                {selectedOc.estado}
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Pendiente total</p>
                <p className={`font-bold ${pendienteTotal(selectedOc) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {pendienteTotal(selectedOc)} unidades
                </p>
              </div>
            </div>

            {/* Observaciones — editable en BORRADOR */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText size={12} /> Observaciones
                </p>
                {selectedOc.estado === 'BORRADOR' && canEditOC && !editObs && (
                  <button
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                    onClick={() => { setEditObsValue(selectedOc.observaciones ?? ''); setEditObs(true); }}
                  >
                    <Pencil size={12} /> Editar
                  </button>
                )}
              </div>
              {editObs ? (
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    value={editObsValue}
                    onChange={(e) => setEditObsValue(e.target.value)}
                    placeholder="Observaciones..."
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveObs} disabled={savingEdit}><Check size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditObs(false)}><X size={14} /></Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedOc.observaciones || <span className="italic">Sin observaciones</span>}
                </p>
              )}
            </div>

            {/* Items table */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Productos</p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Solicitado</TableHead>
                      <TableHead className="text-center">Recibido</TableHead>
                      <TableHead className="text-center">Pendiente</TableHead>
                      <TableHead className="text-right">Precio unit.</TableHead>
                      {selectedOc.estado === 'BORRADOR' && canEditOC && (
                        <TableHead className="text-right">Acciones</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOc.items ?? []).map((it, idx) => {
                      const recibido = it.cantidadRecibida ?? 0;
                      const pendiente = Math.max(0, it.cantidadSolicitada - recibido);
                      const isEditing = editItemId === it.id;
                      return (
                        <TableRow key={it.id ?? idx}>
                          <TableCell className="font-medium">{it.productoNombre || `#${it.productoId}`}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{it.codigoBarras || '—'}</TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Input
                                type="number" min={1}
                                value={editItemQty}
                                onChange={(e) => setEditItemQty(Number(e.target.value))}
                                className="w-20 h-7 text-center text-sm mx-auto"
                              />
                            ) : it.cantidadSolicitada}
                          </TableCell>
                          <TableCell className="text-center text-green-600">{recibido}</TableCell>
                          <TableCell className="text-center">
                            <span className={pendiente > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                              {pendiente}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number" min={0} step={0.01}
                                value={editItemPrice}
                                onChange={(e) => setEditItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-24 h-7 text-right text-sm ml-auto"
                                placeholder="Precio"
                              />
                            ) : it.precioUnitario != null ? `S/. ${Number(it.precioUnitario).toFixed(2)}` : '—'}
                          </TableCell>
                          {selectedOc.estado === 'BORRADOR' && canEditOC && (
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" onClick={() => it.id && handleSaveItem(it.id)} disabled={savingEdit}>
                                    <Check size={13} />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditItemId(null)}>
                                    <X size={13} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => {
                                      setEditItemId(it.id ?? null);
                                      setEditItemQty(it.cantidadSolicitada);
                                      setEditItemPrice(it.precioUnitario ?? '');
                                    }}
                                    title="Editar"
                                  >
                                    <Pencil size={13} className="text-primary" />
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => it.id && handleRemoveItem(it.id)}
                                    disabled={savingEdit}
                                    title="Quitar"
                                  >
                                    <Trash2 size={13} className="text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Agregar producto — solo BORRADOR */}
            {selectedOc.estado === 'BORRADOR' && canEditOC && (
              <div className="rounded-lg border border-dashed p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  + Agregar producto
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <Autocomplete
                      options={productos
                        .filter((p) => !(selectedOc.items ?? []).some((i) => i.productoId === p.id))
                        .map((p) => ({
                          id: p.id!,
                          label: p.nombre,
                          subtitle: p.codigoBarras ?? undefined,
                        }))}
                      value={addProdId ? { id: addProdId, label: productos.find((p) => p.id === addProdId)?.nombre ?? '' } : null}
                      onChange={(opt) => setAddProdId(opt ? Number(opt.id) : null)}
                      placeholder="Buscar producto..."
                      emptyMessage="Sin resultados"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground">Cant.</label>
                    <Input
                      type="number" min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="h-8 text-center"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-muted-foreground">Precio unit.</label>
                    <Input
                      type="number" min={0} step={0.01}
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="S/. 0.00"
                      className="h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddItem}
                    disabled={!addProdId || addQty < 1 || savingEdit}
                  >
                    <Plus size={14} className="mr-1" /> Agregar
                  </Button>
                </div>
              </div>
            )}

            {/* Banner guía → Recepciones */}
            {(selectedOc.estado === 'ENVIADA' || selectedOc.estado === 'RECIBIDA_PARCIAL') && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <Truck size={16} className="shrink-0" />
                  <span>
                    {selectedOc.estado === 'RECIBIDA_PARCIAL'
                      ? 'Recepción parcial — quedan unidades pendientes.'
                      : 'OC enviada — registra la llegada de la mercadería en Recepciones.'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => { closeDetail(); navigate('/dashboard/recepciones'); }}
                >
                  <PackagePlus size={14} className="mr-1" />
                  Ir a Recepciones
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
              {(selectedOc.estado === 'BORRADOR' || selectedOc.estado === 'ENVIADA') && canEditOC && (
                <Button variant="outline" onClick={handleCancelar} disabled={detailActionLoading}>
                  <XCircle size={16} className="mr-2" />
                  Cancelar OC
                </Button>
              )}
              {selectedOc.estado === 'BORRADOR' && canEditOC && (
                <Button
                  onClick={handleEnviar}
                  disabled={detailActionLoading || (selectedOc.items ?? []).length === 0}
                >
                  <Send size={16} className="mr-2" />
                  Enviar OC
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Create modal (estilo coherente) */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={resetCreateForm}
        title="Nueva Orden de Compra"
        description="Crea una orden de compra (borrador) para tu proveedor"
        size="xl"
      >
        <div className="space-y-6">
          {/* Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Registrar orden de compra</p>
              <p className="text-xs text-muted-foreground">Agrega proveedor, observaciones e items.</p>
            </div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
              BORRADOR
            </span>
          </div>

          {/* Proveedor + observaciones */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Datos generales</p>
              <p className="text-xs text-muted-foreground">Proveedor y nota interna.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={proveedorOptions}
                  value={
                    selectedProveedor
                      ? {
                          id: selectedProveedor.id!,
                          label: selectedProveedor.nombre,
                          subtitle: selectedProveedor.ruc ? `RUC: ${selectedProveedor.ruc}` : undefined,
                        }
                      : null
                  }
                  onChange={(opt) => setSelectedProveedorId(opt ? Number(opt.id) : null)}
                  placeholder="Buscar proveedor..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observaciones</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones opcionales..."
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Productos</p>
                <p className="text-xs text-muted-foreground">Agrega items a la orden.</p>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                <span>{items.length} item(s)</span>
              </div>
            </div>

            {/* Add item row */}
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                <Autocomplete
                  options={productoOptions}
                  value={
                    selectedProducto
                      ? {
                          id: selectedProducto.id!,
                          label: `${selectedProducto.nombre}${selectedProducto.codigoBarras ? ` (${selectedProducto.codigoBarras})` : ''}`,
                        }
                      : null
                  }
                  onChange={(opt) => setSelectedProductoId(opt ? Number(opt.id) : null)}
                  placeholder="Buscar producto..."
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cant.</label>
                <Input
                  type="number"
                  min={1}
                  className="w-24 h-11"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Precio (opc.)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32 h-11"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <Button type="button" variant="outline" onClick={handleAddCreateItem} className="h-11">
                <Plus size={16} className="mr-2" />
                Agregar
              </Button>
            </div>

            {/* Items table */}
            {items.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => {
                      const sub = (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0);
                      return (
                        <TableRow key={it.productoId}>
                          <TableCell className="text-sm font-medium">{it.productoNombre}</TableCell>
                          <TableCell className="text-right">{it.cantidadSolicitada}</TableCell>
                          <TableCell className="text-right">
                            {it.precioUnitario != null ? `S/. ${it.precioUnitario.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {it.precioUnitario != null ? `S/. ${sub.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCreateItem(it.productoId)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Quitar
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Aún no agregas productos. Usa el buscador para añadir items.
                </p>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total estimado</p>
                <p className="text-lg font-bold">
                  S/.{' '}
                  {items
                    .reduce((acc, it) => acc + (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetCreateForm} className="h-11">
              Cancelar
            </Button>
            <Button onClick={handleCreateOC} disabled={savingCreate} className="h-11">
              {savingCreate ? 'Guardando...' : 'Guardar borrador'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}