import { useEffect, useState } from 'react';
import { movimientoService } from '../../services/movimiento.service';
import { productoService } from '../../services/producto.service';
import type { MovimientoInventarioDTO, ProductoDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete'; // ← NUEVO
import { Plus, Trash2, Package, Search, TrendingUp, TrendingDown, RotateCcw, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export function InventarioList() {
  const { userId } = useCurrentUser();
  const [movimientos, setMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ NUEVO - Estado para producto seleccionado en el autocomplete
  const [selectedProducto, setSelectedProducto] = useState<any>(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  const [formData, setFormData] = useState<MovimientoInventarioDTO>({
    productoId: 0,
    tipo: 'ENTRADA',
    cantidad: 0,
    descripcion: '',
    referencia: '',
    usuarioId: 0,
    tenantId: 'farmacia-001',
  });

  useEffect(() => {
    if (userId) {
      console.log('🔄 Actualizando userId en formData:', userId);
      setFormData((prev) => ({
        ...prev,
        usuarioId: userId,
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movimientosData, productosData] = await Promise.all([
        movimientoService.getAll(),
        productoService.getAll(),
      ]);
      setMovimientos(movimientosData);
      setProductos(productosData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO - Convertir productos a opciones de autocomplete
  const productosOptions = productos.map((p) => ({
    id: p.id!,
    label: p.nombre,
    subtitle: `Código: ${p.codigoBarras} | Stock: ${p.stockActual} | Categoría: ${p.categoria}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (formData.productoId === 0) {
      toast.error('Debes seleccionar un producto');
      return;
    }
  
    if (!formData.usuarioId) {
      toast.error('Usuario requerido');
      return;
    }
  
    if (formData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
  
    if (!formData.descripcion) {
      toast.error('La descripción es requerida');
      return;
    }
  
    try {
      console.log('📤 Enviando movimiento:', formData);
      await movimientoService.create(formData);
      toast.success(`Movimiento de ${formData.tipo} registrado`);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data);
      const message = error.response?.data?.mensaje || error.message || 'Error al registrar movimiento';
      toast.error(message);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Movimiento',
      description: '⚠️ Estás a punto de eliminar este movimiento. Esta acción afectará el stock del producto.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await movimientoService.delete(id);
          toast.success('Movimiento eliminado');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar movimiento');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      productoId: 0,
      tipo: 'ENTRADA',
      cantidad: 0,
      descripcion: '',
      referencia: '',
      usuarioId: userId || 0,
      tenantId: 'farmacia-001',
    });
    setSelectedProducto(null); // ✅ NUEVO - Limpiar producto seleccionado
    setIsDialogOpen(false);
  };

  const filteredMovimientos = movimientos.filter(m => {
    const producto = productos.find(p => p.id === m.productoId);
    return (
      producto?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'SALIDA':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'AJUSTE':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case 'DEVOLUCION':
        return <ArrowLeftRight className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getMovimientoBadge = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <Badge variant="success">Entrada</Badge>;
      case 'SALIDA':
        return <Badge variant="destructive">Salida</Badge>;
      case 'AJUSTE':
        return <Badge variant="outline">Ajuste</Badge>;
      case 'DEVOLUCION':
        return <Badge variant="warning">Devolución</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const totalEntradas = movimientos
    .filter(m => m.tipo === 'ENTRADA')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidas = movimientos
    .filter(m => m.tipo === 'SALIDA')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalAjustes = movimientos
    .filter(m => m.tipo === 'AJUSTE')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalDevoluciones = movimientos
    .filter(m => m.tipo === 'DEVOLUCION')
    .reduce((sum, m) => sum + m.cantidad, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona los movimientos de inventario
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movimientos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalEntradas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalSalidas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAjustes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalDevoluciones}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto, tipo o descripción..."
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
          <CardTitle>Movimientos de Inventario</CardTitle>
          <CardDescription>
            {filteredMovimientos.length} movimiento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMovimientos.length === 0 ? (
            <EmptyState
              title="No hay movimientos"
              description="Comienza registrando tu primer movimiento de inventario"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((movimiento) => {
                    const producto = productos.find(p => p.id === movimiento.productoId);
                    return (
                      <TableRow key={movimiento.id}>
                        <TableCell className="font-medium">#{movimiento.id}</TableCell>
                        <TableCell>{producto?.nombre || `Producto #${movimiento.productoId}`}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovimientoIcon(movimiento.tipo)}
                            {getMovimientoBadge(movimiento.tipo)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{movimiento.cantidad}</TableCell>
                        <TableCell className="text-muted-foreground">{movimiento.descripcion}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{movimiento.referencia || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(movimiento.id!)}
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear movimiento */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title="Nuevo Movimiento de Inventario"
        description="Registra un movimiento de entrada, salida, ajuste o devolución"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ✅ NUEVO - Autocomplete de Producto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Producto
                <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={productosOptions}
                value={selectedProducto}
                onChange={(option) => {
                  if (option) {
                    const producto = productos.find((p) => p.id === option.id);
                    if (producto) {
                      setSelectedProducto(option);
                      setFormData({ ...formData, productoId: producto.id! });
                    }
                  } else {
                    setSelectedProducto(null);
                    setFormData({ ...formData, productoId: 0 });
                  }
                }}
                placeholder="Buscar producto por nombre..."
                emptyMessage="No se encontró el producto"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tipo de Movimiento
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="ENTRADA">Entrada (Compra)</option>
                <option value="SALIDA">Salida (Venta)</option>
                <option value="AJUSTE">Ajuste (Inventario)</option>
                <option value="DEVOLUCION">Devolución (Cliente)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cantidad
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Referencia</label>
              <Input
                type="text"
                placeholder="Número de compra, venta, etc."
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Descripción
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Motivo o detalles del movimiento"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.cantidad <= 0 || formData.productoId === 0}>
              Registrar Movimiento
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