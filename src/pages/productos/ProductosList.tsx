import { useEffect, useState } from 'react';
import { productoService } from '../../services/producto.service';
import { proveedorService } from '../../services/proveedor.service';
import type { ProductoDTO, ProveedorDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, DollarSign, Building2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProductosList() {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);

  // ✅ NUEVO - Estados de paginación
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
    fechaVencimiento: undefined,
    lote: '',
    proveedorId: undefined,
    activo: true,
    tenantId: 'farmacia-001',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ NUEVO - Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, proveedoresData] = await Promise.all([
        productoService.getAll(),
        proveedorService.getActivos(),
      ]);
      setProductos(productosData);
      setProveedores(proveedoresData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const proveedoresOptions = proveedores.map((p) => ({
    id: p.id!,
    label: p.nombre,
    subtitle: `RUC: ${p.ruc || 'N/A'} | Contacto: ${p.contacto || 'N/A'}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📤 Datos que se envían:', JSON.stringify(formData, null, 2));

    try {
      if (editingId) {
        await productoService.update(editingId, formData);
        toast.success('Producto actualizado');
      } else {
        await productoService.create(formData);
        toast.success('Producto creado');
      }
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.log('❌ Error completo:', error);
      console.log('❌ Response data:', error.response?.data);
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
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras || '',
      categoria: producto.categoria || '',
      stockActual: producto.stockActual || 0,
      stockMinimo: producto.stockMinimo || 10,
      stockMaximo: producto.stockMaximo || 500,
      costoUnitario: producto.costoUnitario,
      precioVenta: producto.precioVenta,
      fechaVencimiento: producto.fechaVencimiento,
      lote: producto.lote || '',
      proveedorId: producto.proveedorId,
      activo: producto.activo,
      tenantId: producto.tenantId,
    });

    if (producto.proveedorId) {
      const proveedor = proveedores.find((p) => p.id === producto.proveedorId);
      if (proveedor) {
        setSelectedProveedor({
          id: proveedor.id!,
          label: proveedor.nombre,
          subtitle: `RUC: ${proveedor.ruc || 'N/A'} | Contacto: ${proveedor.contacto || 'N/A'}`,
        });
      }
    }

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
      fechaVencimiento: undefined,
      lote: '',
      proveedorId: undefined,
      activo: true,
      tenantId: 'farmacia-001',
    });
    setSelectedProveedor(null);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  // ✅ ACTUALIZADO - Filtrar productos
  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ NUEVO - Calcular paginación
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
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

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
                      <TableHead>ID</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* ✅ CAMBIAR - Usar currentProductos en lugar de filteredProductos */}
                    {currentProductos.map((producto) => {
                      const proveedor = proveedores.find((p) => p.id === producto.proveedorId);
                      
                      return (
                        <TableRow key={producto.id}>
                          <TableCell className="font-medium">#{producto.id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{producto.nombre}</p>
                              {proveedor && (
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {proveedor.nombre}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{producto.codigoBarras}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{producto.categoria}</Badge>
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
                            <span className="text-sm text-muted-foreground">{producto.lote || '-'}</span>
                          </TableCell>
                          <TableCell>
                            {producto.fechaVencimiento ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {new Date(producto.fechaVencimiento).toLocaleDateString('es-PE')}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={producto.activo ? 'success' : 'secondary'}>
                              {producto.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(producto)}
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(producto.id!)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ NUEVO - Paginación */}
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
              <Input
                placeholder="Medicamentos, Cuidado Personal, etc."
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Autocomplete
                options={proveedoresOptions}
                value={selectedProveedor}
                onChange={(option) => {
                  if (option) {
                    setSelectedProveedor(option);
                    setFormData({ ...formData, proveedorId: option.id as number });
                  } else {
                    setSelectedProveedor(null);
                    setFormData({ ...formData, proveedorId: undefined });
                  }
                }}
                placeholder="Buscar proveedor..."
                emptyMessage="No se encontró el proveedor"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lote</label>
              <Input
                placeholder="Ej: L123456"
                value={formData.lote}
                onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Vencimiento</label>
              <Input
                type="date"
                value={formData.fechaVencimiento || ''}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Stock Actual
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={formData.stockActual}
                onChange={(e) => setFormData({ ...formData, stockActual: parseInt(e.target.value) })}
                required
              />
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
                Costo Unitario
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.costoUnitario}
                onChange={(e) => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value) })}
                required
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