import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle,
  Clock,
  Lock,
  Send,
  XCircle,
  PackagePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  ENVIADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

type Option = { id: number | string; label: string; subtitle?: string };

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
  }, [searchTerm]);

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
      console.error(e);
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
      console.error(e);
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

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ordenes.filter(
      (o) =>
        (o.proveedorNombre ?? '').toLowerCase().includes(term) ||
        String(o.id ?? '').includes(term) ||
        (o.estado ?? '').toLowerCase().includes(term)
    );
  }, [ordenes, searchTerm]);

  const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrdenes = filteredOrdenes.slice(startIndex, startIndex + itemsPerPage);

  const stats = useMemo(
    () => ({
      total: ordenes.length,
      borrador: ordenes.filter((o) => o.estado === 'BORRADOR').length,
      enviada: ordenes.filter((o) => o.estado === 'ENVIADA').length,
      completada: ordenes.filter((o) => o.estado === 'COMPLETADA').length,
    }),
    [ordenes]
  );

  const handleAddItem = () => {
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

  const handleRemoveItem = (productoId: number) => {
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
      console.error(e);
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
      console.error(e);
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedOcId(null);
    setSelectedOc(null);
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
      console.error(e);
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
      console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleRecepcionar = () => {
    if (!selectedOc?.id) return;
    // aquí usamos el flujo actual que tienes para recepción nueva con ocId
    navigate(`/dashboard/recepciones/nueva?ocId=${selectedOc.id}`);
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

  return (
    <div className="space-y-6">
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
          <EmptyState
            icon={ClipboardList}
            title="No se pudo cargar la OC"
            description="Intenta nuevamente."
          />
        ) : (
          <div className="space-y-4">
            {/* Info */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium">
                  {selectedOc.proveedorNombre || `#${selectedOc.proveedorId}`}
                </p>
              </div>

              <div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    ESTADO_BADGE[selectedOc.estado] || ''
                  }`}
                >
                  {selectedOc.estado}
                </span>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Pendiente total</p>
                <p
                  className={`font-bold ${
                    pendienteTotal(selectedOc) > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}
                >
                  {pendienteTotal(selectedOc)} unidades
                </p>
              </div>
            </div>

            {selectedOc.observaciones && (
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Observaciones</p>
                <p className="text-sm mt-1">{selectedOc.observaciones}</p>
              </div>
            )}

            {/* Items */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Solicitado</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedOc.items ?? []).map((it, idx) => {
                    const recibido = it.cantidadRecibida ?? 0;
                    const pendiente = Math.max(0, it.cantidadSolicitada - recibido);
                    return (
                      <TableRow key={it.id ?? idx}>
                        <TableCell className="font-medium">
                          {it.productoNombre || `#${it.productoId}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {it.codigoBarras || '—'}
                        </TableCell>
                        <TableCell className="text-right">{it.cantidadSolicitada}</TableCell>
                        <TableCell className="text-right text-green-600">{recibido}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              pendiente > 0 ? 'text-orange-600 font-medium' : 'text-green-600'
                            }
                          >
                            {pendiente}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {it.precioUnitario != null ? `S/. ${it.precioUnitario.toFixed(2)}` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
              {selectedOc.estado === 'BORRADOR' && canEditOC && (
                <Button onClick={handleEnviar} disabled={detailActionLoading || (selectedOc.items ?? []).length === 0}>
                  <Send size={16} className="mr-2" />
                  Enviar
                </Button>
              )}

              {(selectedOc.estado === 'BORRADOR' || selectedOc.estado === 'ENVIADA') && canEditOC && (
                <Button variant="outline" onClick={handleCancelar} disabled={detailActionLoading}>
                  <XCircle size={16} className="mr-2" />
                  Cancelar
                </Button>
              )}

              {(selectedOc.estado === 'ENVIADA' || selectedOc.estado === 'PARCIAL') && (
                <Button onClick={handleRecepcionar}>
                  <PackagePlus size={16} className="mr-2" />
                  Recepcionar
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Create modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={resetCreateForm}
        title="Nueva Orden de Compra"
        description="Crea una orden de compra (borrador) para tu proveedor"
        size="xl"
      >
        <div className="space-y-4">
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
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones opcionales..."
            />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Agregar producto</p>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[220px]">
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
                  className="w-24"
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
                  className="w-28"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <Button type="button" variant="outline" onClick={handleAddItem}>
                <Plus size={16} />
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.productoId}>
                      <TableCell className="text-sm">{it.productoNombre}</TableCell>
                      <TableCell className="text-right">{it.cantidadSolicitada}</TableCell>
                      <TableCell className="text-right">
                        {it.precioUnitario != null ? `S/. ${it.precioUnitario.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleRemoveItem(it.productoId)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Quitar
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetCreateForm}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOC} disabled={savingCreate}>
              {savingCreate ? 'Guardando...' : 'Guardar borrador'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total OC</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.borrador}</p>
                <p className="text-xs text-muted-foreground">Borradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.enviada}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completada}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>Gestiona las órdenes de compra a proveedores</CardDescription>
            </div>
            {canCreateOC && (
              <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
                <Plus size={16} className="mr-2" />
                Nueva OC
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, ID o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

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
                      <TableHead>Items</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrdenes.map((oc) => (
                      <TableRow key={oc.id}>
                        <TableCell className="font-medium">#{oc.id}</TableCell>
                        <TableCell>{oc.proveedorNombre || `Proveedor #${oc.proveedorId}`}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[oc.estado] || ''}`}>
                            {oc.estado}
                          </span>
                        </TableCell>
                        <TableCell>{oc.items?.length ?? 0} productos</TableCell>
                        <TableCell>
                          {oc.createdAt ? new Date(oc.createdAt).toLocaleDateString('es-PE') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openDetail(oc.id!)}>
                            Ver detalle
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
                totalItems={filteredOrdenes.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}