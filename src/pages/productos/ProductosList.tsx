import { useEffect, useState } from 'react';
import { productoService } from '../../services/producto.service';
import type { ProductoDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProductosList() {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ProductoDTO>({
    nombre: '',
    codigoBarras: '',
    categoria: '',
    stockActual: 0,
    stockMinimo: 10,
    stockMaximo: 500,
    costoUnitario: 0,
    precioVenta: 0,
    tenantId: 'farmacia-001',
  });

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const data = await productoService.getAll();
      setProductos(data);
    } catch (error) {
      toast.error('Error al cargar productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await productoService.update(editingId, formData);
        toast.success('Producto actualizado');
      } else {
        await productoService.create(formData);
        toast.success('Producto creado');
      }
      resetForm();
      await fetchProductos();
    } catch (error) {
      toast.error('Error al guardar producto');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productoService.delete(id);
        toast.success('Producto eliminado');
        await fetchProductos();
      } catch (error) {
        toast.error('Error al eliminar producto');
      }
    }
  };

  const handleEdit = (producto: ProductoDTO) => {
    setFormData(producto);
    setEditingId(producto.id!);
    setShowForm(true);
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
      tenantId: 'farmacia-001',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigoBarras.includes(searchTerm)
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona tu inventario de productos
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
            <CardDescription>
              {editingId ? 'Actualiza la información del producto' : 'Agrega un nuevo producto al inventario'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Nombre del producto"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Código de Barras</label>
                <Input
                  placeholder="123456789"
                  value={formData.codigoBarras}
                  onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Input
                  placeholder="Medicamentos, Cuidado Personal, etc."
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Actual</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockActual}
                  onChange={(e) => setFormData({ ...formData, stockActual: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Mínimo</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Máximo</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockMaximo}
                  onChange={(e) => setFormData({ ...formData, stockMaximo: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Costo Unitario</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costoUnitario}
                  onChange={(e) => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Precio de Venta</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precioVenta}
                  onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Actualizar' : 'Crear'} Producto
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código de barras..."
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
              action={{
                label: 'Agregar Producto',
                onClick: () => setShowForm(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell>{producto.codigoBarras}</TableCell>
                    <TableCell>{producto.categoria}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          producto.stockActual <= producto.stockMinimo
                            ? 'destructive'
                            : producto.stockActual <= producto.stockMinimo * 1.5
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {producto.stockActual}
                      </Badge>
                    </TableCell>
                    <TableCell>${producto.precioVenta.toFixed(2)}</TableCell>
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
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(producto.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}