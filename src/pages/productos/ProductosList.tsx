import { useEffect, useMemo, useState } from 'react';
import { productoService } from '../../services/producto.service';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { movimientoService } from '../../services/movimiento.service';
import type { ProductoDTO, UnidadMedidaDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, DollarSign, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

export function ProductosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasViewPermission = canView('PRODUCTOS');
  const { user } = useAuthStore();
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  const [formData, setFormData] = useState<ProductoDTO>({
    nombre: '',
    codigoBarras: '',
    categoria: '',
    stockActual: 0,
    stockMinimo: 10,
    stockMaximo: 500,
    costoUnitario: 0,
    precioVenta: 0,
    activo: true,
    tenantId: user?.tenantId ?? '',
    unidadMedidaId: 0,
  });


  useEffect(() => {
    if (hasViewPermission) {
      fetchData();
    } else if (canCreate('PRODUCTOS')) {
      fetchUnidades();
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchUnidades = async () => {
    try {
      setLoadingUnidades(true);
      const unidades = await unidadMedidaService.getAll();
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);
      if (!formData.unidadMedidaId && unidadesActivas.length > 0) {
        setFormData((prev) => ({ ...prev, unidadMedidaId: unidadesActivas[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar unidades de medida');
      if (import.meta.env.DEV) { console.error(error);}
    } finally {
      setLoadingUnidades(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const productosData = await productoService.getAll();
      setProductos(productosData);

      // Cargar unidades de medida (por tenant)
      setLoadingUnidades(true);
      const unidades = await unidadMedidaService.getAll();
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);

      // Default en el form si no hay seleccionado aún
      if (!formData.unidadMedidaId && unidadesActivas.length > 0) {
        setFormData((prev) => ({ ...prev, unidadMedidaId: unidadesActivas[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) { console.error(error);}
    } finally {
      setLoading(false);
      setLoadingUnidades(false);
    }
  };

  const unidadById = useMemo(() => {
    const m = new Map<number, UnidadMedidaDTO>();
    unidadesMedida.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidadesMedida]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (import.meta.env.DEV) { console.log('📤 Datos que se envían:', JSON.stringify(formData, null, 2));}

    try {
      if (editingId) {
        await productoService.update(editingId, formData);
        toast.success('Producto actualizado');
      } else {
        const nuevoProducto = await productoService.create(formData);
        // Crear movimiento de "Saldo inicial" al crear el producto
        if (nuevoProducto.id && formData.stockActual > 0) {
          try {
            await movimientoService.create({
              productoId: nuevoProducto.id,
              tipo: 'SALDO_INICIAL',
              cantidad: formData.stockActual,
              descripcion: 'Saldo inicial',
              usuarioId: user?.usuarioId ?? undefined,
              costoUnitario: formData.costoUnitario > 0 ? formData.costoUnitario : undefined,
            });
          } catch (movErr) {
            if (import.meta.env.DEV) { console.warn('⚠️ No se pudo crear el movimiento de saldo inicial:', movErr);}
          }
        }
        toast.success('Producto creado');
      }
      resetForm();
      await fetchData();
    } catch (error: any) {
      if (import.meta.env.DEV) { console.log('❌ Error completo:', error);}
      if (import.meta.env.DEV) { console.log('❌ Response data:', error.response?.data);}
      const message = error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar producto';
      toast.error(message);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Producto',
      description: '⚠️ Estás a punto de eliminar este producto de forma permanente. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await productoService.delete(id);
          toast.success('Producto eliminado');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar producto');
        }
      },
    });
  };

  const handleEdit = (producto: ProductoDTO) => {
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras || '',
      categoria: producto.categoria || '',
      stockActual: producto.stockActual || 0,
      stockMinimo: producto.stockMinimo || 10,
      stockMaximo: producto.stockMaximo || 500,
      costoUnitario: producto.costoUnitario,
      precioVenta: producto.precioVenta,
      activo: producto.activo,
      tenantId: producto.tenantId,
      unidadMedidaId: producto.unidadMedidaId || 0,
    });

    setEditingId(producto.id!);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigoBarras: '',
      categoria: '',
      stockActual: 0,
      stockMinimo: 10,
      stockMaximo: 500,
      costoUnitario: 0,
      precioVenta: 0,
      activo: true,
      tenantId: user?.tenantId ?? '',
      unidadMedidaId: unidadesMedida.length > 0 ? unidadesMedida[0].id : 0,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, endIndex);

  const productosConStockBajo = productos.filter(p => p.stockActual! <= p.stockMinimo!).length;
  const valorTotalInventario = productos.reduce((sum, p) => sum + (p.precioVenta * p.stockActual!), 0);
  const margenPromedio = productos.length > 0
    ? (productos.reduce((sum, p) => sum + ((p.precioVenta - p.costoUnitario) / p.costoUnitario * 100), 0) / productos.length).toFixed(1)
    : '0';

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona tu inventario de productos
          </p>
        </div>
        {canCreate('PRODUCTOS') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* When user cannot list products, show informational empty state */}
      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de productos. Puedes registrar nuevos productos con el botón de arriba."
        />
      ) : (
        <>
      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosConStockBajo}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/.{valorTotalInventario.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{margenPromedio}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código de barras o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {filteredProductos.length} producto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProductos.length === 0 ? (
            <EmptyState
              title="No hay productos"
              description="Comienza agregando tu primer producto al inventario"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProductos.map((producto) => {
                      const unidadLabel =
                        producto.unidadMedidaNombre ??
                        unidadById.get(producto.unidadMedidaId)?.nombre ??
                        '-';

                      return (
                        <TableRow key={producto.id}>
                          <TableCell>
                            <p className="font-medium">{producto.nombre}</p>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{producto.codigoBarras}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{producto.categoria}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{unidadLabel}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                producto.stockActual! <= producto.stockMinimo!
                                  ? 'destructive'
                                  : producto.stockActual! <= producto.stockMinimo! * 1.5
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {producto.stockActual}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">S/.{producto.precioVenta.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={producto.activo ? 'success' : 'secondary'}>
                              {producto.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canEdit('PRODUCTOS') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(producto)}
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}

                              {canDelete('PRODUCTOS') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(producto.id!)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}

                              {!canEdit('PRODUCTOS') && !canDelete('PRODUCTOS') && (
                                <span className="text-xs text-muted-foreground italic">
                                  Solo lectura
                                </span>
                              )}
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
                totalItems={filteredProductos.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
        description={
          editingId
            ? 'Actualiza la información del producto'
            : 'Agrega un nuevo producto al inventario'
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Nombre
                <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Nombre del producto"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Código de Barras
                <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="123456789"
                value={formData.codigoBarras}
                onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Categoría
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Seleccione una categoría</option>

                <optgroup label="Farmacia">
                  <option value="MEDICAMENTOS">Medicamentos</option>
                  <option value="CUIDADO_PERSONAL">Cuidado Personal</option>
                  <option value="HIGIENE">Higiene</option>
                </optgroup>

                <optgroup label="Bodega">
                  <option value="BEBIDAS">Bebidas</option>
                  <option value="SNACKS">Snacks</option>
                  <option value="ABARROTES">Abarrotes</option>
                </optgroup>

                <optgroup label="Ferretería">
                  <option value="HERRAMIENTAS">Herramientas</option>
                  <option value="ELECTRICIDAD">Electricidad</option>
                </optgroup>

                <option value="OTROS">Otros</option>
              </select>
            </div>

            {/* Unidad de medida */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Unidad de Medida
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unidadMedidaId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, unidadMedidaId: Number(e.target.value) })
                }
                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                required
                disabled={loadingUnidades}
              >
                <option value="" disabled>
                  {loadingUnidades ? 'Cargando unidades...' : 'Seleccione unidad de medida'}
                </option>
                {unidadesMedida.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Stock Mínimo
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Stock Máximo
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={formData.stockMaximo}
                onChange={(e) => setFormData({ ...formData, stockMaximo: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Último Costo Unitario
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costoUnitario}
                onChange={(e) => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Precio de Venta
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.precioVenta}
                onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) })}
                required
              />
              {formData.precioVenta > 0 && formData.costoUnitario > 0 && (
                <p className="text-xs text-green-600">
                  Margen: {(((formData.precioVenta - formData.costoUnitario) / formData.costoUnitario) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.nombre.length < 3}>
              {editingId ? 'Actualizar' : 'Crear'} Producto
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => {
          if (confirmDialog.action) {
            await confirmDialog.action();
          }
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}