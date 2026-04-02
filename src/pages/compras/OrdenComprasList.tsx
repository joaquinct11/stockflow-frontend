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
import { Plus, ShoppingBag, Search, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  ENVIADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

const ITEMS_PER_PAGE = 10;

export function OrdenComprasList() {
  const navigate = useNavigate();
  const { canCreate, canAccess } = usePermissions();

  const [ordenes, setOrdenes] = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorDTO | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<OrdenCompraItemDTO[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<ProductoDTO | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordenesData, proveedoresData, productosData] = await Promise.all([
        ordenCompraService.getAll(),
        proveedorService.getActivos(),
        productoService.getAll(),
      ]);
      setOrdenes(ordenesData);
      setProveedores(proveedoresData);
      setProductos(productosData);
    } catch {
      toast.error('Error al cargar órdenes de compra');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return ordenes.filter(
      (o) =>
        o.proveedorNombre?.toLowerCase().includes(term) ||
        String(o.id).includes(term) ||
        o.estado.toLowerCase().includes(term)
    );
  }, [ordenes, searchTerm]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: ordenes.length,
    borrador: ordenes.filter((o) => o.estado === 'BORRADOR').length,
    enviada: ordenes.filter((o) => o.estado === 'ENVIADA').length,
    completada: ordenes.filter((o) => o.estado === 'COMPLETADA').length,
  }), [ordenes]);

  const resetForm = () => {
    setSelectedProveedor(null);
    setObservaciones('');
    setItems([]);
    setSelectedProducto(null);
    setItemQty(1);
    setItemPrice('');
  };

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
    setSelectedProducto(null);
    setItemQty(1);
    setItemPrice('');
  };

  const handleRemoveItem = (productoId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const handleSave = async () => {
    if (!selectedProveedor) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    setSaving(true);
    try {
      await ordenCompraService.create({
        proveedorId: selectedProveedor.id!,
        estado: 'BORRADOR',
        observaciones,
        items,
      });
      toast.success('Orden de compra creada exitosamente');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('Error al crear la orden de compra');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!canAccess('COMPRAS')) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Sin acceso"
        description="No tienes permisos para ver las órdenes de compra"
      />
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>
                Gestiona las órdenes de compra a proveedores
              </CardDescription>
            </div>
            {canCreate('COMPRAS') && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus size={16} className="mr-2" />
                Nueva OC
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, ID o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No hay órdenes de compra"
              description={
                searchTerm
                  ? 'No se encontraron órdenes con ese criterio'
                  : 'Crea la primera orden de compra'
              }
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
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
                    {paginated.map((oc) => (
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
                          {oc.createdAt
                            ? new Date(oc.createdAt).toLocaleDateString('es-PE')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/compras/ordenes/${oc.id}`)}
                          >
                            Ver detalle
                          </Button>
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
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          resetForm();
        }}
        title="Nueva Orden de Compra"
        size="lg"
      >
        <div className="space-y-4">
          {/* Proveedor */}
          <div>
            <label className="text-sm font-medium mb-1 block">Proveedor *</label>
            <Autocomplete
              options={proveedores.map((p) => ({ label: p.nombre, value: p }))}
              value={selectedProveedor ? { label: selectedProveedor.nombre, value: selectedProveedor } : null}
              onChange={(opt) => setSelectedProveedor(opt?.value ?? null)}
              placeholder="Buscar proveedor..."
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-sm font-medium mb-1 block">Observaciones</label>
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones opcionales..."
            />
          </div>

          {/* Add Item */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">Agregar producto</p>
            <div className="flex gap-2 flex-wrap">
              {/* Placeholder scan button */}
              <div className="flex-1 min-w-[200px]">
                <Autocomplete
                  options={productos.map((p) => ({
                    label: `${p.nombre}${p.codigoBarras ? ` (${p.codigoBarras})` : ''}`,
                    value: p,
                  }))}
                  value={
                    selectedProducto
                      ? {
                          label: `${selectedProducto.nombre}${selectedProducto.codigoBarras ? ` (${selectedProducto.codigoBarras})` : ''}`,
                          value: selectedProducto,
                        }
                      : null
                  }
                  onChange={(opt) => setSelectedProducto(opt?.value ?? null)}
                  placeholder="Buscar por nombre o código..."
                />
              </div>
              <Input
                type="number"
                min={1}
                className="w-24"
                placeholder="Cant."
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-28"
                placeholder="Precio (opc.)"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <Button type="button" variant="outline" onClick={handleAddItem}>
                <Plus size={16} />
              </Button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio unit.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.productoId}>
                      <TableCell className="text-sm">{item.productoNombre}</TableCell>
                      <TableCell>{item.cantidadSolicitada}</TableCell>
                      <TableCell>
                        {item.precioUnitario != null
                          ? `S/. ${item.precioUnitario.toFixed(2)}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemoveItem(item.productoId)}
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
